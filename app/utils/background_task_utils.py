import asyncio
import traceback
from typing import cast

import pandas as pd

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select
from fastapi.encoders import jsonable_encoder

import models
from database import AsyncSessionLocal
from utils.enum_utils import TaskType, TrainingStatus, Algorithm
from utils.training_utils import train_model
from schemas import ALGORITHM_TO_HYPERPARAMETER_SCHEMA

async def execute_training_job(run_id: int):
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(models.TrainingRun)
                .options(joinedload(models.TrainingRun.project))
                .where(models.TrainingRun.id == run_id)
            )

            training_run = result.scalars().first()
            if not training_run:
                return
            
            project = training_run.project
            # training_run, project = row

            training_run.status = TrainingStatus.TRAINING.value
            training_run.status_message = "Loading datasets..."
            await db.commit()

            # TAKING CARE OF PYLANCE / PYRIGHT'S QUALMS AND SHIT
            if not all([
                project.x_train_path, project.x_cv_path, project.x_test_path,
                project.y_train_path, project.y_cv_path, project.y_test_path
            ]) or project.num_classes is None:
                raise ValueError("One or more dataset file paths are missing for this project.")

            # Type narrowing assertions to satisfy Pyright / Pylance
            assert project.x_train_path is not None
            assert project.x_cv_path is not None
            assert project.x_test_path is not None
            assert project.y_train_path is not None
            assert project.y_cv_path is not None
            assert project.y_test_path is not None
            assert project.num_classes is not None

            # Local variables with guaranteed 'str' types
            x_train_p, x_cv_p, x_test_p = project.x_train_path, project.x_cv_path, project.x_test_path
            y_train_p, y_cv_p, y_test_p = project.y_train_path, project.y_cv_path, project.y_test_path

            def load_data():
                return (
                    pd.read_parquet(x_train_p),
                    pd.read_parquet(x_cv_p),
                    pd.read_parquet(x_test_p),
                    pd.read_parquet(y_train_p).squeeze("columns"),
                    pd.read_parquet(y_cv_p).squeeze("columns"),
                    pd.read_parquet(y_test_p).squeeze("columns")
                )
            
            # Unpack loaded datasets
            X_train, X_cv, X_test, y_train_raw, y_cv_raw, y_test_raw = await asyncio.to_thread(load_data)

            # Ensure Pyright sees y as Series
            y_train = cast(pd.Series, y_train_raw)
            y_cv = cast(pd.Series, y_cv_raw)
            y_test = cast(pd.Series, y_test_raw)

            training_run.status_message = "Training model...."

            await db.commit()

            algorithm_enum = Algorithm(training_run.algorithm)

            task_type_enum = TaskType(project.task_type)

            schema_class = ALGORITHM_TO_HYPERPARAMETER_SCHEMA[algorithm_enum]
            hyperparameters_obj = schema_class(**training_run.hyperparameters)

            model_path, history_path, metrics, training_time = await asyncio.to_thread(
                train_model,
                algorithm_enum,
                hyperparameters_obj,
                X_train, X_cv, X_test,
                y_train, y_cv, y_test,
                project.id,
                training_run.id,
                task_type_enum,
                project.num_classes
            )

            training_run.status = TrainingStatus.COMPLETED.value
            training_run.status_message = "Training completed successfully."
            training_run.model_path = model_path
            training_run.history_path = history_path
            training_run.training_time_seconds = training_time
            training_run.metrics = jsonable_encoder(metrics) # Safely converts Pydantic schema for JSON column
            
            await db.commit()

        except Exception as e:
            await db.rollback()
            
            run = await db.get(models.TrainingRun, run_id)
            if run:
                run.status = TrainingStatus.FAILED.value
                run.status_message = "Training failed."
                run.error_message = traceback.format_exc() # Grabs the exact python error for debugging
                await db.commit()