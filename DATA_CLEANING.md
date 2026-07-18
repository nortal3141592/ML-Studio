# ML Studio — Data Cleaning Phase (MVP)

## Overview

The Data Cleaning phase is responsible for transforming the uploaded raw dataset into a cleaned dataset suitable for the Feature Engineering phase. The implementation intentionally follows a simple, deterministic cleaning policy aimed at supporting well-structured datasets commonly found on platforms like Kaggle.

---

## Features Implemented

### 1. Cleaning Endpoint

Implemented:

```http
POST /api/projects/{project_id}/clean
```

The endpoint:

- Accepts a list of user-approved droppable columns.
- Validates that every submitted column exists in the uploaded dataset.
- Loads the raw dataset from disk.
- Performs cleaning in a threadpool.
- Saves the cleaned dataset as `cleaned.parquet`.
- Generates cleaned metadata and a structured cleaning summary.
- Stores both inside the project's `cleaned_metadata`.
- Updates the project with the cleaned dataset path.
- Rolls back database changes and deletes partially written files if any step fails.

---

### 2. Automatic Cleaning Pipeline

The cleaning process follows the same order every time.

1. Remove exact duplicate rows.
2. Remove columns containing only `NULL` values.
3. Identify sparse columns (≥85% missing values).
4. Remove sparse columns only if the user explicitly approved them.
5. Remove constant columns (single unique value).
6. Fill remaining missing values:
   - Numeric columns → Median
   - Categorical columns → `"Unknown"`

---

### 3. Cleaning Summary

Every cleaning operation produces a structured JSON summary containing:

- Rows before / after cleaning
- Columns before / after cleaning
- Number of duplicate rows removed
- Constant columns removed
- Sparse columns removed
- Numeric columns filled
  - strategy
  - replacement value
  - number of values filled
- Categorical columns filled
  - strategy
  - replacement value
  - number of values filled

The summary is stored inside:

```text
cleaned_metadata["cleaning_summary"]
```

This keeps the backend frontend-agnostic while providing complete transparency.

---

### 4. Validation & Safety Checks

Implemented safeguards include:

- Reject cleaning if no raw dataset exists.
- Validate every user-selected droppable column.
- Reject cleaned datasets with:
  - 0 rows
  - 0 columns
- Automatic rollback on failure.
- Automatic filesystem cleanup for partially written datasets.

---

### 5. Shared Dataset Utilities

Refactored duplicate logic into reusable helpers.

Implemented:

- Generic `save_dataset()` supporting all dataset stages.
- Generic `cleanup_delete()` supporting stage-aware cleanup.

This removes duplicate code between upload, cleaning, and future pipeline stages.

---

### 6. Current Cleaning Philosophy

The MVP intentionally prioritizes:

- Simplicity
- Predictability
- Maintainability
- Transparency

rather than attempting to handle every possible real-world data issue.

The application is designed for reasonably structured supervised-learning datasets and not arbitrary or heavily corrupted data.

---

# Data Cleaning Disclaimer (MVP)

## Scope

The Data Cleaning phase is designed for **reasonably well-structured supervised learning datasets**, such as those commonly found on Kaggle and similar platforms. It is **not** intended to repair severely corrupted, inconsistent, or manually collected real-world datasets.

---

## Automatic Cleaning Policy

During cleaning, ML Studio will automatically:

- Remove exact duplicate rows.
- Remove columns containing only missing (`NULL`) values.
- Remove constant columns (columns containing only one unique value).
- Fill remaining missing values:
  - **Numeric columns:** Median
  - **Categorical columns:** `"Unknown"`

For **sparse columns** (columns with ≥85% missing values), the application **will not remove them without your permission**. You must explicitly select which sparse columns the application is allowed to drop.

After cleaning, a detailed summary of every operation performed is available in the dataset metadata.

---

## What ML Studio Does **Not** Do (MVP)

To keep the MVP simple, transparent, and predictable, ML Studio intentionally does **not** attempt to:

- Automatically detect or correct incorrect data types.
- Detect semantic errors (e.g., ages stored as names or mixed units).
- Handle inconsistent categorical values (e.g., `"USA"`, `"U.S.A."`, `"United States"`).
- Detect or repair mislabeled target values.
- Detect outliers or anomalous observations.
- Perform advanced imputation techniques.
- Automatically decide which features are useful for your specific problem.

These capabilities may be introduced in future versions.

---

## User Responsibilities

Before training a model, you should ensure that:

- The dataset is appropriate for supervised learning.
- The target (output) column is selected correctly.
- Feature values are reasonably clean and meaningful.
- The dataset does not contain severe structural or semantic errors.

ML Studio is designed to accelerate the workflow for clean, educational, and Kaggle-style datasets—not to replace full-scale data engineering or ETL pipelines.

---

## Design Philosophy

The goal of this cleaning phase is to provide a **simple, deterministic, and transparent** preprocessing pipeline that produces reliable results for typical machine learning datasets without introducing unnecessary complexity or hidden behavior.

## Future Improvements

Planned for later versions:

- Dataset validator
- Better datatype inference and correction
- Outlier handling
- Configurable cleaning strategies
- Richer cleaning statistics
- Downstream training-run invalidation
- Cleaning history and versioning