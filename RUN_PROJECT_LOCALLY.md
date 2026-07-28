#  Running ML Studio Locally

Follow the steps below to get **ML Studio** running on your own machine.

> **Prerequisites**
>
> Before you begin, make sure you have the following installed:
>
> - Python **3.12 or newer**
> - **Git**
> - **Node.js** (includes npm)
> - **uv** (Python package manager)
>
> You can verify your installations by running:
>
> ```bash
> python3 --version
> node --version
> npm --version
> uv --version
> ```

---

# 1. Clone the Repository

Clone the project and enter the project directory.

```bash
git clone https://github.com/nortal3141592/ML-Studio.git

cd ML-Studio
```

---

# 2. Backend Setup (FastAPI)

The backend lives inside the `app/` directory.

## Step 1 — Create a `.env` file

Inside the `app/` folder, create a new file named:

```text
.env
```

Your project structure should now look like:

```text
ML-Studio/
│
├── app/
│   ├── .env
│   ├── main.py
│   ├── ...
│
└── ml-studio-frontend/
```

---

## Step 2 — Generate a Secret Key

Open your terminal and run:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

If your system uses `python` instead of `python3`, use:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

This will output a long random string similar to:

```text
4fa2e29b0f0d5e87d88fd8c17b67b...
```

Copy this value.

---

## Step 3 — Add the Secret Key

Open `app/.env` and paste:

```env
SECRET_KEY=<your-generated-secret-key>
```

Example:

```env
SECRET_KEY=4fa2e29b0f0d5e87d88fd8c17b67b...
```

---

## Step 4 — Install Backend Dependencies

This project uses **uv** as its package manager.

From the project root, run:

```bash
uv sync
```

This command reads the project's `pyproject.toml` and `uv.lock` files and installs all required Python dependencies automatically.

> **Note**
>
> You do **not** need to install packages manually with `pip install ...`.

---

## Step 5 — Start the Backend

From the project root, run:

```bash
uv run fastapi dev app/main.py
```

If everything starts successfully, you'll see output similar to:

```text
Serving at http://127.0.0.1:8000
```

Depending on your system or configuration, the port may be different.

Copy the complete backend URL (for example):

```text
http://127.0.0.1:8000
```

You'll need it during the frontend setup.

---

# 3. Frontend Setup (React + Vite)

The frontend lives inside:

```text
ml-studio-frontend/
```

Move into the frontend directory:

```bash
cd ml-studio-frontend
```

---

## Step 1 — Install Dependencies

Run:

```bash
npm install
```

That's it.

All required frontend dependencies are already listed inside `package.json`, so you **do not** need to install packages individually.

---

## Step 2 — Create a `.env` file

Inside the `ml-studio-frontend/` folder, create:

```text
.env
```

---

## Step 3 — Connect the Frontend to the Backend

Inside `ml-studio-frontend/.env`, add:

```env
VITE_API_BASE_URL=<your-backend-url>
```

Example:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## Step 4 — Start the Frontend

Run:

```bash
npm run dev
```

Vite will display something similar to:

```text
Local: http://localhost:5173
```

Depending on your machine, the port may be different (for example `5174` or `5175`).

Copy this frontend URL.

---

# 4. Configure CORS

The backend needs to know which frontend is allowed to communicate with it.

Open:

```text
app/main.py
```

Locate the `app.add_middleware(...)` call.

Inside it, you'll find something similar to:

```python
allow_origins=[
    "http://localhost:5173",
]
```

Replace the existing URL with the frontend URL that Vite printed earlier.

Example:

```python
allow_origins=[
    "http://localhost:5173",
]
```

or

```python
allow_origins=[
    "http://localhost:5174",
]
```

or whatever URL your frontend is running on.

After making this change, **restart the backend server** so the new CORS configuration takes effect.

---

# 5. Launch ML Studio

Open your browser and visit your frontend URL.

For example:

```text
http://localhost:5173
```

If everything has been configured correctly, ML Studio should now be running locally and be ready to use.

---

# Troubleshooting

### `python3` is not recognized

Try:

```bash
python
```

instead of:

```bash
python3
```

---

### `uv` is not recognized

Install **uv**, then verify the installation:

```bash
uv --version
```

---

### Backend won't start

Make sure you have:

- Python **3.12+**
- Run `uv sync`
- Created `app/.env`
- Added a valid `SECRET_KEY`

---

### Frontend cannot communicate with the backend

Check the following:

- `VITE_API_BASE_URL` points to the correct backend URL.
- `allow_origins` inside `app/main.py` matches your frontend URL exactly.
- Restart the backend after changing `allow_origins`.

---

### Port already in use

If either FastAPI or Vite starts on a different port than expected, simply use the URL shown in the terminal and update:

- `VITE_API_BASE_URL` (frontend)
- `allow_origins` (backend)

to match those URLs.
