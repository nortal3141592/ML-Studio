# ML Studio -- Feature Engineering Phase Summary

## Overview

This phase completes the **Feature Engineering** stage of the ML Studio
backend. The goal is to transform a cleaned dataset into model-ready
artifacts while following proper machine learning practices (especially
avoiding data leakage).

Pipeline:

``` text
Upload
  ↓
Preview (Raw)
  ↓
Cleaning
  ↓
Preview (Cleaned)
  ↓
Feature Engineering
  ↓
Ready for Model Training
```

------------------------------------------------------------------------

# Design Decisions

## Scope

Feature Engineering is responsible for converting a cleaned dataset into
model-ready features.

Responsibilities:

-   Select target column
-   Train/CV/Test split
-   Scaling numerical features
-   One-Hot Encoding categorical features
-   Persist preprocessing pipeline
-   Generate metadata

Not included in V1:

-   Polynomial Features
-   Automatic feature selection
-   PCA
-   Label encoding of target
-   Feature generation beyond encoding/scaling

------------------------------------------------------------------------

## API Contract

Endpoint:

`POST /projects/{project_id}/engineer`

Request:

``` json
{
  "target_column": "...",
  "train_split": 70,
  "cv_split": 15,
  "test_split": 15
}
```

Validation:

-   cleaned dataset must exist
-   target column must exist
-   all splits \> 0
-   split percentages must sum to 100

------------------------------------------------------------------------

## Major Architecture Revamp

Old design:

    engineered.parquet

New design:

    x_train.parquet
    x_cv.parquet
    x_test.parquet

    y_train.parquet
    y_cv.parquet
    y_test.parquet

    preprocessor.joblib

Reason:

Training never consumes one giant engineered dataset.

It consumes train/CV/test separately.

This architecture mirrors real ML workflows.

------------------------------------------------------------------------

## Project Model Changes

Added fields:

-   x_train_path
-   x_cv_path
-   x_test_path
-   y_train_path
-   y_cv_path
-   y_test_path
-   preprocessor_path

Removed dependency on a single engineered dataset path.

engineered_metadata remains one JSON blob.

------------------------------------------------------------------------

# Leakage Prevention

Order:

1.  Split dataset
2.  Fit preprocessing ONLY on training data
3.  Transform CV/Test using fitted transformer

No statistics are learned from validation/test data.

------------------------------------------------------------------------

# Preprocessing

Uses sklearn ColumnTransformer.

Numeric columns:

-   StandardScaler()

Categorical columns:

-   OneHotEncoder(handle_unknown="ignore", sparse_output=False)

The fitted transformer is saved as:

    preprocessor.joblib

This will later be reused during inference.

------------------------------------------------------------------------

# Preview Endpoint Redesign

Raw/Cleaned remain unchanged.

Engineered preview rows now require:

    ?split=train
    ?split=cv
    ?split=test

Each preview returns:

-   x_rows
-   y_rows

Metadata endpoint continues returning one engineered_metadata object.

------------------------------------------------------------------------

# Helper Functions

## split_dataset()

Responsibilities:

-   Separate X and y
-   Produce Train/CV/Test splits
-   Preserve DataFrames/Series

Returns:

-   X_train
-   X_cv
-   X_test
-   y_train
-   y_cv
-   y_test

------------------------------------------------------------------------

## build_preprocessor()

Responsibilities:

-   Detect numeric columns
-   Detect categorical columns
-   Build ColumnTransformer
-   Fit on training data

Returns:

-   fitted preprocessor
-   numeric column names
-   categorical column names

------------------------------------------------------------------------

## transform_datasets()

Responsibilities:

-   Transform train
-   Transform CV
-   Transform test
-   Convert transformed arrays back into DataFrames
-   Restore feature names

------------------------------------------------------------------------

## save_preprocessor()

Stores:

    preprocessor.joblib

Returns saved path.

------------------------------------------------------------------------

## extract_engineering_metadata()

Produces metadata including:

-   target column
-   train/cv/test shapes
-   scaled columns
-   encoded columns
-   feature names after encoding
-   number of resulting features

------------------------------------------------------------------------

## engineer_data()

Master orchestration function.

Flow:

1.  Split dataset
2.  Build preprocessor
3.  Transform datasets
4.  Generate metadata

Returns:

-   processed X splits
-   y splits
-   fitted preprocessor
-   metadata

------------------------------------------------------------------------

# Feature Engineering Endpoint

Flow:

1.  Validate cleaned dataset exists
2.  Load cleaned parquet
3.  Validate target column
4.  Validate split ratios
5.  Call engineer_data()
6.  Save:
    -   x_train
    -   x_cv
    -   x_test
    -   y_train
    -   y_cv
    -   y_test
    -   preprocessor.joblib
7.  Update Project model
8.  Save engineered metadata
9.  Mark project READY
10. Commit
11. Rollback + cleanup on failure

------------------------------------------------------------------------

# Metadata Format

Includes:

-   target_column
-   train statistics
-   cv statistics
-   test statistics
-   scaled_columns
-   encoded_columns
-   feature_names_after_encoding
-   number_of_features_after_encoding

------------------------------------------------------------------------

# Refactoring Completed

-   save_dataset() now accepts filenames directly instead of
    DatasetStage.
-   cleanup_delete() supports engineered artifacts (6 parquet files +
    joblib).
-   Preview endpoint redesigned for dataset splits.
-   Project model updated for engineered artifacts.

------------------------------------------------------------------------

# Important Decisions

-   Automatic One-Hot Encoding.
-   Automatic Standard Scaling.
-   No user-configurable preprocessing in V1.
-   No polynomial features.
-   Target encoding deferred to training phase.
-   Model selection will determine target handling.
-   Users are expected to possess basic ML knowledge.

------------------------------------------------------------------------

# Current Backend Status

Implemented:

-   Authentication
-   Upload
-   Metadata extraction
-   Dataset preview
-   Cleaning
-   Cleaned preview
-   Feature Engineering
-   Preprocessing persistence

Next major phase:

**Model Training**

The training phase will consume:

-   x_train.parquet
-   x_cv.parquet
-   x_test.parquet
-   y_train.parquet
-   y_cv.parquet
-   y_test.parquet
-   preprocessor.joblib

No additional feature engineering should be required before training.
