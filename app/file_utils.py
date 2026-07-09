from pathlib import Path
import pandas as pd

UPLOADS_DIR = Path("uploads")

def save_raw_dataset(df: pd.DataFrame, project_id: int) -> str:
    project_dir = UPLOADS_DIR / f"project_{project_id}"
    project_dir.mkdir(parents=True, exist_ok=True)

    filename = "raw.parquet"
    filepath = project_dir / filename

    df.to_parquet(filepath)

    return str(filepath)

def cleanup_delete(project_id: int) -> None:
    filepath = UPLOADS_DIR / f"project_{project_id}" / "raw.parquet"
    if filepath.exists():
        filepath.unlink()


