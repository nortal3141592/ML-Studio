# ML Studio

A full-stack web application for running an entire supervised machine learning workflow => from raw CSV to a trained, evaluated, downloadable model,  without writing any ML code by hand.

Built as a self-directed learning project alongside Andrew Ng's Machine Learning Specialization, ML Studio is the practical, production-shaped complement to that theory: a real FastAPI backend, a real React frontend, and a real (if intentionally scoped-down) ML pipeline underneath it.

![alt text](readme-assets/image-5.png)

---

## What it does

Upload a CSV, and ML Studio walks you through:

1. **Upload** — dataset stored, metadata extracted (rows, columns, dtypes, missing values)
2. **Clean** — automatic removal of duplicates, all-null and constant columns, plus user-approved removal of sparse columns; remaining missing values filled (median / "Unknown")
3. **Engineer** — leakage-safe train/cv/test split, automatic encoding (one-hot) and scaling (standardization), fitted preprocessing pipeline persisted for reuse
4. **Train** — 9 algorithms (linear/ridge/lasso/SGD regression, logistic regression, decision tree, random forest, XGBoost, and a configurable Keras neural network), trained as background jobs with live status polling
5. **Evaluate** — per-run metrics, charts, and plain-language insights, plus a project-wide dashboard comparing every run
6. **Download** — trained model, preprocessor, and metrics, individually or bundled as a zip

![alt text](readme-assets/image-6.png)

---

## Tech stack

**Backend**
- FastAPI (async), SQLAlchemy 2.x (async), SQLite (dev)
- JWT auth (PyJWT + pwdlib), email-based password reset (aiosmtplib)
- pandas, scikit-learn, XGBoost, Keras/TensorFlow
- Background job execution via FastAPI `BackgroundTasks`

**Frontend**
- React + TypeScript + Vite
- TanStack Query (data fetching, caching, polling)
- Tailwind CSS v4
- Recharts (charts and dashboards)
- React Router

![alt text](readme-assets/image-1.png)

---


## Getting started

### Backend

```bash
cd app
python -m venv ../.venv
source ../.venv/bin/activate   # Windows: ..\.venv\Scripts\activate
pip install -r ../requirements.txt
cp .env.example .env           # fill in SECRET_KEY, mail settings, etc.
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`. Interactive API docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd ml-studio-frontend
npm install
cp .env.example .env           # set VITE_API_URL to your backend URL
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## Design philosophy and honest limitations

![alt text](readme-assets/image-2.png)

ML Studio automates common, general-purpose preprocessing and training decisions so a well-structured tabular dataset can go from CSV to trained model with minimal manual work. It is **not** a replacement for a data scientist, and it does not try to be. It makes conservative, transparent, general-purpose choices — and every automatic decision is shown to the user, not hidden.

It's built for **clean-ish, well-structured tabular datasets** — the kind found on Kaggle, UCI, OpenML, or in course assignments,  not for messy, domain-specific, or multi-modal data.

Below is an honest breakdown of what each stage does, what it deliberately does *not* do, and where it can go wrong.

### Upload
- Accepts `.csv` only. Assumes the first row is a header row,  a headerless CSV will have its first data row silently misread as column names.
- Rejects empty datasets, but does not inspect data quality beyond that at this stage.

### Cleaning
- **Automatic, no user input required** for: exact duplicate rows, all-null columns, and constant (single-value) columns,  these are removed unconditionally.
- **User-approved only**: columns with ≥85% missing values are flagged, and only removed if the user explicitly allows it.
- Remaining missing values are filled — numeric columns with the **median**, categorical columns with the constant `"Unknown"`. This is a simple, general-purpose strategy, not a domain-aware one. It can distort a column's real distribution, especially on small datasets or columns with meaningful missingness (e.g., "missing" that actually signals something, like an unanswered survey question).
- **Does not attempt**: correcting mislabeled data, reconciling inconsistent categorical formatting (e.g. `"Yes"` vs `"yes"` vs `"Y"`), fixing numbers stored as strings, detecting or removing outliers, or any cleaning requiring domain knowledge.
- **Common pitfall**: a dataset with meaningful outliers or a legitimately skewed distribution may have that skew partially masked by median-filling, which can quietly weaken a model without an obvious error.

### Feature Engineering
- Splits **before** any transformation is fit, and fits scaling/encoding only on the training split — this avoids data leakage into validation/test.
- Numeric columns are always scaled with `StandardScaler`; categorical columns are always one-hot encoded. **Neither is user-configurable in v1** — every dataset gets the same treatment regardless of whether it's actually appropriate (e.g. tree-based models generally don't need scaling at all, and get it anyway).
- **Known weakness**: one-hot encoding a high-cardinality categorical column (e.g. hundreds of unique city names) will explode the feature count and can meaningfully hurt model performance and training time. The pipeline does not warn about or guard against this.
- Classification targets are label-encoded automatically; the encoding is stored and reversible. Task type (regression / binary / multiclass classification) is inferred automatically from the target column's dtype and cardinality — this heuristic can misclassify an unusual target (e.g. a numeric column that's actually a disguised category with many values).

### Training
![alt text](readme-assets/image-3.png)
- 9 algorithms are supported, each validated against the detected task type before training is allowed to start (a regression algorithm cannot be run against a classification target, and vice versa).
- Hyperparameters are fully exposed per algorithm, but **no automated hyperparameter tuning exists in v1** — every value is a manual, one-at-a-time choice. Grid/random search is a planned v2 feature.
- Only one training run can be active per project at a time.
- Training runs as a background task within the same server process — it is **not a durable job queue**. If the server restarts mid-training, that run is left in a stuck, unrecoverable state.

### Evaluation
- Metrics, generalization-gap analysis, and plain-language insights are generated automatically for every completed run, individually and compared across all runs in a project.
- Insight thresholds (e.g. "possible overfitting" at a given train/cv gap) are **heuristic rules of thumb**, not statistically rigorous tests — they're meant to prompt further investigation, not serve as a final verdict.
- **Deliberately not included in v1**: confusion matrices, ROC curves, and precision-recall curves. These require storing raw per-sample predictions, which the current pipeline does not persist. Planned for v2.
- Feature importance / coefficients are only available for algorithms that natively expose them (tree-based models and linear models respectively) — not neural networks.

### Explainability
- **Not implemented in v1.** No SHAP or other model-explainability tooling exists yet. Planned for v2.

### Auth & accounts
- Password reset invalidates the stored reset token on use, but does **not** revoke any JWT access tokens already issued before the reset — a token issued before a password change remains valid until it naturally expires (up to the configured session length). This is a known trade-off of stateless JWT auth without a server-side revocation list.

### General
![alt text](readme-assets/image-4.png)
- This is a single-user-per-account, ownership-scoped system — every project and run is tied to and only visible to the account that created it.
- No automated tests exist yet (planned for a future iteration).
- Not rate-limited yet — planned for v2, before any public deployment sees real traffic.

---
## A note on how this was built

The **backend** — every architectural decision, every line of pipeline logic, the full training system, evaluation engine, and auth layer — was designed and written by me, with a Claude session acting purely as a mentor: asking questions, reviewing code, and pushing back on design decisions, but never writing the implementation. Every trade-off documented in this README (leakage-safe splitting, cascading invalidation, the cleaning ruleset, task-type validation, and so on) reflects a decision I made and understood, not one handed to me.

The **frontend** was built end-to-end by Claude in a dedicated session, working from a fully specified API contract, a defined tech stack, and a design direction I chose. I directed and reviewed the build, but did not write the frontend code by hand.

I'm noting this distinction openly because it's the honest and relevant one: the backend represents my own ML/backend engineering ability; the frontend represents my ability to scope, direct, and evaluate AI-assisted work — a different, but increasingly relevant, skill.

## Roadmap (v2)

- Hyperparameter tuning (grid / random search)
- Confusion matrix, ROC curve, precision-recall curve
- SHAP-based explainability
- Rate limiting
- Automated tests
- Durable background job queue for training

---
