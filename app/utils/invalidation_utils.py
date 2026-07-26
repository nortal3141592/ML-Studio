from pathlib import Path

import models
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from starlette.concurrency import run_in_threadpool

from shutil import rmtree


async def invalidate_training_runs(db: AsyncSession, project_id: int) -> None:
    result = await db.execute(select(models.TrainingRun).where(models.TrainingRun.project_id == project_id))
    runs = list(result.scalars().all())

    for run in runs:
        run_dir = Path(f"uploads/project_{project_id}/runs/run_{run.id}")
        if run_dir.exists():
            await run_in_threadpool(rmtree, run_dir)
        await db.delete(run)

async def invalidate_engineering_artifacts(project: models.Project) -> None:
    engineering_paths = [
        project.x_train_path, project.x_cv_path, project.x_test_path,
        project.y_train_path, project.y_cv_path, project.y_test_path,
        project.preprocessor_path
    ]

    for path_str in engineering_paths:
        if path_str:
            path = Path(path_str)
            if path.exists():
                await run_in_threadpool(path.unlink)

    project.x_train_path = project.x_cv_path = project.x_test_path = None
    project.y_train_path = project.y_cv_path = project.y_test_path = None
    project.preprocessor_path = None
    project.engineered_metadata = None
    project.target_column = None
    project.task_type = None
    project.num_classes = None