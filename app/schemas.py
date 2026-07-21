from pydantic import BaseModel, Field, ConfigDict, EmailStr
from datetime import datetime
from typing import Any
from config import settings

class UserBase(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    email: EmailStr = Field(max_length=120)

class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=1, max_length=50)
    email: EmailStr | None = Field(default=None, max_length=120)

class UserCreate(UserBase):
    password: str = Field(min_length=8)

class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    image_file: str | None
    image_path: str

class UserPrivate(UserPublic):
    email: EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str



# ==============================
# Project related schemas
# ==============================

class ProjectPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_name: str
    status: str

    raw_dataset_path: str

    created_at: datetime
    updated_at: datetime

class MetadataResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rows: int
    columns: int
    column_names: list[str]
    dtypes: dict[str, str]
    missing_values: dict[str, int]
    memory_bytes: int

    cleaning_summary: dict | None = Field(default=None)

class PreviewRowsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    x_rows: list[dict[str, Any]] | None = None
    y_rows: list[dict[str, Any]] | None = None

    rows: list[dict[str, Any]] | None = None

class CleaningRequest(BaseModel):
    droppable_columns : list[str] = []

class FeatureEngineeringRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    target_column: str

    train_split: int = settings.train_split
    cv_split: int = settings.cv_split
    test_split: int = settings.test_split

class SplitMetadata(BaseModel):
    x_rows: int
    x_columns: int
    y_rows: int

class FeatureEngineeringResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    target_column: str

    train: SplitMetadata
    cv: SplitMetadata
    test: SplitMetadata

    scaled_columns: list[str]

    encoded_columns: list[str]

    feature_names_after_encoding: list[str]
    number_of_features_after_encoding: int