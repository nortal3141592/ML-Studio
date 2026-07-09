import pandas as pd

def extract_metadata(df: pd.DataFrame) -> dict:
    return {
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "column_names": df.columns.to_list(),
        "dtypes": df.dtypes.astype(str).to_dict(),
        "missing_values": {col:int(val) for col, val in df.isnull().sum().items()},
        "memory_bytes": int(df.memory_usage(deep=True).sum())
    }