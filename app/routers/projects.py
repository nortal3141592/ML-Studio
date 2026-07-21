from typing import Annotated
import pandas as pd

from utils.file_utils import cleanup_delete, save_dataset
from utils.metadata_utils import extract_metadata
from utils.enum_utils import DatasetStage, ProjectStatus, DatasetSplit
from utils.preview_utils import load_preview_rows
from utils.cleaning_utils import clean_data

from starlette.concurrency import run_in_threadpool

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status, Form
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import models
from auth import CurrentUser, CurrentProject

from schemas import ProjectPublic, MetadataResponse, PreviewRowsResponse, CleaningRequest

from pathlib import Path


router = APIRouter()

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
    df = await run_in_threadpool(pd.read_parquet, current_project.raw_dataset_path)

    for col in droppable_columns.droppable_columns:
        if col not in df.columns:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Column '{col}' does not exist in the uploaded dataset.")

    cleaned_df, cleaning_summary = await run_in_threadpool(clean_data, df, droppable_columns.droppable_columns)

    if cleaned_df.shape[0] == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bad Dataset! Cleaning removed all rows from the dataset")

    if cleaned_df.shape[1] == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bad Dataset! Cleaning removed all columns from the dataset.")

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
        cleanup_delete(current_project.id, DatasetStage.CLEANED)
        await db.rollback()
        raise
