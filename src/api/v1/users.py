from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_db, require_user
from src.core.config import settings
from src.domain.models.user import User
from src.domain.schemas.user import (
    TokenResponse,
    UserCreate,
    UserLogin,
    UserPreferencesUpdate,
    UserResponse,
)
from src.repositories.user_repo import UserRepository

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())
router = APIRouter(tags=["users"])


def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=settings.jwt_expiry_hours)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


@router.post("/auth/register")
async def register(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    repo = UserRepository(db)
    if await repo.get_by_email(body.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    if await repo.get_by_username(body.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

    user = User(
        email=body.email,
        username=body.username,
        hashed_password=hash_password(body.password),
    )
    user = await repo.create(user)
    token = create_token(str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/auth/login")
async def login(
    body: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    repo = UserRepository(db)
    user = await repo.get_by_email(body.email)
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_token(str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/users/me")
async def get_me(
    user: User = Depends(require_user),
) -> UserResponse:
    return UserResponse.model_validate(user)


@router.put("/users/me")
async def update_me(
    body: UserPreferencesUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    user.preferences = body.preferences
    repo = UserRepository(db)
    await repo.update(user)
    return UserResponse.model_validate(user)


@router.put("/users/me/preferences")
async def update_preferences(
    body: UserPreferencesUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    user.preferences = body.preferences
    repo = UserRepository(db)
    await repo.update(user)
    return UserResponse.model_validate(user)
