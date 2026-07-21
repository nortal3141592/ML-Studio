from pathlib import Path
import pandas as pd
from utils.enum_utils import DatasetStage

UPLOADS_DIR = Path("uploads")

# def save_dataset(df: pd.DataFrame, project_id: int, stage: DatasetStage, which_split: int | None = None, x_or_y: int | None = None) -> str:
#     splits = ["train", "cv", "test"]
#     xymap = ["x", "y"]
#     project_dir = UPLOADS_DIR / f"project_{project_id}"
#     project_dir.mkdir(parents=True, exist_ok=True)
#     else:

#         filename = f"{stage.value}.parquet"
#         filepath = project_dir / filename

#         df.to_parquet(filepath)
#     return str(filepath)

def save_dataset(df: pd.DataFrame, project_id: int, filename: str):
    project_dir = UPLOADS_DIR / f"project_{project_id}"
    project_dir.mkdir(parents=True, exist_ok=True)

    filepath = project_dir / filename

    df.to_parquet(filepath)

    return str(filepath)


def cleanup_delete(project_id: int, stage: DatasetStage) -> None:
    if stage == DatasetStage.ENGINEERED:
        proj_dir = UPLOADS_DIR / f"project_{project_id}"
        filepaths = [proj_dir / "x_train.parquet", proj_dir / "x_cv.parquet", proj_dir / "x_test.parquet", proj_dir / "y_train.parquet", proj_dir / "y_cv.parquet", proj_dir / "y_test.parquet", proj_dir / "preprocessor.joblib"]

        for filepath in filepaths:
            if filepath.exists():
                filepath.unlink()
    else:
        filepath = UPLOADS_DIR / f"project_{project_id}" / f"{stage.value}.parquet"
        if filepath.exists():
            filepath.unlink()


