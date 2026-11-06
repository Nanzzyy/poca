from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.models.user import User
from src.repositories.user_repo import UserRepository
from src.services.audit_service import log_audit


class UserService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def admin_list(self, q: str, page: int, size: int) -> dict:
        rows, total = await self.repo.search(q, page, size)
        return {
            "items": [
                {
                    "id": str(u.id), "email": u.email, "username": u.username, "role": u.role,
                    "is_verified": u.is_verified, "is_active": u.is_active,
                    "created_at": u.created_at.isoformat(),
                }
                for u in rows
            ],
            "total": total, "page": page, "size": size,
        }

    async def admin_update(
        self, user_id: str, *, actor: User,
        role: str | None, is_active: bool | None, is_verified: bool | None,
        ip_address: str | None, user_agent: str,
    ) -> None:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        # Lockout guard — an admin can't demote or deactivate themselves.
        if str(user.id) == str(actor.id):
            if role is not None and role != "admin":
                raise PermissionError("You cannot remove your own admin role")
            if is_active is False:
                raise PermissionError("You cannot deactivate your own account")

        if role is not None:
            if role != user.role:
                await log_audit(
                    action="role_change", actor_id=actor.id, target_type="user",
                    target_id=str(user.id), ip_address=ip_address, user_agent=user_agent,
                    meta={"from": user.role, "to": role},
                )
            user.role = role
        if is_active is not None:
            if is_active is False and user.is_active:
                await log_audit(
                    action="user_deactivate", actor_id=actor.id, target_type="user",
                    target_id=str(user.id), ip_address=ip_address, user_agent=user_agent,
                )
            user.is_active = is_active
        if is_verified is not None:
            user.is_verified = is_verified

        await self.repo.db.flush()

    async def set_verified(self, user_id: str, verified: bool) -> User:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        user.is_verified = verified
        await self.repo.db.flush()
        return user
