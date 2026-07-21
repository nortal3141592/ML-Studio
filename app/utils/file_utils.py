from pathlib import Path
import pandas as pd
from utils.enum_utils import DatasetStage

UPLOADS_DIR = Path("uploads")


def save_dataset(df: pd.DataFrame | pd.Series, project_id: int, filename: str):
    project_dir = UPLOADS_DIR / f"project_{project_id}"
    project_dir.mkdir(parents=True, exist_ok=True)

    filepath = project_dir / filename

    if isinstance(df, pd.Series):
        df = df.to_frame()

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

def cleanup_delete_engineering(filepaths: list[str]) -> None:
    for filepath in filepaths:
        path = Path(filepath)

        if path.exists():
            path.unlink()

