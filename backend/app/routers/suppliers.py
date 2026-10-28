"""Suppliers router (parts vendors, authorized suppliers, and warranty providers)."""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, user_permissions
from app.models import Supplier, User
from app.schemas import Page, SupplierIn, SupplierOut
from app.services import audit

router = APIRouter(prefix="/api/v1/suppliers", tags=["Suppliers"])


def _has(perms: set[str], code: str) -> bool:
    return "*" in perms or code in perms


@router.get("", response_model=Page[SupplierOut])
def list_suppliers(
    q: Optional[str] = None,
    category: Optional[str] = None,
    active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Supplier)
    if active is not None:
        stmt = stmt.where(Supplier.is_active.is_(active))
    if category:
        stmt = stmt.where(Supplier.supplied_categories.ilike(f"%{category.strip()}%"))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Supplier.name.ilike(like),
                Supplier.contact_person.ilike(like),
                Supplier.phone.ilike(like),
                Supplier.email.ilike(like),
                Supplier.supplied_categories.ilike(like),
            )
        )

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(Supplier.name).offset((page - 1) * page_size).limit(page_size)
    ).all()

    return Page(
        items=[SupplierOut.model_validate(s) for s in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{sid}", response_model=SupplierOut)
def get_supplier(
    sid: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.get(Supplier, sid)
    if not s:
        raise HTTPException(404, "Supplier not found")
    return SupplierOut.model_validate(s)


@router.post("", response_model=SupplierOut, status_code=201)
def create_supplier(
    body: SupplierIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "suppliers.manage") and not _has(perms, "branches.manage"):
        raise HTTPException(403, "You do not have permission to manage suppliers")

    s = Supplier(
        name=body.name.strip(),
        contact_person=body.contact_person,
        phone=body.phone,
        email=body.email,
        address=body.address,
        supplied_categories=body.supplied_categories,
        rating=body.rating,
        notes=body.notes,
        is_active=body.is_active,
    )
    db.add(s)
    db.flush()
    audit(db, user, "create", "supplier", str(s.id), s.name)
    db.commit()
    db.refresh(s)
    return SupplierOut.model_validate(s)


@router.put("/{sid}", response_model=SupplierOut)
def update_supplier(
    sid: int,
    body: SupplierIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "suppliers.manage") and not _has(perms, "branches.manage"):
        raise HTTPException(403, "You do not have permission to manage suppliers")

    s = db.get(Supplier, sid)
    if not s:
        raise HTTPException(404, "Supplier not found")

    s.name = body.name.strip()
    s.contact_person = body.contact_person
    s.phone = body.phone
    s.email = body.email
    s.address = body.address
    s.supplied_categories = body.supplied_categories
    s.rating = body.rating
    s.notes = body.notes
    s.is_active = body.is_active

    audit(db, user, "update", "supplier", str(s.id), s.name)
    db.commit()
    db.refresh(s)
    return SupplierOut.model_validate(s)


@router.delete("/{sid}", status_code=204)
def delete_supplier(
    sid: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "suppliers.manage") and not _has(perms, "branches.manage"):
        raise HTTPException(403, "You do not have permission to delete suppliers")

    s = db.get(Supplier, sid)
    if not s:
        raise HTTPException(404, "Supplier not found")

    audit(db, user, "delete", "supplier", str(s.id), s.name)
    db.delete(s)
    db.commit()
