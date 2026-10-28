"""Shared FastAPI dependencies: auth, role guards, pagination."""
from __future__ import annotations

from typing import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models import User

bearer = HTTPBearer(auto_error=False)

# Built-in role keys (custom roles can be added from the RBAC screen)
ROLES = ("admin", "manager", "storekeeper", "technician", "accountant")
ALL = ROLES
ADMIN = ("admin",)
MANAGEMENT = ("admin", "manager")


def can_see_cost(user: User, db: Session | None = None) -> bool:
    """Part prices / labour / invoice totals are visible to anyone holding `tickets.cost`."""
    if user.role == "admin":
        return True
    if db is None:
        return user.role in ("manager", "accountant")
    from app.rbac_service import get_user_effective_permissions
    perms = get_user_effective_permissions(user, db)
    return "*" in perms or "tickets.cost" in perms


def user_permissions(user: User, db: Session) -> set[str]:
    from app.rbac_service import get_user_effective_permissions
    return get_user_effective_permissions(user, db)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    exc = HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated", headers={"WWW-Authenticate": "Bearer"})
    if creds is None:
        raise exc
    try:
        payload = decode_token(creds.credentials)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise exc
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise exc
    return user


def require_roles(*roles: str) -> Callable[[User], User]:
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to perform this action")
        return user

    return checker


def require_permission(*codes: str) -> Callable[[User, Session], User]:
    def checker(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        if user.role == "admin":
            return user
        from app.rbac_service import get_user_effective_permissions
        perms = get_user_effective_permissions(user, db)
        if "*" in perms or any(c in perms for c in codes):
            return user
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Access denied: this action requires one of permissions {list(codes)}"
        )

    return checker
