# ML Studio – Supported Dataset Guidelines

## Project Scope

ML Studio is designed as an educational machine learning application that automates the common workflow for building supervised learning models on **well-structured tabular datasets**.

The application is intended to work with datasets commonly found on platforms such as:

- Kaggle
- UCI Machine Learning Repository
- OpenML
- Course assignments and educational datasets
- Similar structured CSV datasets

These datasets may contain common data quality issues such as:

- Missing values
- Duplicate rows
- Constant columns
- Highly incomplete columns
- Minor formatting inconsistencies

ML Studio is designed to automatically detect and handle these common scenarios while providing a transparent summary of every operation performed.

---

# What ML Studio Assumes

To produce reliable results, ML Studio assumes that the uploaded dataset satisfies the following conditions:

- Each row represents a single observation.
- Each column represents a single feature.
- Column names are meaningful.
- The dataset is intended for a supervised learning task.
- The target column exists and is selected by the user before training.
- Values within each column are generally consistent with the meaning of that column.

---

# What ML Studio Does Not Attempt to Fix

ML Studio intentionally does **not** attempt to automatically repair heavily corrupted or domain-specific datasets.

Examples include (but are not limited to):

- Columns containing unrelated data types (e.g. state names mixed with arbitrary numeric values).
- Ambiguous values that require domain knowledge to interpret.
- Incorrect labels or mislabeled observations.
- Corrupted CSV files.
- Datasets requiring extensive manual preprocessing.
- Complex data integration or data reconciliation tasks.

In these situations, manual inspection and preprocessing are recommended before using ML Studio.

---

# Design Philosophy

ML Studio is **not** intended to replace professional data engineering or AutoML platforms.

Instead, its goal is to automate common preprocessing tasks while remaining transparent about the assumptions it makes.

Whenever possible, ML Studio prefers to:

- Perform safe, general-purpose cleaning operations.
- Avoid making irreversible assumptions about the data.
- Clearly communicate any modifications made during preprocessing.
- Leave domain-specific decisions to the user.

---

# Note

Machine learning results are only as reliable as the data provided.

ML Studio can simplify the workflow, but it cannot determine the real-world meaning or correctness of your data. Users are encouraged to inspect their datasets and verify model outputs before drawing conclusions.


# addressign concerns
## Cleaning Phase Decisions
After reviewing the concerns, I made the following decisions for the MVP:
### Cleaning Policy
The application will **always** remove:
- Exact duplicate rows
- Columns containing only NULL values
- Constant columns (only one unique value)
These are considered objectively useless for machine learning, so they do **not** require user approval.
The user only chooses which **sparse columns** (columns with ≥85% missing values) the application is allowed to remove.
---
### Disclaimer to Users
The application's cleaning behaviour will be clearly stated on the Home page:
- Duplicate rows are removed automatically.
- Columns containing only missing values are removed automatically.
- Constant columns are removed automatically.
- Only sparse columns require user approval before removal.
- Remaining numeric missing values are filled using the **median**.
- Remaining categorical missing values are filled with **"Unknown"**.
---
### Other Decisions
- cleaning_summary is stored inside cleaned_metadata as structured JSON.
- Cleaning now fails if the resulting dataset has **0 rows** or **0 columns**.
- Downstream invalidation currently handles only datasets and metadata. Training-run invalidation will be added once the training system is implemented."