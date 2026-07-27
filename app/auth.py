from typing import Annotated
from datetime import timedelta, datetime, UTC
import secrets
import hashlib

from pwdlib import PasswordHash
from fastapi.security import OAuth2PasswordBearer
from fastapi import HTTPException, status, Depends
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import models

import jwt

from config import settings

oauth2_schema = OAuth2PasswordBearer(tokenUrl="api/users/token")

hasher = PasswordHash.recommended()

def hash_password(plain_password: str) -> str:
    return hasher.hash(plain_password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hasher.verify(plain_password, hashed_password)

def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)

def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def create_access_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()

    if expires_delta:
        expires = datetime.now(UTC) + expires_delta
    else:
        expires = datetime.now(UTC) + timedelta(minutes = settings.access_token_expire_minutes)

    to_encode.update({"exp": expires})

    access_token = jwt.encode(
        to_encode,
        settings.secret_key.get_secret_value(),
        settings.algorithm,
    )

    return access_token

def verify_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key.get_secret_value(),
            algorithms=[settings.algorithm],
            options={"require": ["sub", "exp"]}
        )
    except jwt.InvalidTokenError:
        return None
    else:
        return payload.get("sub")
    
async def get_current_user(token: Annotated[str, Depends(oauth2_schema)], db: Annotated[AsyncSession, Depends(get_db)]) -> models.User:
    user_id = verify_access_token(token)

    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    
    try:
        user_id_int = int(user_id)
    except(ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})

    result = await db.execute(select(models.User).where(models.User.id == user_id_int))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})

    return user

CurrentUser = Annotated[models.User, Depends(get_current_user)]

async def get_current_project(project_id: int, current_user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]) -> models.Project:
    result = await db.execute(select(models.Project).where(models.Project.id == project_id, models.Project.user_id == current_user.id))
    project = result.scalars().first()

    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="project not found")
    
    return project

CurrentProject = Annotated[models.Project, Depends(get_current_project)]