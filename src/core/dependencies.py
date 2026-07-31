import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.domain.models.user import User

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Get current user from JWT token. Returns None if no token provided."""
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id: str = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None

    from src.repositories.user_repo import UserRepository

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        return None

    repo = UserRepository(db)
    user = await repo.get_by_id(str(user_uuid))
    return user


async def require_user(
    user: User | None = Depends(get_current_user),
) -> User:
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return user


async def require_admin(
    user: User = Depends(require_user),
) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
