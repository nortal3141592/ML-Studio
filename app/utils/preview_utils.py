import pandas as pd
from typing import Any, cast

def load_preview_rows(path: str, rows: int = 5) -> list[dict[str, Any]]:
    df = pd.read_parquet(path)

    return cast(list[dict[str, Any]], df.head(n=rows).to_dict(orient="records"))