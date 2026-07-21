import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from config import settings
import numpy as np

from pathlib import Path
import joblib

UPLOADS_DIR = Path("uploads")

def split_dataset(cleaned_df: pd.DataFrame, target_column: str, split_ratios: tuple[int, int, int] = (settings.train_split, settings.cv_split, settings.test_split)):
    df = cleaned_df.copy()

    y = df[target_column]
    
    X = df.drop(columns=[target_column])

    x_train, x_, y_train, y_ = train_test_split(
        X, y, train_size=float(split_ratios[0]/100), random_state=settings.random_state)
    x_cv, x_test, y_cv, y_test = train_test_split(x_, y_, train_size=float(split_ratios[1]/(split_ratios[1] + split_ratios[2])), random_state=settings.random_state)

    return x_train, x_cv, x_test, y_train, y_cv, y_test

def build_preprocessor(X_train: pd.DataFrame) -> tuple[ColumnTransformer, list[str], list[str]]:
    numeric_columns = X_train.select_dtypes(include=["number"]).columns.tolist()

    categorical_columns = X_train.select_dtypes(exclude=["number"]).columns.tolist()

    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", StandardScaler(), numeric_columns),
            ("categorical", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_columns)
        ]
    )

    preprocessor.fit(X_train)

    return preprocessor, numeric_columns, categorical_columns

def transform_datasets(preprocessor: ColumnTransformer, X_train: pd.DataFrame, X_cv: pd.DataFrame, X_test: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    transformed_train = np.asarray(preprocessor.transform(X_train))
    transformed_cv = np.asarray(preprocessor.transform(X_cv))
    transformed_test = np.asarray(preprocessor.transform(X_test))

    feature_names = preprocessor.get_feature_names_out()

    X_train = pd.DataFrame(transformed_train, columns=feature_names, index=X_train.index)
    X_cv = pd.DataFrame(transformed_cv, columns=feature_names, index=X_cv.index)
    X_test = pd.DataFrame(transformed_test, columns=feature_names, index=X_test.index)

    return X_train, X_cv, X_test

def save_preprocessor(preprocessor: ColumnTransformer, project_id: int) -> str:
    project_dir = UPLOADS_DIR / f"project_{project_id}"
    project_dir.mkdir(parents=True, exist_ok=True)

    filepath = project_dir / "preprocessor.joblib"

    joblib.dump(preprocessor, filepath)

    return str(filepath)

def extract_engineering_metadata(
    X_train: pd.DataFrame,X_cv: pd.DataFrame,X_test: pd.DataFrame,
    y_train: pd.Series,y_cv: pd.Series,y_test: pd.Series,
    target_column: str, preprocessor: ColumnTransformer,
    numeric_columns: list[str], categorical_columns: list[str]
) -> dict:
    
    feature_names = preprocessor.get_feature_names_out().tolist()

    return {
        "target_column": target_column,

        "train": {
            "x_rows": X_train.shape[0],
            "x_columns": X_train.shape[1],
            "y_rows": y_train.shape[0],
        },


        "cv": {
            "x_rows": X_cv.shape[0],
            "x_columns": X_cv.shape[1],
            "y_rows": y_cv.shape[0],
        },


        "test": {
            "x_rows": X_test.shape[0],
            "x_columns": X_test.shape[1],
            "y_rows": y_test.shape[0],
        },

        "scaled_columns": numeric_columns,

        "encoded_columns": categorical_columns,

        "feature_names_after_encoding": feature_names,
        "number_of_features_after_encoding": len(feature_names)
    }

def engineer_data(cleaned_df: pd.DataFrame, 
    target_column: str, 
    split_ratios: tuple[int, int, int] = (settings.train_split, settings.cv_split, settings.test_split)
) -> tuple[
    pd.DataFrame, pd.DataFrame, pd.DataFrame,
    pd.Series, pd.Series, pd.Series,
    ColumnTransformer, dict
]:
    X_train, X_cv, X_test, y_train, y_cv, y_test = split_dataset(cleaned_df, target_column, split_ratios)

    preprocessor, numeric_columns, categorical_columns = build_preprocessor(X_train)

    X_train_processed, X_cv_processed, X_test_processed = transform_datasets(preprocessor, X_train, X_cv, X_test)

    metadata = extract_engineering_metadata(X_train_processed, X_cv_processed, X_test_processed, y_train, y_cv, y_test, target_column, preprocessor, numeric_columns, categorical_columns)

    return (
        X_train_processed, X_cv_processed, X_test_processed,
        y_train,y_cv,y_test,
        preprocessor,metadata
    )



