from __future__ import annotations
from typing import Any
from datetime import datetime, UTC

from sqlalchemy import String, Integer, Text, DateTime, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)

    image_file: Mapped[str | None] = mapped_column(String(200), nullable=True, default=None)

    @property
    def image_path(self):
        if self.image_file:
            return f"/media/profile_pics/{self.image_file}"
        return "/static/profile_pics/default.jpg"
    
    projects: Mapped[list[Project]] = relationship(back_populates = "user", cascade='all, delete-orphan')


class Project(Base):
    __tablename__ = "projects"

    __table_args__ = (
        UniqueConstraint(
            "user_id", "project_name", name="uq_user_project_name",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_name: Mapped[str] = mapped_column(String(100), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    raw_dataset_path: Mapped[str] = mapped_column(String, nullable=False)
    cleaned_dataset_path: Mapped[str | None] = mapped_column(String, nullable=True)

    x_train_path: Mapped[str | None] = mapped_column(String, nullable=True)
    x_cv_path: Mapped[str | None] = mapped_column(String, nullable=True)
    x_test_path: Mapped[str | None] = mapped_column(String, nullable=True)

    y_train_path: Mapped[str | None] = mapped_column(String, nullable=True)
    y_cv_path: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    y_test_path: Mapped[str | None] = mapped_column(String, nullable=True, default=None)

    preprocessor_path: Mapped[str | None] = mapped_column(String, nullable=True, default=None)

    raw_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True, default=None)
    cleaned_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True, default=None)
    engineered_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True, default=None)

    status: Mapped[str] = mapped_column(String, nullable=False) # while updating the status, i'll use enum
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    user: Mapped[User] = relationship(back_populates="projects")
    training_runs: Mapped[list[TrainingRun]] = relationship(back_populates="project", cascade='all, delete-orphan')

class TrainingRun(Base):
    __tablename__ = "training_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)

    algorithm: Mapped[str] = mapped_column(String, nullable=False) # i'll use enum
    model_path: Mapped[str] = mapped_column(String, nullable=False) # i'll save using joblib
    hyperparameters: Mapped[dict] = mapped_column(JSON, nullable=False)
    metrics: Mapped[dict] = mapped_column(JSON, nullable=False)

    project: Mapped[Project] = relationship(back_populates="training_runs")

    status: Mapped[str] = mapped_column(String, nullable=False) # while updating the status, i'll use enum
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
