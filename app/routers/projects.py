from typing import Annotated
import pandas as pd

from file_utils import save_raw_dataset, cleanup_delete
from starlette.concurrency import run_in_threadpool

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status, Form
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import models
from auth import CurrentUser

from schemas import ProjectPublic

from pathlib import Path


router = APIRouter()



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

        await db.commit()
        await db.refresh(new_project)

        return new_project
    except Exception:
        cleanup_delete(project_id=new_project.id)
        await db.rollback()
        raise


