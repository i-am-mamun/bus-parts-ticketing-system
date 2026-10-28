"""RBAC API Router: Roles CRUD, permission matrix checkboxes, and staff user overrides."""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import ADMIN, get_current_user, require_roles
from app.models import Permission, Role, RolePermission, User
from app.rbac_service import (
    SYSTEM_PERMISSIONS,
    DEFAULT_ROLES,
    ensure_rbac_seeded,
    get_user_effective_permissions,
)

router = APIRouter(prefix="/api/v1/rbac", tags=["RBAC & Permissions"])


# ── Schemas ──────────────────────────────────────────────────────────────────
class RoleCreateIn(BaseModel):
    name: str
    description: Optional[str] = None
    key: Optional[str] = None


class RoleUpdateIn(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class RolePermissionsIn(BaseModel):
    permissionCodes: List[str]


class UserRoleAssignIn(BaseModel):
    roleId: int


class UserPermissionsIn(BaseModel):
    permissionCodes: Optional[List[str]] = None  # None/empty reverts to inheriting role


# ── Role Endpoints ───────────────────────────────────────────────────────────
@router.get("/roles")
def list_roles(
    actor: User = Depends(require_roles(*ADMIN)),
    db: Session = Depends(get_db),
):
    """List all configured roles with permission count and assigned staff count."""
    roles = db.scalars(select(Role).order_by(Role.id)).all()
    out = []
    for r in roles:
        p_count = db.scalar(
            select(func.count(RolePermission.id)).where(RolePermission.role_id == r.id)
        ) or 0
        u_count = db.scalar(
            select(func.count(User.id)).where(User.role_id == r.id)
        ) or 0
        out.append({
            "id": r.id,
            "name": r.name,
            "key": r.key,
            "description": r.description,
            "isSystem": r.is_system,
            "permCount": p_count,
            "userCount": u_count,
            "_count": {
                "rolePermissions": p_count,
                "userAccounts": u_count,
            },
        })
    return out


@router.post("/roles", status_code=status.HTTP_201_CREATED)
def create_role(
    body: RoleCreateIn,
    actor: User = Depends(require_roles(*ADMIN)),
    db: Session = Depends(get_db),
):
    """Create a new custom security role."""
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "Role name is required")

    key = (body.key or name.lower().replace(" ", "_")).strip()
    # Check clashes
    if db.scalar(select(Role.id).where(Role.key == key)):
        raise HTTPException(409, f"A role with key '{key}' already exists")
    if db.scalar(select(Role.id).where(func.lower(Role.name) == name.lower())):
        raise HTTPException(409, f"A role named '{name}' already exists")

    role = Role(
        name=name,
        key=key,
        description=body.description.strip() if body.description else None,
        is_system=False,
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return {
        "id": role.id,
        "name": role.name,
        "key": role.key,
        "description": role.description,
        "isSystem": False,
        "permCount": 0,
        "userCount": 0,
    }


@router.put("/roles/{role_id}")
def update_role(
    role_id: int,
    body: RoleUpdateIn,
    actor: User = Depends(require_roles(*ADMIN)),
    db: Session = Depends(get_db),
):
    """Update role metadata (name, description)."""
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(404, "Role not found")

    if body.name is not None and body.name.strip():
        new_name = body.name.strip()
        clash = db.scalar(
            select(Role.id).where(
                func.lower(Role.name) == new_name.lower(),
                Role.id != role_id,
            )
        )
        if clash:
            raise HTTPException(409, f"Role name '{new_name}' already exists")
        role.name = new_name

    if body.description is not None:
        role.description = body.description.strip() or None

    db.commit()
    return {"updated": True, "id": role.id, "name": role.name}


@router.delete("/roles/{role_id}")
def delete_role(
    role_id: int,
    actor: User = Depends(require_roles(*ADMIN)),
    db: Session = Depends(get_db),
):
    """Delete a custom role. System built-ins and assigned roles cannot be deleted."""
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    if role.is_system or role.key == "admin":
        raise HTTPException(400, "System protected roles cannot be deleted")

    used_count = db.scalar(
        select(func.count(User.id)).where(User.role_id == role_id)
    ) or 0
    if used_count > 0:
        raise HTTPException(
            400, f"Cannot delete role: {used_count} staff user(s) currently assigned"
        )

    db.delete(role)
    db.commit()
    return {"deleted": True, "id": role_id}


@router.get("/roles/{role_id}/permissions")
def get_role_permissions(
    role_id: int,
    actor: User = Depends(require_roles(*ADMIN)),
    db: Session = Depends(get_db),
):
    """Get all granular permission objects assigned to a role."""
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(404, "Role not found")

    perms = db.scalars(
        select(Permission)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .where(RolePermission.role_id == role_id)
        .order_by(Permission.module, Permission.action)
    ).all()

    return [
        {
            "id": str(p.id),
            "code": p.code,
            "module": p.module,
            "action": p.action,
            "description": p.description,
        }
        for p in perms
    ]


@router.put("/roles/{role_id}/permissions")
def update_role_permissions(
    role_id: int,
    body: RolePermissionsIn,
    actor: User = Depends(require_roles(*ADMIN)),
    db: Session = Depends(get_db),
):
    """Update checkbox permissions assigned to a role."""
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(404, "Role not found")

    # Clear existing role permissions
    db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()

    # Find matching permissions
    if body.permissionCodes:
        perms = db.scalars(
            select(Permission).where(Permission.code.in_(body.permissionCodes))
        ).all()
        for p in perms:
            db.add(RolePermission(role_id=role_id, permission_id=p.id))

    db.commit()
    return {"updated": True, "roleId": role_id, "permCount": len(body.permissionCodes)}


# ── Permission Registry ──────────────────────────────────────────────────────
@router.get("/permissions")
def list_all_permissions(
    actor: User = Depends(require_roles(*ADMIN)),
    db: Session = Depends(get_db),
):
    """Get all master permissions as a flat list."""
    perms = db.scalars(
        select(Permission).order_by(Permission.module, Permission.action)
    ).all()
    return [
        {
            "id": str(p.id),
            "code": p.code,
            "module": p.module,
            "action": p.action,
            "description": p.description,
        }
        for p in perms
    ]


@router.get("/permissions/modules")
def get_permissions_by_module(
    actor: User = Depends(require_roles(*ADMIN)),
    db: Session = Depends(get_db),
):
    """Get all master permissions grouped by module."""
    perms = db.scalars(
        select(Permission).order_by(Permission.module, Permission.action)
    ).all()
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for p in perms:
        grouped.setdefault(p.module, []).append({
            "id": str(p.id),
            "code": p.code,
            "module": p.module,
            "action": p.action,
            "description": p.description,
        })
    return grouped


# ── Staff User RBAC Endpoints ────────────────────────────────────────────────
@router.get("/users")
def list_rbac_users(
    actor: User = Depends(require_roles(*ADMIN)),
    db: Session = Depends(get_db),
):
    """List all staff users with their assigned role and effective permissions."""
    users = db.scalars(select(User).order_by(User.id)).all()
    out = []
    for u in users:
        role_name = "Unassigned"
        role_key = u.role or ""
        is_system = False
        if u.role_id:
            r = db.get(Role, u.role_id)
            if r:
                role_name = r.name
                role_key = r.key
                is_system = r.is_system
        elif u.role:
            r = db.scalar(select(Role).where(Role.key == u.role))
            if r:
                role_name = r.name
                is_system = r.is_system

        effective_perms = get_user_effective_permissions(u, db)
        has_custom = bool(u.custom_permissions and u.custom_permissions.strip() != "[]")

        out.append({
            "id": str(u.id),
            "name": u.name,
            "username": u.username,
            "email": u.email or "",
            "phone": u.phone or "",
            "status": "ACTIVE" if u.is_active else "INACTIVE",
            "roleId": str(u.role_id) if u.role_id else "",
            "roleKey": role_key,
            "roleName": role_name,
            "isSystemRole": is_system,
            "hasCustomPermissions": has_custom,
            "permCount": len(effective_perms),
            "role": {
                "id": str(u.role_id) if u.role_id else "",
                "name": role_name,
                "isSystem": is_system,
            },
        })
    return out


@router.put("/users/{user_id}/role")
def assign_user_role(
    user_id: int,
    body: UserRoleAssignIn,
    actor: User = Depends(require_roles(*ADMIN)),
    db: Session = Depends(get_db),
):
    """Assign a role to a staff member."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")

    role = db.get(Role, body.roleId)
    if not role:
        raise HTTPException(404, "Target role not found")

    # Protection: Cannot demote the last active admin
    if user.role == "admin" and role.key != "admin":
        active_admins = db.scalar(
            select(func.count(User.id)).where(User.role == "admin", User.is_active.is_(True))
        ) or 0
        if active_admins <= 1:
            raise HTTPException(400, "Cannot change role of the last active administrator")

    user.role_id = role.id
    user.role = role.key
    db.commit()
    return {"updated": True, "userId": user.id, "roleName": role.name, "roleKey": role.key}


@router.get("/users/{user_id}/permissions")
def get_user_permissions(
    user_id: int,
    actor: User = Depends(require_roles(*ADMIN)),
    db: Session = Depends(get_db),
):
    """Get the effective, role-inherited, and direct custom checkbox permissions for a user."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")

    role_codes: List[str] = []
    if user.role_id:
        role_codes = list(db.scalars(
            select(Permission.code)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .where(RolePermission.role_id == user.role_id)
        ).all())

    custom_codes: Optional[List[str]] = None
    if user.custom_permissions:
        try:
            parsed = json.loads(user.custom_permissions)
            if isinstance(parsed, list):
                custom_codes = parsed
        except Exception:
            pass

    effective = list(get_user_effective_permissions(user, db))

    return {
        "userId": str(user.id),
        "userName": user.name,
        "roleId": str(user.role_id) if user.role_id else "",
        "roleKey": user.role,
        "rolePermissions": role_codes,
        "customPermissions": custom_codes,
        "effectivePermissions": effective,
    }


@router.put("/users/{user_id}/permissions")
def update_user_permissions(
    user_id: int,
    body: UserPermissionsIn,
    actor: User = Depends(require_roles(*ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Direct manual checkbox permissions assignment for an individual staff member!
    Fulfills: 'kake kisher permission dibo et aami manually check box e tik diye permission dibo.'
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")

    if body.permissionCodes is None:
        user.custom_permissions = None
    else:
        user.custom_permissions = json.dumps(body.permissionCodes)

    db.commit()
    effective = list(get_user_effective_permissions(user, db))
    return {
        "updated": True,
        "userId": user.id,
        "customCount": len(body.permissionCodes) if body.permissionCodes is not None else None,
        "effectiveCount": len(effective),
    }


@router.post("/seed-defaults")
def seed_defaults(
    actor: User = Depends(require_roles(*ADMIN)),
    db: Session = Depends(get_db),
):
    """Re-sync system permissions and default roles."""
    ensure_rbac_seeded(db)
    return {"seeded": True, "message": "RBAC defaults successfully synchronized"}
