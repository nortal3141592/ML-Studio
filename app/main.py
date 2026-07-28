from contextlib import asynccontextmanager

from fastapi import FastAPI
from routers import projects, users, evaluation

from database import engine, Base

@asynccontextmanager
async def lifespan(_app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

    await engine.dispose()


app = FastAPI(lifespan=lifespan)

app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(evaluation.router, prefix="/api/projects", tags = ["Evaluation"])

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)