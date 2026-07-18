import pandas as pd

# ================================= CLEANING POLICY =======================================
"""
1.Validate the input and the user's droppable_columns
2.Remove exact duplicate rows
3.Identify sparse columns
4.Drop the approved sparse columns
5.Remove constant columns
6.Fill in the missing values - (median for numeric data | "Unknown" for categorical data)
7.Generate cleaned_dataset and cleaning summary
"""
# =========================================================================================

def clean_data(df: pd.DataFrame, droppable_cols: list[str]) -> tuple[pd.DataFrame, dict]:
    cleaned_df = df.copy()

    # Removing exact duplicate rows
    cleaned_df = cleaned_df.drop_duplicates()
    duplicate_rows_removed = int(df.shape[0] - cleaned_df.shape[0])

    # DROPPING ALL NULL COLUMNS 
    all_null_cols = cleaned_df.columns[cleaned_df.isna().all()].tolist()

    cleaned_df = cleaned_df.drop(columns=all_null_cols)

    # Identifying sparse columns
    SPARSE_COLUMN_THRESHOLD = 85.0
    null_percentage_dict = ((cleaned_df.isnull().mean()) * 100)[lambda percent: percent >= SPARSE_COLUMN_THRESHOLD].to_dict()

    to_drop = {key: value for key, value in null_percentage_dict.items() if key in droppable_cols}

    # Dropping the approved sparse columns
    cleaned_df = cleaned_df.drop(columns=to_drop.keys())

    # Removing constant columns
    const_cols = [col for col in cleaned_df.columns if cleaned_df[col].nunique()==1]

    cleaned_df = cleaned_df.drop(columns=const_cols)

    # Filling in missing values - (median for numeric data | "Unknown" for categorical data)
    numerical_cols = cleaned_df.select_dtypes(include=['number']).columns
    filled_numeric = {}

    for col in numerical_cols:
        if cleaned_df[col].isna().sum() > 0:
            replacement = float(cleaned_df[col].median())
            filled_numeric[col]= {"strategy": "median", "replacement": replacement, "filled_count": int(cleaned_df[col].isna().sum())}
            cleaned_df[col] = cleaned_df[col].fillna(replacement)

    categorical_cols = cleaned_df.select_dtypes(exclude=['number']).columns
    filled_categorical = {}

    for col in categorical_cols:
        if cleaned_df[col].isna().sum() > 0:
            replacement = "Unknown"
            filled_categorical[col]= {"strategy": "constant","replacement": replacement, "filled_count": int(cleaned_df[col].isna().sum())}
            cleaned_df[col] = cleaned_df[col].fillna(replacement)

    cleaned_summary = {
        "rows_before": int(df.shape[0]),
        "rows_after": int(cleaned_df.shape[0]),

        "columns_before": int(df.shape[1]),
        "columns_after": int(cleaned_df.shape[1]),

        "duplicate_rows_removed": duplicate_rows_removed,
        "removed_constant_columns": const_cols,
        "removed_sparse_columns": list(to_drop.keys()),
        "filled_numeric": filled_numeric,
        "filled_categorical": filled_categorical,
        "removed_all_null_columns": all_null_cols
    }

    return cleaned_df, cleaned_summary

