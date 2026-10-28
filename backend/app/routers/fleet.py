"""Fleet router: Buses registry, Branches/Depots, Part Catalog suggestions, and Bus Parts History."""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import ADMIN, get_current_user, require_roles, user_permissions
from app.models import Branch, Bus, PartCatalog, PartHistory, Ticket, User
from app.schemas import BranchIn, BusIn, Page
from app.services import audit

router = APIRouter(prefix="/api/v1", tags=["Fleet & Branches"])


def _has(perms: set[str], code: str) -> bool:
    return "*" in perms or code in perms


# ── Branches / Depots ────────────────────────────────────────────────────────
@router.get("/branches")
def list_branches(
    q: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Branch)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Branch.name.ilike(like), Branch.code.ilike(like), Branch.city.ilike(like)))
    rows = db.scalars(stmt.order_by(Branch.name)).all()
    out = []
    for b in rows:
        bus_count = db.scalar(select(func.count(Bus.id)).where(Bus.branch_id == b.id)) or 0
        out.append({
            "id": b.id,
            "name": b.name,
            "code": b.code,
            "city": b.city,
            "address": b.address,
            "phone": b.phone,
            "is_active": b.is_active,
            "bus_count": bus_count,
        })
    return out


@router.post("/branches", status_code=201)
def create_branch(
    body: BranchIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "branches.manage"):
        raise HTTPException(403, "You do not have permission to manage branches")
    if db.scalar(select(Branch.id).where(func.lower(Branch.code) == body.code.strip().lower())):
        raise HTTPException(409, f"Branch code '{body.code}' already exists")

    b = Branch(
        name=body.name.strip(),
        code=body.code.strip().upper(),
        city=body.city,
        address=body.address,
        phone=body.phone,
        is_active=body.is_active,
    )
    db.add(b)
    db.flush()
    audit(db, user, "create", "branch", b.id, b.code)
    db.commit()
    return {"id": b.id, "name": b.name, "code": b.code}


@router.put("/branches/{branch_id}")
def update_branch(
    branch_id: int,
    body: BranchIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "branches.manage"):
        raise HTTPException(403, "You do not have permission to manage branches")
    b = db.get(Branch, branch_id)
    if not b:
        raise HTTPException(404, "Branch not found")

    clash = db.scalar(
        select(Branch.id).where(
            func.lower(Branch.code) == body.code.strip().lower(),
            Branch.id != branch_id,
        )
    )
    if clash:
        raise HTTPException(409, f"Branch code '{body.code}' already exists")

    b.name = body.name.strip()
    b.code = body.code.strip().upper()
    b.city = body.city
    b.address = body.address
    b.phone = body.phone
    b.is_active = body.is_active
    audit(db, user, "update", "branch", b.id, b.code)
    db.commit()
    return {"id": b.id, "name": b.name, "code": b.code}


# ── Bus Fleet Registry ───────────────────────────────────────────────────────
@router.get("/fleet/buses")
def list_buses(
    q: Optional[str] = None,
    branch_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "fleet.view"):
        raise HTTPException(403, "You do not have permission to view fleet")

    stmt = select(Bus)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Bus.bus_no.ilike(like), Bus.name.ilike(like), Bus.route.ilike(like)))
    if branch_id:
        stmt = stmt.where(Bus.branch_id == branch_id)
    if status:
        stmt = stmt.where(Bus.status == status)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Bus.bus_no).offset((page - 1) * page_size).limit(page_size)).all()

    items = []
    for b in rows:
        ticket_count = db.scalar(select(func.count(Ticket.id)).where(Ticket.bus_id == b.id)) or 0
        items.append({
            "id": b.id,
            "bus_no": b.bus_no,
            "name": b.name,
            "make_model": b.make_model,
            "route": b.route,
            "branch_id": b.branch_id,
            "branch": {"id": b.branch.id, "name": b.branch.name, "code": b.branch.code} if b.branch else None,
            "odometer_km": b.odometer_km,
            "status": b.status,
            "notes": b.notes,
            "tickets_count": ticket_count,
        })
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/fleet/buses/{bus_id}")
def get_bus(
    bus_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "fleet.view"):
        raise HTTPException(403, "You do not have permission to view fleet")
    b = db.get(Bus, bus_id)
    if not b:
        raise HTTPException(404, "Bus not found")

    tickets = db.scalars(
        select(Ticket).where(Ticket.bus_id == bus_id).order_by(Ticket.id.desc()).limit(15)
    ).all()
    history = db.scalars(
        select(PartHistory).where(PartHistory.bus_id == bus_id).order_by(PartHistory.on_date.desc(), PartHistory.id.desc()).limit(30)
    ).all()

    return {
        "id": b.id,
        "bus_no": b.bus_no,
        "name": b.name,
        "make_model": b.make_model,
        "route": b.route,
        "branch_id": b.branch_id,
        "branch": {"id": b.branch.id, "name": b.branch.name, "code": b.branch.code} if b.branch else None,
        "odometer_km": b.odometer_km,
        "status": b.status,
        "notes": b.notes,
        "recent_tickets": [
            {
                "id": t.id,
                "ticket_no": t.ticket_no,
                "type": t.type,
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "created_at": t.created_at,
            }
            for t in tickets
        ],
        "parts_history": [
            {
                "id": h.id,
                "part_name": h.part_name,
                "action": h.action,
                "qty": h.qty,
                "odometer_km": h.odometer_km,
                "on_date": h.on_date,
                "counterpart_bus_no": h.counterpart_bus_no,
                "note": h.note,
                "ticket_id": h.ticket_id,
            }
            for h in history
        ],
    }


@router.post("/fleet/buses", status_code=201)
def create_bus(
    body: BusIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "fleet.create"):
        raise HTTPException(403, "You do not have permission to add buses")

    if db.scalar(select(Bus.id).where(func.lower(Bus.bus_no) == body.bus_no.strip().lower())):
        raise HTTPException(409, f"Bus registration number '{body.bus_no}' already exists")

    bus = Bus(
        bus_no=body.bus_no.strip().upper(),
        name=body.name,
        make_model=body.make_model,
        route=body.route,
        branch_id=body.branch_id,
        odometer_km=body.odometer_km or 0,
        status=body.status or "ACTIVE",
        notes=body.notes,
    )
    db.add(bus)
    db.flush()
    audit(db, user, "create", "bus", bus.id, bus.bus_no)
    db.commit()
    return {"id": bus.id, "bus_no": bus.bus_no}


@router.put("/fleet/buses/{bus_id}")
def update_bus(
    bus_id: int,
    body: BusIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "fleet.edit"):
        raise HTTPException(403, "You do not have permission to edit buses")
    b = db.get(Bus, bus_id)
    if not b:
        raise HTTPException(404, "Bus not found")

    clash = db.scalar(
        select(Bus.id).where(
            func.lower(Bus.bus_no) == body.bus_no.strip().lower(),
            Bus.id != bus_id,
        )
    )
    if clash:
        raise HTTPException(409, f"Bus number '{body.bus_no}' already exists")

    b.bus_no = body.bus_no.strip().upper()
    b.name = body.name
    b.make_model = body.make_model
    b.route = body.route
    b.branch_id = body.branch_id
    if body.odometer_km is not None:
        b.odometer_km = body.odometer_km
    if body.status:
        b.status = body.status
    b.notes = body.notes
    audit(db, user, "update", "bus", b.id, b.bus_no)
    db.commit()
    return {"id": b.id, "bus_no": b.bus_no}


@router.delete("/fleet/buses/{bus_id}", status_code=204)
def delete_bus(
    bus_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "fleet.delete"):
        raise HTTPException(403, "You do not have permission to delete buses")
    b = db.get(Bus, bus_id)
    if not b:
        raise HTTPException(404, "Bus not found")

    t_count = db.scalar(select(func.count(Ticket.id)).where(Ticket.bus_id == bus_id)) or 0
    if t_count > 0:
        raise HTTPException(400, f"Cannot delete bus {b.bus_no}: {t_count} ticket(s) are linked to it.")

    audit(db, user, "delete", "bus", b.id, b.bus_no)
    db.delete(b)
    db.commit()


# ── Part Catalog Suggestions ────────────────────────────────────────────────
@router.get("/fleet/parts-catalog")
def list_part_catalog(
    q: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Suggestions helper for ticket part name fields and life metrics."""
    stmt = select(PartCatalog).where(PartCatalog.is_active.is_(True))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(PartCatalog.name.ilike(like), PartCatalog.name_bn.ilike(like)))
    if category:
        stmt = stmt.where(PartCatalog.category == category)
    rows = db.scalars(stmt.order_by(PartCatalog.name).limit(100)).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "name_bn": p.name_bn,
            "category": p.category,
            "unit": p.unit,
            "life_km": p.life_km,
            "life_days": p.life_days,
        }
        for p in rows
    ]


# ── Bus Parts History (Log Book) ─────────────────────────────────────────────
@router.get("/fleet/history")
def list_parts_history(
    bus_id: Optional[int] = None,
    part_name: Optional[str] = None,
    action: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Per-bus / fleet-wide parts log book."""
    perms = user_permissions(user, db)
    if not _has(perms, "fleet.view"):
        raise HTTPException(403, "You do not have permission to view fleet history")

    stmt = select(PartHistory)
    if bus_id:
        stmt = stmt.where(PartHistory.bus_id == bus_id)
    if part_name:
        stmt = stmt.where(PartHistory.part_name.ilike(f"%{part_name.strip()}%"))
    if action:
        stmt = stmt.where(PartHistory.action == action)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(PartHistory.on_date.desc(), PartHistory.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()

    # Enrich with bus number
    buses_map = {b.id: b.bus_no for b in db.scalars(select(Bus)).all()}
    items = []
    for h in rows:
        items.append({
            "id": h.id,
            "bus_id": h.bus_id,
            "bus_no": buses_map.get(h.bus_id, f"Bus #{h.bus_id}"),
            "part_name": h.part_name,
            "action": h.action,
            "qty": h.qty,
            "odometer_km": h.odometer_km,
            "on_date": h.on_date,
            "ticket_id": h.ticket_id,
            "counterpart_bus_no": h.counterpart_bus_no,
            "note": h.note,
        })
    return Page(items=items, total=total, page=page, page_size=page_size)
