from typing import Annotated
import pandas as pd
from pathlib import Path

from utils.file_utils import save_raw_dataset, cleanup_delete
from utils.metadata_utils import extract_metadata
from utils.enum_utils import DatasetStage
from utils.preview_utils import load_preview_rows

from starlette.concurrency import run_in_threadpool

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status, Form
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import models
from auth import CurrentUser

from schemas import ProjectPublic, MetadataResponse, PreviewRowsResponse

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
        status = "UPLOADED"
    )

    try:
        db.add(new_project)
        await db.flush()

        filepath = await run_in_threadpool(save_raw_dataset, df, new_project.id)

        new_project.raw_dataset_path = filepath
        metadata = await run_in_threadpool(extract_metadata, df)
        new_project.raw_metadata = metadata

        await db.commit()
        await db.refresh(new_project)

        return new_project
    except Exception:
        cleanup_delete(project_id=new_project.id)
        await db.rollback()
        raise

# ========================================
# GET api/projects/{id}/preview/{stage}
# ========================================
@router.get("/{project_id}/preview/{stage}", response_model=MetadataResponse)
async def get_project_metadata(project_id: int,current_user: CurrentUser, stage: DatasetStage, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(models.Project).where(models.Project.id == project_id, models.Project.user_id == current_user.id))
    project = result.scalars().first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    
    if stage == DatasetStage.RAW:
        metadata = project.raw_metadata
    
    elif stage == DatasetStage.CLEANED:
        metadata = project.cleaned_metadata

    elif stage == DatasetStage.ENGINEERED:
        metadata = project.engineered_metadata

    if metadata is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="metadata not found")

    return metadata


# ============================================
# GET api/projects/{id}/preview-rows/{stage}
# ============================================
@router.get("/{project_id}/preview-rows/{stage}", response_model=PreviewRowsResponse)
async def get_rows(project_id: int, stage: DatasetStage, current_user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(models.Project).where(models.Project.id == project_id, models.Project.user_id == current_user.id))
    project = result.scalars().first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    
    if stage == DatasetStage.RAW:
        if project.raw_dataset_path is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No dataset has been uploaded yet")

        rows = await run_in_threadpool(load_preview_rows, project.raw_dataset_path)
    
    elif stage == DatasetStage.CLEANED:
        if project.cleaned_dataset_path is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The dataset hasn't been cleaned yet")
        rows =  await run_in_threadpool(load_preview_rows, project.cleaned_dataset_path)

    elif stage == DatasetStage.ENGINEERED:
        if project.engineered_dataset_path is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The dataset hasn't been engineered yet")
        rows = await run_in_threadpool(load_preview_rows, project.engineered_dataset_path)

    if rows is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="metadata not found")
    
    return {"rows": rows}
