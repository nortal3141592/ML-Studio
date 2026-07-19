from pathlib import Path
import pandas as pd
from utils.enum_utils import DatasetStage

UPLOADS_DIR = Path("uploads")

def save_dataset(df: pd.DataFrame, project_id: int, stage: DatasetStage) -> str:
    project_dir = UPLOADS_DIR / f"project_{project_id}"
    project_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{stage.value}.parquet"
    filepath = project_dir / filename

    df.to_parquet(filepath)
    return str(filepath)


def cleanup_delete(project_id: int, stage: DatasetStage) -> None:
    filepath = UPLOADS_DIR / f"project_{project_id}" / f"{stage.value}.parquet"
    if filepath.exists():
        filepath.unlink()


