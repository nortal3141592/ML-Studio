from pydantic import BaseModel, Field, ConfigDict, EmailStr
from datetime import datetime
from typing import Any

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
# Project related endpoints
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

class PreviewRowsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rows: list[dict[str, Any]]