from typing import Annotated
from datetime import datetime, UTC, timedelta

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

# Image processing stuff
from PIL import UnidentifiedImageError
from image_utils import process_profile_image, delete_profile_image
from starlette.concurrency import run_in_threadpool # This here is for like async stuff

from schemas import UserCreate, UserPrivate, UserPublic, UserUpdate, Token

from auth import hash_password, verify_password, create_access_token, CurrentUser
from config import settings
import models

router = APIRouter()

@router.post("", response_model=UserPrivate)
async def create_user(user_data: UserCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(models.User).where(func.lower(models.User.username) == user_data.username.lower()))
    existing_username = result.scalars().first()

    if existing_username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User with username already exists")
    
    result = await db.execute(select(models.User).where(func.lower(models.User.email) == user_data.email.lower()))
    existing_email = result.scalars().first()

    if existing_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User with username already exists")
    
    new_user = models.User(
        username = user_data.username,
        email = user_data.email.lower(),
        password_hash = hash_password(user_data.password)
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return new_user

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(models.User).where(func.lower(models.User.email) == form_data.username.lower()))
    user = result.scalars().first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    
    access_token = create_access_token({"sub": str(user.id)}, timedelta(minutes=settings.access_token_expire_minutes))

    return Token(access_token=access_token, token_type="bearer")

@router.get("/me", response_model=UserPrivate)
async def get_current_user(current_user: CurrentUser):
    return current_user

@router.get("/{user_id}", response_model=UserPublic)
async def get_user(user_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    return user

@router.patch("/{user_id}", response_model=UserPrivate)
async def update_user(user_id: int,user_data: UserUpdate, current_user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]):
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to make changes to this user")
    
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not founds")
    
    if user_data.username is not None and user_data.username.lower() != user.username.lower():
        result = await db.execute(select(models.User).where(func.lower(models.User.username) == user_data.username.lower()))
        existing_username = result.scalars().first()

        if existing_username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User with username already exists")
    
    if user_data.email is not None and user_data.email.lower() != user.email.lower():
        result = await db.execute(select(models.User).where(func.lower(models.User.email) == user_data.email.lower()))
        existing_email = result.scalars().first()

        if existing_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User with email already exists")
    
    if user_data.username is not None:
        user.username = user_data.username
    if user_data.email is not None:
        user.email = user_data.email.lower()

    await db.commit()
    await db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int,current_user: CurrentUser, db:Annotated[AsyncSession, Depends(get_db)]):
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You're not authorised to delete this user")
    
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code= status.HTTP_404_NOT_FOUND, detail='user not found')
    
    old_filename = current_user.image_file

    await db.delete(user)
    await db.commit()

    if old_filename:
        delete_profile_image(old_filename)

@router.patch("/{user_id}/picture", response_model=UserPrivate)
async def upload_profile_picture(user_id: int, current_user: CurrentUser, file: UploadFile, db: Annotated[AsyncSession, Depends(get_db)]):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You're not authorised to make changed to this user's profile picture")
    
    content = await file.read()

    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"File too big. Max file size is {settings.max_upload_size_bytes//(1024 * 1024)}MB")
    
    try:
        new_filename = await run_in_threadpool(process_profile_image, content)
    except UnidentifiedImageError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file format. The only supported types are - JPG, PNG, WebP, GIF") from err
    
    old_filename = current_user.image_file
    current_user.image_file = new_filename

    await db.commit()
    await db.refresh(current_user)

    if old_filename:
        delete_profile_image(old_filename)

    return current_user


@router.delete("/{user_id}/picture", response_model=UserPrivate)
async def delete_profile_picture(user_id: int, current_user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You're not authorised to make changed to this user's profile picture")
    
    old_filename = current_user.image_file

    if old_filename is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No Profile Picture to delete")

    current_user.image_file = None

    await db.commit()
    await db.refresh(current_user)

    delete_profile_image(old_filename)
    
    return current_user


