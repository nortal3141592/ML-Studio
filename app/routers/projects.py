from typing import Annotated
import pandas as pd

# utilities imports
from utils.file_utils import cleanup_delete, save_dataset, cleanup_delete_engineering
from utils.metadata_utils import extract_metadata
from utils.enum_utils import DatasetStage, ProjectStatus, DatasetSplit, Algorithm, TrainingStatus
from utils.preview_utils import load_preview_rows
from utils.cleaning_utils import clean_data
from utils.engineering_utils import engineer_data, save_preprocessor
from utils.background_task_utils import execute_training_job
from utils.invalidation_utils import invalidate_engineering_artifacts, invalidate_training_runs


from starlette.concurrency import run_in_threadpool

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status, Form, BackgroundTasks
from fastapi.responses import FileResponse
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
import models
from auth import CurrentUser, CurrentProject

# from schemas import ProjectPublic, MetadataResponse, PreviewRowsResponse, CleaningRequest, FeatureEngineeringRequest, FeatureEngineeringResponse
from schemas import *

from pathlib import Path
from shutil import rmtree
import zipfile
import json
import tempfile



router = APIRouter()

ACTIVE_TRAINING_STATUSES = (TrainingStatus.QUEUED.value, TrainingStatus.TRAINING.value, TrainingStatus.SAVING_MODEL.value)

# ==============================
# POST api/projects/upload
# ==============================
@router.post("/upload", response_model=ProjectPublic, status_code=status.HTTP_201_CREATED)
async def upload_project(name: Annotated[str, Form()] ,current_user: CurrentUser, file: Annotated[UploadFile, File()], db: Annotated[AsyncSession, Depends(get_db)]):
    if not str(file.filename).endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Only csv files are allowed')

    result = await db.execute(select(models.Project).where(func.lower(models.Project.project_name) == name.lower(), models.Project.user_id == current_user.id))

    existing_name = result.scalars().first()

    if existing_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project with the same name exists")
    
    try:
        df = await run_in_threadpool(pd.read_csv, file.file)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid CSV file")
    
    if df.empty:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dataset must contain at least one row.")
    
    new_project = models.Project(
        project_name = name,
        user_id = current_user.id,
        raw_dataset_path = "", # temp
        status = ProjectStatus.READY.value
    )

    try:
        db.add(new_project)
        await db.flush()

        filepath = await run_in_threadpool(save_dataset, df, new_project.id, "raw.parquet")

        new_project.raw_dataset_path = filepath
        metadata = await run_in_threadpool(extract_metadata, df)
        new_project.raw_metadata = metadata

        await db.commit()
        await db.refresh(new_project)

        return new_project
    except Exception:
        cleanup_delete(project_id=new_project.id, stage=DatasetStage.RAW)
        await db.rollback()
        raise

# ========================================
# GET api/projects/{id}/preview/{stage}
# ========================================
@router.get("/{project_id}/preview/{stage}", response_model=MetadataResponse)
async def get_project_metadata(current_project: CurrentProject, stage: DatasetStage):
    metadata_map = {
        DatasetStage.RAW: current_project.raw_metadata,
        DatasetStage.CLEANED: current_project.cleaned_metadata,
        DatasetStage.ENGINEERED: current_project.engineered_metadata
    }
    
    metadata = metadata_map[stage]
    
    if metadata is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="metadata not found")

    return metadata


# ============================================
# GET api/projects/{id}/preview-rows/{stage}
# ============================================
@router.get("/{project_id}/preview-rows/{stage}", response_model=PreviewRowsResponse)
async def get_rows(current_project: CurrentProject, stage: DatasetStage, split: DatasetSplit|None = None):    
    if stage == DatasetStage.ENGINEERED:
        path_map = {
            DatasetSplit.TRAIN: (current_project.x_train_path, current_project.y_train_path),
            DatasetSplit.CV: (current_project.x_cv_path, current_project.y_cv_path),
            DatasetSplit.TEST: (current_project.x_test_path, current_project.y_test_path)
        }

        if split is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The 'split' query parameter is required for the engineered stage. Valid values are: train, cv, test.")
            
        x_path, y_path = path_map[split]

        if x_path is None or y_path is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The dataset that you're requesting is not available yet")

        x_rows = await run_in_threadpool(load_preview_rows, x_path)
        y_rows = await run_in_threadpool(load_preview_rows, y_path)

        return {
            "x_rows": x_rows,
            "y_rows": y_rows
        }

    else:
        path_map = {
            DatasetStage.RAW: current_project.raw_dataset_path,
            DatasetStage.CLEANED: current_project.cleaned_dataset_path,
        }

        path = path_map[stage]

        if path is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"The {stage.value} dataset is not available yet")
        
        rows = await run_in_threadpool(load_preview_rows, path)

        return {"rows": rows}

# =======================================================
# POST api/projects/{project_id}/clean
# =======================================================

# TODO: write invalidate_downstream() function later

@router.post("/{project_id}/clean", response_model=MetadataResponse)
async def clean_dataset(current_project: CurrentProject, droppable_columns: CleaningRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    if not current_project.raw_dataset_path:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Upload the raw dataset first, only then you can begin cleaning it')

    result = await db.execute(
        select(models.TrainingRun)
        .where(models.TrainingRun.project_id == current_project.id, models.TrainingRun.status.in_(ACTIVE_TRAINING_STATUSES))
    )

    if result.scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot re-clean while a training run is in progress")
        
    df = await run_in_threadpool(pd.read_parquet, current_project.raw_dataset_path)

    for col in droppable_columns.droppable_columns:
        if col not in df.columns:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Column '{col}' does not exist in the uploaded dataset.")

    cleaned_df, cleaning_summary = await run_in_threadpool(clean_data, df, droppable_columns.droppable_columns)

    if cleaned_df.shape[0] == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bad Dataset! Cleaning removed all rows from the dataset")

    if cleaned_df.shape[1] == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bad Dataset! Cleaning removed all columns from the dataset.")

    if current_project.cleaned_dataset_path:
        await invalidate_training_runs(db, current_project.id)
        await invalidate_engineering_artifacts(current_project)

    try:
        filepath = await run_in_threadpool(save_dataset, cleaned_df, current_project.id, "cleaned.parquet")

        current_project.cleaned_dataset_path = filepath

        cleaned_metadata = await run_in_threadpool(extract_metadata, cleaned_df)
        cleaned_metadata.update({"cleaning_summary": cleaning_summary})

        current_project.cleaned_metadata = cleaned_metadata
        current_project.status = ProjectStatus.READY.value

        await db.commit()
        await db.refresh(current_project)

        return cleaned_metadata
    except Exception:
        await run_in_threadpool(cleanup_delete, current_project.id, DatasetStage.CLEANED)
        await db.rollback()
        raise

# ===========================================================================
# POST /api/projects/{project_id}/engineer
# ===========================================================================
@router.post("/{project_id}/engineer", response_model=FeatureEngineeringResponse)
async def feature_engineer_dataset(current_project: CurrentProject, engineering_request: FeatureEngineeringRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    if not current_project.cleaned_dataset_path:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dataset hasn't been cleaned yet! Cannot progress further without cleaning the dataset")

    result = await db.execute(
        select(models.TrainingRun)
        .where(models.TrainingRun.project_id == current_project.id, models.TrainingRun.status.in_(ACTIVE_TRAINING_STATUSES))
    )

    if result.scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot re-engineer while a training run is in progress")

    
    ratios: tuple[int, int , int] = (engineering_request.train_split, engineering_request.cv_split, engineering_request.test_split)

    if any(split <= 0 for split in ratios):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The split values must all be greater than zero.")

    if sum(ratios) != 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The ratios of your splits don't add upto a 100%, please provide valid split ratios")

    cleaned_df = await run_in_threadpool(pd.read_parquet, current_project.cleaned_dataset_path)

    if engineering_request.target_column not in cleaned_df.columns:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Target column '{engineering_request.target_column}' does not exist.")

    X_train_processed, X_cv_processed, X_test_processed,y_train,y_cv,y_test,preprocessor,metadata = await run_in_threadpool(engineer_data, cleaned_df=cleaned_df, target_column=engineering_request.target_column, split_ratios=ratios)

    saved_paths: list[str] = []

    if current_project.x_train_path and current_project.x_cv_path and current_project.x_test_path and current_project.y_train_path and current_project.y_cv_path and current_project.y_test_path:
        await invalidate_training_runs(db, current_project.id)
    
    try:

        x_train_path = await run_in_threadpool(save_dataset, X_train_processed, current_project.id, "x_train.parquet")
        saved_paths.append(x_train_path)
        
        x_cv_path = await run_in_threadpool(save_dataset, X_cv_processed, current_project.id, "x_cv.parquet")
        saved_paths.append(x_cv_path)
        
        x_test_path = await run_in_threadpool(save_dataset, X_test_processed, current_project.id, "x_test.parquet")
        saved_paths.append(x_test_path)

        y_train_path =  await run_in_threadpool(save_dataset, y_train, current_project.id, "y_train.parquet")
        saved_paths.append(y_train_path)
        
        y_cv_path = await run_in_threadpool(save_dataset, y_cv, current_project.id, "y_cv.parquet")
        saved_paths.append(y_cv_path)
        
        y_test_path = await run_in_threadpool(save_dataset, y_test, current_project.id, "y_test.parquet")
        saved_paths.append(y_test_path)

        preprocessor_path = await run_in_threadpool(save_preprocessor, preprocessor, current_project.id)
        saved_paths.append(preprocessor_path)

        current_project.x_train_path = x_train_path
        current_project.x_cv_path = x_cv_path
        current_project.x_test_path = x_test_path

        current_project.y_train_path = y_train_path
        current_project.y_cv_path = y_cv_path
        current_project.y_test_path = y_test_path

        current_project.preprocessor_path = preprocessor_path

        current_project.engineered_metadata = metadata

        current_project.status = ProjectStatus.READY.value

        current_project.target_column = metadata["target_column"]
        current_project.task_type = metadata["task_type"]
        current_project.num_classes = metadata["num_classes"]

        await db.commit()
        await db.refresh(current_project)

        return metadata
    except Exception:
        await run_in_threadpool(cleanup_delete_engineering, saved_paths)
        await db.rollback()
        raise

# ===========================================================================
# POST /api/projects/{project_id}/train
# ===========================================================================

# NOTE:
# Two simultaneous requests could theoretically create two queued runs.
# Acceptable for V1.


@router.post("/{project_id}/train", response_model=TrainingResponse, status_code=status.HTTP_202_ACCEPTED)
async def train_model(current_project: CurrentProject, request:TrainingRequest, background_tasks: BackgroundTasks, db: Annotated[AsyncSession, Depends(get_db)]):
    if not all([
        current_project.x_train_path, current_project.x_cv_path, current_project.x_test_path,
        current_project.y_train_path, current_project.y_cv_path, current_project.y_test_path,
        current_project.preprocessor_path, current_project.engineered_metadata, 
        current_project.target_column, current_project.task_type
    ]) or current_project.num_classes is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The data hasn't been engineered yet")
    
    expected_schema = ALGORITHM_TO_HYPERPARAMETER_SCHEMA[request.algorithm]
    if not isinstance(request.hyperparameters, expected_schema):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The schema doesn't match the algorithm")

    allowed_tasks = ALGORITHM_TASK_TYPE_MAP.get(request.algorithm, set())

    project_task = TaskType(current_project.task_type) if isinstance(current_project.task_type, str) else current_project.task_type

    if project_task not in allowed_tasks:
        allowed_names = ', '.join([t.value for t in allowed_tasks])
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Algorithm '{request.algorithm.value}' is not compatible with project task type,'{project_task.value}'. Supported task types: [{allowed_names}]") #pyright: ignore
    
    result = await db.execute(
        select(models.TrainingRun).where(
            models.TrainingRun.project_id == current_project.id, 
            models.TrainingRun.status.in_(ACTIVE_TRAINING_STATUSES)
        )
    )
    if result.scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A training run is already in progress for this project")
    
    new_training_run = models.TrainingRun(
        project_id = current_project.id,
        algorithm = request.algorithm.value,
        hyperparameters = request.hyperparameters.model_dump(),
        random_seed = request.random_seed,
        status = TrainingStatus.QUEUED.value,
        progress = 0,
        status_message = "Waiting for worker..."
    )

    try:
        db.add(new_training_run)
        await db.commit()
        await db.refresh(new_training_run)

        # 5. Dispatch the Worker
        background_tasks.add_task(execute_training_job, new_training_run.id)

        return TrainingResponse(
            message="Training job queued successfully.",
            run_id=new_training_run.id,
            status=new_training_run.status,
        )
        
    except Exception:
        await db.rollback()
        raise

@router.get("/{project_id}/runs/{run_id}", response_model=TrainingRunStatusResponse)
async def get_training_run_status(run_id: int, current_project: CurrentProject,  db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(models.TrainingRun).where(
            models.TrainingRun.id == run_id,
            models.TrainingRun.project_id == current_project.id
        )
    )
    
    training_run = result.scalars().first()

    if not training_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Training run not found for this project"
        )

    return training_run

@router.get("/{project_id}/download/preprocessor")
async def download_preprocessor(current_project: CurrentProject):
    if current_project.preprocessor_path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preprocessor not found, data needs to be engineered first")

    path = Path(current_project.preprocessor_path)

    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preprocessor file is missing on disk")

    filename = f"{current_project.project_name}_preprocessor.joblib"

    return FileResponse(path = path, filename = filename, media_type="application/octet-stream")

@router.get("/{project_id}/runs/{run_id}/download/model")
async def download_model(current_project: CurrentProject, run_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(models.TrainingRun).where(models.TrainingRun.id == run_id, models.TrainingRun.project_id == current_project.id))
    training_run = result.scalars().first()

    if not training_run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The training run that you requested cannot be found or does not exist")

    if training_run.model_path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model hasn't been trained yet")

    path = Path(training_run.model_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model file is missing on disk")

    # handles both .joblib and .keras
    extension = path.suffix 
    filename = f"{current_project.project_name}_{training_run.algorithm}_run{training_run.id}{extension}"

    return FileResponse(path=path, filename=filename, media_type="application/octet-stream")


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(current_project: CurrentProject, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(models.TrainingRun)
        .where(models.TrainingRun.project_id == current_project.id, models.TrainingRun.status.in_(ACTIVE_TRAINING_STATUSES))
    )

    active_run = result.scalars().first()

    if active_run:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="cannot delete a project while one or more training runs are in progress")

    await db.delete(current_project)
    await db.commit()

    project_dir = Path(f"uploads/project_{current_project.id}")

    if project_dir.exists():
        await run_in_threadpool(rmtree, project_dir)

@router.get("/{project_id}/runs/{run_id}/download/bundle")
async def download_run_bundle(current_project: CurrentProject, run_id: int, background_tasks: BackgroundTasks, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(models.TrainingRun).where(models.TrainingRun.id == run_id, models.TrainingRun.project_id == current_project.id))
    training_run = result.scalars().first()

    if not training_run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The training run that you requested cannot be found or does not exist")

    if training_run.model_path is None or current_project.preprocessor_path is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Model or preprocessor not available for this run")

    model_path = Path(training_run.model_path)
    preprocessor_path = Path(current_project.preprocessor_path)

    if not model_path.exists() or not preprocessor_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more required files are missing on disk")

    def build_zip() -> str:
        temp_dir = tempfile.mkdtemp()
        zip_path = Path(temp_dir) / f"run_{run_id}_bundle.zip"

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.write(model_path, arcname=model_path.name)
            zf.write(preprocessor_path, arcname=preprocessor_path.name)
            zf.writestr("metrics.json", json.dumps(training_run.metrics, indent=2))

        return str(zip_path)

    zip_path = await run_in_threadpool(build_zip)

    def cleanup_zip(path: str):
        parent_dir = Path(path).parent
        if parent_dir.exists():
            rmtree(parent_dir)

    background_tasks.add_task(cleanup_zip, zip_path)

    filename = f"{current_project.project_name}_{training_run.algorithm}_run{run_id}_bundle.zip"

    return FileResponse(path=zip_path, filename=filename, media_type="application/zip")


@router.delete("/{project_id}/runs/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_run(current_project: CurrentProject, run_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(models.TrainingRun).where(models.TrainingRun.id == run_id, models.TrainingRun.project_id == current_project.id))
    training_run = result.scalars().first()
    
    if not training_run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The training run that you requested cannot be found or does not exist")

    if training_run.status in ACTIVE_TRAINING_STATUSES:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot delete a training run that is currently in progress")

    await db.delete(training_run)
    await db.commit()

    run_dir = Path(f"uploads/project_{current_project.id}/runs/run_{training_run.id}")

    if run_dir.exists():
        await run_in_threadpool(rmtree, run_dir)


    