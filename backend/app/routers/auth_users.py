"""Auth, profile, users, settings, audit."""
from __future__ import annotations

import time
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.deps import ADMIN, get_current_user, require_roles
from app.models import AuditLog, User
from app.rbac_service import get_user_effective_permissions
from app.schemas import (
    AdminPasswordResetIn, AuditOut, ChangePasswordIn, LoginIn, LoginOut, Page, ProfileUpdate, SettingsIn, SettingsOut, UserCreate,
    UserOut, UserUpdate,
)
from app.services import audit, get_settings, save_settings, save_upload, IMAGE_EXT

auth_router = APIRouter(prefix="/api/auth", tags=["Auth"])
users_router = APIRouter(prefix="/api/v1/users", tags=["Users"])
settings_router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])
audit_router = APIRouter(prefix="/api/v1/audit", tags=["Audit"])

# ── naive in-memory brute-force protection (per username+ip) ─────────────────
_FAILS: dict[str, list[float]] = {}
_MAX_FAILS, _WINDOW = 6, 300


def _throttle_key(request: Request, username: str) -> str:
    ip = request.client.host if request.client else "?"
    return f"{ip}|{username.lower()}"


def _check_throttle(key: str) -> None:
    now = time.time()
    hits = [t for t in _FAILS.get(key, []) if now - t < _WINDOW]
    _FAILS[key] = hits
    if len(hits) >= _MAX_FAILS:
        raise HTTPException(429, "Too many failed attempts. Try again in a few minutes.")


def _enrich_user_out(user: User, db: Session) -> UserOut:
    out = UserOut.model_validate(user)
    out.permissions = list(get_user_effective_permissions(user, db))
    return out


@auth_router.post("/login", response_model=LoginOut)
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    ident = body.username.strip()
    key = _throttle_key(request, ident)
    _check_throttle(key)
    user = db.scalar(select(User).where(or_(func.lower(User.username) == ident.lower(), func.lower(User.email) == ident.lower())))
    if not user or not verify_password(body.password, user.password_hash):
        _FAILS.setdefault(key, []).append(time.time())
        raise HTTPException(401, "Invalid username or password")
    if not user.is_active:
        raise HTTPException(403, "This account has been disabled. Contact the administrator.")
    _FAILS.pop(key, None)
    user.last_login_at = datetime.utcnow()
    audit(db, user, "login", "user", user.id)
    db.commit()
    user_out = _enrich_user_out(user, db)
    return LoginOut(token=create_access_token(user.id, user.role), user=user_out)


@auth_router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _enrich_user_out(user, db)


@auth_router.put("/me", response_model=UserOut)
def update_profile(body: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = body.model_dump(exclude_unset=True)
    if "email" in data and data["email"]:
        clash = db.scalar(select(User.id).where(func.lower(User.email) == data["email"].lower(), User.id != user.id))
        if clash:
            raise HTTPException(409, "Email already in use")
    for k, v in data.items():
        setattr(user, k, v)
    db.commit()
    return user


@auth_router.post("/change-password")
def change_password(body: ChangePasswordIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    user.password_hash = hash_password(body.new_password)
    audit(db, user, "change_password", "user", user.id)
    db.commit()
    return {"ok": True}


# ── Users (admin) ────────────────────────────────────────────────────────────
@users_router.get("", response_model=List[UserOut])
def list_users(_: User = Depends(require_roles(*ADMIN)), db: Session = Depends(get_db)):
    users = db.scalars(select(User).order_by(User.created_at.desc())).all()
    return [_enrich_user_out(u, db) for u in users]


@users_router.post("", response_model=UserOut, status_code=201)
def create_user(body: UserCreate, actor: User = Depends(require_roles(*ADMIN)), db: Session = Depends(get_db)):
    if db.scalar(select(User.id).where(func.lower(User.username) == body.username.lower())):
        raise HTTPException(409, "Username already exists")
    if body.email and db.scalar(select(User.id).where(func.lower(User.email) == body.email.lower())):
        raise HTTPException(409, "Email already in use")
    
    # Match role_id
    from app.models import Role
    matched_role = db.scalar(select(Role).where(Role.key == body.role))
    role_id = matched_role.id if matched_role else None

    user = User(
        name=body.name, username=body.username, email=body.email, phone=body.phone,
        password_hash=hash_password(body.password), role=body.role, role_id=role_id, is_active=body.is_active,
    )
    db.add(user)
    db.flush()
    audit(db, actor, "create", "user", user.id, f"{user.username} ({user.role})")
    db.commit()
    return _enrich_user_out(user, db)


def _active_admin_count(db: Session) -> int:
    return db.scalar(select(func.count(User.id)).where(User.role == "admin", User.is_active.is_(True))) or 0


@users_router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, body: UserUpdate, actor: User = Depends(require_roles(*ADMIN)), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    data = body.model_dump(exclude_unset=True)
    demoting = user.role == "admin" and (data.get("role", "admin") != "admin" or data.get("is_active", True) is False)
    if demoting and _active_admin_count(db) <= 1:
        raise HTTPException(400, "At least one active administrator is required")
    if user.id == actor.id and data.get("is_active") is False:
        raise HTTPException(400, "You cannot deactivate your own account")
    if data.get("email"):
        clash = db.scalar(select(User.id).where(func.lower(User.email) == data["email"].lower(), User.id != user.id))
        if clash:
            raise HTTPException(409, "Email already in use")
    password = data.pop("password", None)
    for k, v in data.items():
        setattr(user, k, v)
    if password:
        user.password_hash = hash_password(password)
    audit(db, actor, "update", "user", user.id, user.username)
    db.commit()
    return user


@users_router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, actor: User = Depends(require_roles(*ADMIN)), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == actor.id:
        raise HTTPException(400, "You cannot delete your own account")
    if user.role == "admin" and _active_admin_count(db) <= 1:
        raise HTTPException(400, "At least one active administrator is required")
    audit(db, actor, "delete", "user", user.id, user.username)
    db.delete(user)
    db.commit()


@users_router.patch("/{user_id}/toggle-status", response_model=UserOut)
def toggle_user_status(
    user_id: int,
    actor: User = Depends(require_roles(*ADMIN)),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == actor.id and user.is_active:
        raise HTTPException(400, "You cannot deactivate your own account")
    if user.role == "admin" and user.is_active and _active_admin_count(db) <= 1:
        raise HTTPException(400, "Cannot deactivate the only active administrator")
    user.is_active = not user.is_active
    audit(db, actor, "toggle_status", "user", user.id, f"Active: {user.is_active}")
    db.commit()
    return user


@users_router.post("/{user_id}/reset-password")
def admin_reset_password(
    user_id: int,
    body: AdminPasswordResetIn,
    actor: User = Depends(require_roles(*ADMIN)),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    user.password_hash = hash_password(body.new_password)
    audit(db, actor, "reset_password", "user", user.id, f"Password reset for {user.username}")
    db.commit()
    return {"ok": True, "message": f"Password reset successfully for {user.username}"}


# ── Settings ─────────────────────────────────────────────────────────────────
@settings_router.get("/public")
def public_settings(db: Session = Depends(get_db)):
    s = get_settings(db)
    return {
        "app_name": s.get("app_name") or s.get("company_name") or "Soudia Parts Ticketing",
        "app_tagline": s.get("app_tagline") or s.get("company_tagline") or "Parts • Tickets • Fleet",
        "company_name": s.get("company_name", "Soudia Paribahan Ltd."),
        "company_tagline": s.get("company_tagline", ""),
        "currency_symbol": s.get("currency_symbol", "৳"),
        "company_logo": s.get("company_logo", ""),
        "active_theme": s.get("active_theme", "ocean"),
    }


@settings_router.get("")
def read_settings(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_settings(db)


@settings_router.put("")
@settings_router.post("")
def write_settings(body: dict, actor: User = Depends(require_roles(*ADMIN)), db: Session = Depends(get_db)):
    result = save_settings(db, body)
    audit(db, actor, "update", "settings")
    db.commit()
    return result


@settings_router.post("/logo")
def upload_logo(file: UploadFile = File(...), actor: User = Depends(require_roles(*ADMIN)), db: Session = Depends(get_db)):
    rel_path, _ = save_upload(file, "logos", allowed=IMAGE_EXT | {".svg"})
    url = f"/uploads/{rel_path}"
    save_settings(db, {"company_logo": url})
    audit(db, actor, "update", "settings", detail=f"Company logo updated: {url}")
    db.commit()
    return {"url": url}


# ── Audit ────────────────────────────────────────────────────────────────────
@audit_router.get("", response_model=Page[AuditOut])
def list_audit(
    q: str | None = None,
    entity: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    _: User = Depends(require_roles(*ADMIN)),
    db: Session = Depends(get_db),
):
    stmt = select(AuditLog)
    if entity:
        stmt = stmt.where(AuditLog.entity == entity)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(AuditLog.user_name.ilike(like), AuditLog.detail.ilike(like), AuditLog.action.ilike(like)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(AuditLog.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return Page(items=[AuditOut.model_validate(r) for r in rows], total=total, page=page, page_size=page_size)
