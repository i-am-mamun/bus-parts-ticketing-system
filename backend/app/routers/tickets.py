"""Ticketing workflow: create → submit → 3-step verification → work → complete → garage-out → close."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.deps import get_current_user, user_permissions
from app.models import (
    Bus, PartCatalog, PartHistory, ReleaseChecklistItem, Ticket, TicketApproval, TicketAttachment,
    TicketEvent, TicketItem, User,
)
from app.schemas import (
    ChecklistToggleIn, CommentIn, CompleteIn, CostIn, GarageOutIn, OverrideIn, Page, RejectIn, TicketIn,
    TicketUpdate,
)
from app.services import (
    DOC_EXT, IMAGE_EXT, audit, delete_file, get_settings, next_gate_pass_no, next_ticket_no, save_upload,
)

router = APIRouter(prefix="/api/v1/tickets", tags=["Tickets"])

# ── Constants ───────────────────────────────────────────────────────────────
TICKET_TYPES = ("PART_REQUEST", "PART_REPLACEMENT", "PART_TRANSFER", "WORK_SHEET", "VEHICLE_RELEASE")
PRIORITIES = ("NORMAL", "URGENT", "EMERGENCY")
REASON_CATEGORIES = (
    "POOR_QUALITY", "DRIVING", "ACCIDENT", "ROAD_CONDITION", "WRONG_INSTALL", "WEAR_TEAR", "BUS_OFF_ROAD", "OTHER",
)
ITEM_TYPES = ("PART_REQUEST", "PART_REPLACEMENT", "PART_TRANSFER", "WORK_SHEET")  # types that carry part lines
CLOSED_STATES = ("CLOSED", "CANCELLED", "REJECTED")

# status -> (pending step, permission needed)
PENDING_STEP = {"SUBMITTED": 1, "VERIFIED": 2, "APPROVED": 3}
STEP_PERM = {1: "tickets.verify", 2: "tickets.approve", 3: "tickets.final_approve"}
STEP_STATUS = {1: "VERIFIED", 2: "APPROVED", 3: "FINAL_APPROVED"}
STEP_LABEL = {1: "Verified", 2: "Approved", 3: "Final approved"}

DEFAULT_CHECKLIST = [
    ("Engine oil & coolant levels checked", "ইঞ্জিন অয়েল ও কুল্যান্ট লেভেল পরীক্ষা করা হয়েছে"),
    ("Brakes tested (service & parking)", "ব্রেক পরীক্ষা করা হয়েছে (সার্ভিস ও পার্কিং)"),
    ("Tyres, pressure & wheel nuts checked", "টায়ার, প্রেসার ও হুইল নাট পরীক্ষা করা হয়েছে"),
    ("Headlights, indicators & brake lights working", "হেডলাইট, ইন্ডিকেটর ও ব্রেক লাইট ঠিক আছে"),
    ("Horn, wipers & mirrors working", "হর্ন, ওয়াইপার ও আয়না ঠিক আছে"),
    ("Battery & electrical system OK", "ব্যাটারি ও ইলেকট্রিক্যাল সিস্টেম ঠিক আছে"),
    ("Steering & suspension OK", "স্টিয়ারিং ও সাসপেনশন ঠিক আছে"),
    ("Seats, windows & doors OK", "সিট, জানালা ও দরজা ঠিক আছে"),
    ("Fire extinguisher & first-aid box in place", "ফায়ার এক্সটিংগুইশার ও ফার্স্ট-এইড বক্স আছে"),
    ("Fitness / route permit documents valid", "ফিটনেস / রুট পারমিট কাগজ বৈধ আছে"),
    ("Bus cleaned & ready for service", "বাস পরিষ্কার ও সার্ভিসের জন্য প্রস্তুত"),
]


# ── Helpers ─────────────────────────────────────────────────────────────────
def _has(perms: set[str], code: str) -> bool:
    return "*" in perms or code in perms


def _log(t: Ticket, event: str, user: Optional[User], detail: Optional[str] = None) -> None:
    t.events.append(TicketEvent(event=event, detail=detail, user_name=user.name if user else None))


def _get_ticket(db: Session, ticket_id: int) -> Ticket:
    t = db.get(Ticket, ticket_id)
    if not t:
        raise HTTPException(404, "Ticket not found")
    return t


def _item_total(t: Ticket) -> float:
    return round(sum((i.qty or 0) * (i.unit_price or 0) for i in t.items), 2)


def _grand_total(t: Ticket) -> float:
    return round(_item_total(t) + (t.labor_cost or 0) + (t.other_cost or 0), 2)


def _pending_step(t: Ticket) -> Optional[int]:
    return PENDING_STEP.get(t.status)


def _status_for_user(perms: set[str], user: User) -> list[str]:
    """Statuses in which this user is expected to act (approval inbox)."""
    out = []
    for status, step in PENDING_STEP.items():
        if _has(perms, STEP_PERM[step]):
            out.append(status)
    return out


def _can(t: Ticket, user: User, perms: set[str]) -> dict:
    is_admin = user.role == "admin"
    owner = t.created_by_id == user.id
    s = t.status
    step = _pending_step(t)
    own_ticket_block = owner and not is_admin  # nobody (except admin) approves their own ticket
    can_step = bool(step and _has(perms, STEP_PERM[step]) and not own_ticket_block)
    return {
        "edit": s in ("DRAFT",) and (owner or is_admin),
        "submit": s == "DRAFT" and (owner or is_admin),
        "delete": (s in ("DRAFT", "CANCELLED") and (owner or is_admin)) or (_has(perms, "tickets.delete") and s in ("DRAFT", "CANCELLED", "REJECTED")),
        "verify": can_step and step == 1,
        "approve": can_step and step == 2,
        "final_approve": can_step and step == 3,
        "reject": bool(step and _has(perms, STEP_PERM[step])) and not own_ticket_block,
        "override": bool(step) and _has(perms, "tickets.override"),
        "reopen": s == "REJECTED" and (owner or is_admin),
        "cancel": s in ("DRAFT", "SUBMITTED", "VERIFIED", "APPROVED", "FINAL_APPROVED", "REJECTED") and (owner or is_admin),
        "start": s == "FINAL_APPROVED" and _has(perms, "tickets.work"),
        "complete": s == "IN_PROGRESS" and _has(perms, "tickets.work"),
        "garage_out": s == "COMPLETED" and bool(t.bus_id) and _has(perms, "tickets.release"),
        "close": (s == "GARAGE_OUT" or (s == "COMPLETED" and t.type != "VEHICLE_RELEASE")) and (_has(perms, "tickets.release") or _has(perms, "tickets.approve")),
        "cost": _has(perms, "tickets.cost") and s not in CLOSED_STATES and s != "DRAFT",
        "checklist": t.type == "VEHICLE_RELEASE" and s in ("FINAL_APPROVED", "IN_PROGRESS", "COMPLETED") and _has(perms, "tickets.release"),
        "attach": s in ("DRAFT", "REJECTED", "SUBMITTED", "VERIFIED", "APPROVED", "FINAL_APPROVED", "IN_PROGRESS") and (_has(perms, "tickets.create") or _has(perms, "tickets.work")),
        "comment": _has(perms, "tickets.view"),
    }


def _bus_brief(b: Optional[Bus]) -> Optional[dict]:
    if not b:
        return None
    return {"id": b.id, "bus_no": b.bus_no, "name": b.name, "route": b.route, "odometer_km": b.odometer_km, "status": b.status}


def _list_row(t: Ticket, show_cost: bool) -> dict:
    return {
        "id": t.id,
        "ticket_no": t.ticket_no,
        "type": t.type,
        "title": t.title,
        "priority": t.priority,
        "status": t.status,
        "bus": _bus_brief(t.bus),
        "to_bus": _bus_brief(t.to_bus),
        "created_by_name": t.created_by_name,
        "created_at": t.created_at,
        "needed_by": t.needed_by,
        "is_premature": t.is_premature,
        "pending_step": _pending_step(t),
        "items_count": len(t.items),
        "images_count": sum(1 for a in t.attachments if a.is_image),
        "total": _grand_total(t) if show_cost else None,
    }


def _detail(t: Ticket, user: User, perms: set[str]) -> dict:
    show_cost = _has(perms, "tickets.cost")
    row = _list_row(t, show_cost)
    items = []
    for i in t.items:
        items.append({
            "id": i.id, "part_name": i.part_name, "part_no": i.part_no, "qty": i.qty, "unit": i.unit,
            "unit_price": i.unit_price if show_cost else None,
            "line_total": round((i.qty or 0) * (i.unit_price or 0), 2) if show_cost else None,
            "remarks": i.remarks, "last_replaced_on": i.last_replaced_on, "last_replaced_km": i.last_replaced_km,
            "used_km": i.used_km, "expected_life_km": i.expected_life_km, "is_premature": i.is_premature,
        })
    row.update({
        "description": t.description,
        "branch": {"id": t.branch.id, "name": t.branch.name, "code": t.branch.code} if t.branch else None,
        "route": t.route, "driver_name": t.driver_name, "odometer_km": t.odometer_km,
        "reason_category": t.reason_category, "reason_text": t.reason_text,
        "labor_cost": t.labor_cost if show_cost else None,
        "other_cost": t.other_cost if show_cost else None,
        "items_total": _item_total(t) if show_cost else None,
        "work_notes": t.work_notes,
        "submitted_at": t.submitted_at, "started_at": t.started_at, "completed_at": t.completed_at,
        "garage_out_at": t.garage_out_at, "garage_out_by": t.garage_out_by, "gate_pass_no": t.gate_pass_no,
        "closed_at": t.closed_at, "reject_reason": t.reject_reason, "rejected_by": t.rejected_by,
        "created_by_id": t.created_by_id,
        "items": items,
        "approvals": [
            {"step": a.step, "status": a.status, "user_name": a.user_name, "comment": a.comment,
             "is_override": a.is_override, "acted_at": a.acted_at}
            for a in t.approvals
        ],
        "attachments": [
            {"id": a.id, "kind": a.kind, "url": f"/uploads/{a.file_path}", "name": a.original_name,
             "is_image": a.is_image, "note": a.note, "uploaded_by": a.uploaded_by, "created_at": a.created_at}
            for a in t.attachments
        ],
        "events": [
            {"id": e.id, "event": e.event, "detail": e.detail, "user_name": e.user_name, "created_at": e.created_at}
            for e in t.events
        ],
        "checklist": [
            {"id": c.id, "label": c.label, "label_bn": c.label_bn, "checked": c.checked,
             "checked_by": c.checked_by, "checked_at": c.checked_at, "note": c.note}
            for c in t.checklist
        ],
        "can": _can(t, user, perms),
    })
    return row


# ── Premature-replacement detection ─────────────────────────────────────────
def _catalog_lookup(db: Session, name: str) -> Optional[PartCatalog]:
    return db.scalar(select(PartCatalog).where(func.lower(PartCatalog.name) == name.strip().lower()))


def last_install(db: Session, bus_id: int, part_name: str) -> Optional[PartHistory]:
    return db.scalar(
        select(PartHistory)
        .where(
            PartHistory.bus_id == bus_id,
            func.lower(PartHistory.part_name) == part_name.strip().lower(),
            PartHistory.action.in_(("INSTALLED", "REPLACED", "TRANSFER_IN")),
        )
        .order_by(PartHistory.on_date.desc(), PartHistory.id.desc())
    )


def part_life_info(db: Session, bus_id: Optional[int], part_name: str, current_km: Optional[float]) -> dict:
    """Last replacement of this part on this bus + whether a change now would be premature."""
    info = {
        "part_name": part_name, "last_replaced_on": None, "last_replaced_km": None, "used_km": None,
        "days_since": None, "expected_life_km": None, "expected_life_days": None, "is_premature": False,
    }
    cat = _catalog_lookup(db, part_name) if part_name else None
    if cat:
        info["expected_life_km"] = cat.life_km
        info["expected_life_days"] = cat.life_days
    if not bus_id or not part_name:
        return info
    last = last_install(db, bus_id, part_name)
    if not last:
        return info
    info["last_replaced_on"] = last.on_date
    info["last_replaced_km"] = last.odometer_km
    info["days_since"] = (date.today() - last.on_date).days
    if current_km is not None and last.odometer_km is not None and current_km >= last.odometer_km:
        info["used_km"] = round(current_km - last.odometer_km, 1)
    early_km = bool(cat and cat.life_km and info["used_km"] is not None and info["used_km"] < cat.life_km)
    early_days = bool(cat and cat.life_days and info["days_since"] is not None and info["days_since"] < cat.life_days)
    info["is_premature"] = early_km or early_days
    return info


def _apply_item_life(db: Session, t: Ticket) -> None:
    """Fill the 'last replaced / used km / premature' columns and the ticket-level flag."""
    t.is_premature = False
    if t.type != "PART_REPLACEMENT":
        for i in t.items:
            i.is_premature = False
        return
    bus = db.get(Bus, t.bus_id) if t.bus_id else None
    km = t.odometer_km if t.odometer_km is not None else (bus.odometer_km if bus else None)
    for i in t.items:
        info = part_life_info(db, t.bus_id, i.part_name, km)
        i.last_replaced_on = info["last_replaced_on"]
        i.last_replaced_km = info["last_replaced_km"]
        i.used_km = info["used_km"]
        i.expected_life_km = info["expected_life_km"]
        i.is_premature = info["is_premature"]
        if i.is_premature:
            t.is_premature = True


def _validate_for_submit(db: Session, t: Ticket) -> None:
    errors: list[str] = []
    if not t.bus_id:
        errors.append("Select the bus")
    if t.type in ITEM_TYPES and t.type != "WORK_SHEET" and not t.items:
        errors.append("Add at least one part")
    if t.type == "PART_TRANSFER":
        if not t.to_bus_id:
            errors.append("Select the destination bus")
        elif t.to_bus_id == t.bus_id:
            errors.append("Source and destination bus must be different")
        if not t.reason_category:
            errors.append("Select a reason for the transfer")
    if t.type == "PART_REPLACEMENT":
        if not any(a.is_image and a.kind in ("PROBLEM", "OLD_PART") for a in t.attachments):
            errors.append("Attach at least one problem photo of the part")
        if not t.reason_category:
            errors.append("Select why the part is being replaced")
        _apply_item_life(db, t)
        strict = str(get_settings(db).get("premature_strict_mode", "true")).lower() == "true"
        if t.is_premature and strict and not (t.reason_text or "").strip():
            errors.append("This part is being replaced earlier than its normal life — write the reason")
        if t.reason_category == "OTHER" and not (t.reason_text or "").strip():
            errors.append("Write the reason (category 'Other')")
    if errors:
        raise HTTPException(422, "; ".join(errors))


def _sync_items(t: Ticket, items) -> None:
    t.items.clear()
    for it in items:
        t.items.append(TicketItem(
            part_name=it.part_name.strip(), part_no=it.part_no, qty=it.qty, unit=it.unit or "pcs",
            unit_price=it.unit_price, remarks=it.remarks,
        ))


def _check_refs(db: Session, bus_id: Optional[int], to_bus_id: Optional[int]) -> None:
    if bus_id and not db.get(Bus, bus_id):
        raise HTTPException(422, "Selected bus does not exist")
    if to_bus_id and not db.get(Bus, to_bus_id):
        raise HTTPException(422, "Selected destination bus does not exist")


def _ensure_approvals(t: Ticket) -> None:
    existing = {a.step: a for a in t.approvals}
    for step in (1, 2, 3):
        a = existing.get(step)
        if a is None:
            t.approvals.append(TicketApproval(step=step, status="PENDING"))
        else:
            a.status, a.user_id, a.user_name, a.comment, a.is_override, a.acted_at = "PENDING", None, None, None, False, None


# ── List / summary ──────────────────────────────────────────────────────────
def _list_stmt(user: User, perms: set[str], q, type, status, bus_id, priority, mine, pending_me, date_from, date_to, is_premature=None, bus_no=None):
    stmt = select(Ticket).options(selectinload(Ticket.items), selectinload(Ticket.attachments))
    if q or bus_no:
        stmt = stmt.outerjoin(Bus, Ticket.bus_id == Bus.id)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(Ticket.ticket_no.ilike(like), Ticket.title.ilike(like), Bus.bus_no.ilike(like),
                Ticket.created_by_name.ilike(like))
        )
    if bus_no:
        stmt = stmt.where(Bus.bus_no.ilike(f"%{bus_no.strip()}%"))
    if type:
        stmt = stmt.where(Ticket.type == type)
    if status:
        stmt = stmt.where(Ticket.status.in_([s.strip() for s in status.split(",") if s.strip()]))
    if bus_id:
        stmt = stmt.where(or_(Ticket.bus_id == bus_id, Ticket.to_bus_id == bus_id))
    if priority:
        stmt = stmt.where(Ticket.priority == priority)
    if mine:
        stmt = stmt.where(Ticket.created_by_id == user.id)
    if is_premature is not None:
        stmt = stmt.where(Ticket.is_premature == is_premature)
    if pending_me:
        statuses = _status_for_user(perms, user)
        stmt = stmt.where(Ticket.status.in_(statuses or ["__none__"]))
        if user.role != "admin":
            stmt = stmt.where(or_(Ticket.created_by_id != user.id, Ticket.created_by_id.is_(None)))
    if date_from:
        stmt = stmt.where(func.date(Ticket.created_at) >= date_from)
    if date_to:
        stmt = stmt.where(func.date(Ticket.created_at) <= date_to)
    return stmt


@router.get("")
def list_tickets(
    q: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    bus_id: Optional[int] = None,
    bus_no: Optional[str] = None,
    priority: Optional[str] = None,
    mine: bool = False,
    pending_me: bool = False,
    is_premature: Optional[bool] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "tickets.view"):
        raise HTTPException(403, "You do not have permission to view tickets")
    stmt = _list_stmt(user, perms, q, type, status, bus_id, priority, mine, pending_me, date_from, date_to, is_premature, bus_no)
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    rows = db.scalars(stmt.order_by(Ticket.id.desc()).offset((page - 1) * page_size).limit(page_size)).unique().all()
    show_cost = _has(perms, "tickets.cost")
    return Page(items=[_list_row(t, show_cost) for t in rows], total=total, page=page, page_size=page_size)


@router.get("/summary")
def summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    if not _has(perms, "dashboard.view"):
        raise HTTPException(403, "You do not have permission to view the dashboard")
    show_cost = _has(perms, "tickets.cost")
    by_status = dict(db.execute(select(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status)).all())
    by_type = dict(db.execute(select(Ticket.type, func.count(Ticket.id)).group_by(Ticket.type)).all())
    g = lambda *keys: sum(by_status.get(k, 0) for k in keys)  # noqa: E731

    pending_stmt = _list_stmt(user, perms, None, None, None, None, None, False, True, None, None)
    pending_total = db.scalar(select(func.count()).select_from(pending_stmt.order_by(None).subquery())) or 0
    pending_rows = db.scalars(pending_stmt.order_by(Ticket.id.asc()).limit(8)).unique().all()

    recent_rows = db.scalars(
        select(Ticket).options(selectinload(Ticket.items), selectinload(Ticket.attachments)).order_by(Ticket.id.desc()).limit(8)
    ).unique().all()

    premature = db.scalar(select(func.count(Ticket.id)).where(Ticket.is_premature.is_(True), Ticket.status.notin_(("CANCELLED", "REJECTED")))) or 0

    since = date.today() - timedelta(days=13)
    day_rows = dict(db.execute(
        select(func.date(Ticket.created_at), func.count(Ticket.id)).where(func.date(Ticket.created_at) >= since).group_by(func.date(Ticket.created_at))
    ).all())
    daily = []
    for n in range(14):
        d = since + timedelta(days=n)
        daily.append({"date": d.isoformat(), "count": int(day_rows.get(d, day_rows.get(d.isoformat(), 0)))})

    top = db.execute(
        select(Bus.bus_no, func.count(Ticket.id)).join(Ticket, Ticket.bus_id == Bus.id)
        .where(Ticket.status.notin_(("CANCELLED", "REJECTED", "DRAFT"))).group_by(Bus.bus_no)
        .order_by(func.count(Ticket.id).desc()).limit(6)
    ).all()
    top_buses = [{"bus_no": b, "tickets": c, "cost": None} for b, c in top]
    if show_cost:
        for tb in top_buses:
            bus = db.scalar(select(Bus).where(Bus.bus_no == tb["bus_no"]))
            ts = db.scalars(select(Ticket).options(selectinload(Ticket.items)).where(
                Ticket.bus_id == bus.id, Ticket.status.in_(("COMPLETED", "GARAGE_OUT", "CLOSED")))).unique().all()
            tb["cost"] = round(sum(_grand_total(t) for t in ts), 2)

    in_garage = db.scalar(select(func.count(Bus.id)).where(Bus.status == "IN_GARAGE")) or 0
    return {
        "counts": {
            "total": sum(by_status.values()),
            "open": sum(v for k, v in by_status.items() if k not in CLOSED_STATES),
            "draft": g("DRAFT"),
            "pending_approval": g("SUBMITTED", "VERIFIED", "APPROVED"),
            "pending_me": pending_total,
            "approved_waiting": g("FINAL_APPROVED"),
            "in_progress": g("IN_PROGRESS"),
            "completed": g("COMPLETED"),
            "garage_out": g("GARAGE_OUT"),
            "closed": g("CLOSED"),
            "rejected": g("REJECTED"),
            "premature": premature,
            "buses_in_garage": in_garage,
        },
        "by_status": by_status,
        "by_type": by_type,
        "pending_me": [_list_row(t, show_cost) for t in pending_rows],
        "recent": [_list_row(t, show_cost) for t in recent_rows],
        "daily": daily,
        "top_buses": top_buses,
    }


@router.get("/part-life")
def part_life(
    bus_id: int,
    part: str,
    odometer_km: Optional[float] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Live hint while filling a replacement ticket: when was this part last changed on this bus?"""
    bus = db.get(Bus, bus_id)
    if not bus:
        raise HTTPException(404, "Bus not found")
    km = odometer_km if odometer_km is not None else bus.odometer_km
    return part_life_info(db, bus_id, part, km)


# ── CRUD ────────────────────────────────────────────────────────────────────
@router.post("", status_code=201)
def create_ticket(body: TicketIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    if not _has(perms, "tickets.create"):
        raise HTTPException(403, "You do not have permission to create tickets")
    if body.type not in TICKET_TYPES:
        raise HTTPException(422, f"Unknown ticket type. Allowed: {', '.join(TICKET_TYPES)}")
    if body.priority not in PRIORITIES:
        raise HTTPException(422, "Unknown priority")
    if body.reason_category and body.reason_category not in REASON_CATEGORIES:
        raise HTTPException(422, "Unknown reason category")
    _check_refs(db, body.bus_id, body.to_bus_id)
    bus = db.get(Bus, body.bus_id) if body.bus_id else None
    t = Ticket(
        ticket_no=next_ticket_no(db, body.type), type=body.type, title=body.title.strip(), description=body.description,
        priority=body.priority, status="DRAFT", bus_id=body.bus_id, to_bus_id=body.to_bus_id,
        branch_id=body.branch_id or (bus.branch_id if bus else None),
        route=body.route or (bus.route if bus else None), driver_name=body.driver_name,
        odometer_km=body.odometer_km, needed_by=body.needed_by, reason_category=body.reason_category,
        reason_text=body.reason_text, created_by_id=user.id, created_by_name=user.name,
    )
    _sync_items(t, body.items)
    if body.type == "VEHICLE_RELEASE":
        for label, label_bn in DEFAULT_CHECKLIST:
            t.checklist.append(ReleaseChecklistItem(label=label, label_bn=label_bn))
    _apply_item_life(db, t)
    _log(t, "CREATED", user, f"{t.type} ticket created")
    db.add(t)
    db.flush()
    audit(db, user, "create", "ticket", t.id, t.ticket_no)
    db.commit()
    return _detail(t, user, perms)


@router.get("/{ticket_id}")
def get_ticket(ticket_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    if not _has(perms, "tickets.view"):
        raise HTTPException(403, "You do not have permission to view tickets")
    return _detail(_get_ticket(db, ticket_id), user, perms)


@router.put("/{ticket_id}")
def update_ticket(ticket_id: int, body: TicketUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    t = _get_ticket(db, ticket_id)
    if not _can(t, user, perms)["edit"]:
        raise HTTPException(403, "Only the creator can edit a draft ticket")
    data = body.model_dump(exclude_unset=True)
    if "priority" in data and data["priority"] not in PRIORITIES:
        raise HTTPException(422, "Unknown priority")
    if data.get("reason_category") and data["reason_category"] not in REASON_CATEGORIES:
        raise HTTPException(422, "Unknown reason category")
    _check_refs(db, data.get("bus_id"), data.get("to_bus_id"))
    items = data.pop("items", None)
    for k, v in data.items():
        setattr(t, k, v)
    if items is not None:
        _sync_items(t, body.items or [])
    _apply_item_life(db, t)
    _log(t, "UPDATED", user)
    db.commit()
    return _detail(t, user, perms)


@router.delete("/{ticket_id}", status_code=204)
def delete_ticket(ticket_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    t = _get_ticket(db, ticket_id)
    if not _can(t, user, perms)["delete"]:
        raise HTTPException(403, "This ticket cannot be deleted")
    for a in t.attachments:
        delete_file(a.file_path)
    audit(db, user, "delete", "ticket", t.id, t.ticket_no)
    db.delete(t)
    db.commit()


# ── Attachments (problem images / documents) ────────────────────────────────
@router.post("/{ticket_id}/attachments", status_code=201)
def add_attachments(
    ticket_id: int,
    files: List[UploadFile] = File(...),
    kind: str = Form("PROBLEM"),
    note: Optional[str] = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    t = _get_ticket(db, ticket_id)
    if not _can(t, user, perms)["attach"]:
        raise HTTPException(403, "Files cannot be attached to this ticket right now")
    if kind not in ("PROBLEM", "OLD_PART", "DOCUMENT", "OTHER"):
        raise HTTPException(422, "Unknown attachment kind")
    allowed = DOC_EXT if kind in ("DOCUMENT", "OTHER") else IMAGE_EXT
    saved = 0
    for f in files:
        rel, original = save_upload(f, f"tickets/{t.ticket_no}", allowed=allowed)
        ext = "." + original.rsplit(".", 1)[-1].lower() if "." in original else ""
        t.attachments.append(TicketAttachment(
            kind=kind, file_path=rel, original_name=original, is_image=ext in IMAGE_EXT, note=note,
            uploaded_by=user.name,
        ))
        saved += 1
    _log(t, "ATTACHED", user, f"{saved} file(s) — {kind}")
    db.commit()
    return _detail(t, user, perms)


@router.delete("/{ticket_id}/attachments/{attachment_id}")
def remove_attachment(ticket_id: int, attachment_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    t = _get_ticket(db, ticket_id)
    att = next((a for a in t.attachments if a.id == attachment_id), None)
    if not att:
        raise HTTPException(404, "Attachment not found")
    if t.status not in ("DRAFT", "REJECTED") or not (t.created_by_id == user.id or user.role == "admin"):
        raise HTTPException(403, "Attachments can only be removed from your own draft ticket")
    delete_file(att.file_path)
    t.attachments.remove(att)
    _log(t, "ATTACHMENT_REMOVED", user, att.original_name)
    db.commit()
    return _detail(t, user, perms)


# ── Workflow ────────────────────────────────────────────────────────────────
@router.post("/{ticket_id}/submit")
def submit_ticket(ticket_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    t = _get_ticket(db, ticket_id)
    if not _can(t, user, perms)["submit"]:
        raise HTTPException(403, "Only the creator can submit a draft ticket")
    _validate_for_submit(db, t)
    _ensure_approvals(t)
    t.status = "SUBMITTED"
    t.submitted_at = datetime.utcnow()
    t.reject_reason = None
    t.rejected_by = None
    _log(t, "SUBMITTED", user, "Sent for verification" + (" — PREMATURE replacement" if t.is_premature else ""))
    audit(db, user, "submit", "ticket", t.id, t.ticket_no)
    db.commit()
    return _detail(t, user, perms)


def _do_step(db: Session, t: Ticket, user: User, perms: set[str], step: int, comment: Optional[str]) -> dict:
    can = _can(t, user, perms)
    key = {1: "verify", 2: "approve", 3: "final_approve"}[step]
    if _pending_step(t) != step:
        raise HTTPException(409, "This ticket is not waiting for that step")
    if not can[key]:
        if t.created_by_id == user.id and user.role != "admin":
            raise HTTPException(403, "You cannot verify/approve your own ticket")
        raise HTTPException(403, "You do not have permission for this step")
    appr = next(a for a in t.approvals if a.step == step)
    appr.status, appr.user_id, appr.user_name, appr.comment, appr.acted_at = "DONE", user.id, user.name, comment, datetime.utcnow()
    t.status = STEP_STATUS[step]
    _log(t, f"STEP{step}_{STEP_STATUS[step]}", user, comment)
    audit(db, user, STEP_STATUS[step].lower(), "ticket", t.id, t.ticket_no)
    db.commit()
    return _detail(t, user, perms)


@router.post("/{ticket_id}/verify")
def verify(ticket_id: int, body: CommentIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _do_step(db, _get_ticket(db, ticket_id), user, user_permissions(user, db), 1, body.comment)


@router.post("/{ticket_id}/approve")
def approve(ticket_id: int, body: CommentIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _do_step(db, _get_ticket(db, ticket_id), user, user_permissions(user, db), 2, body.comment)


@router.post("/{ticket_id}/final-approve")
def final_approve(ticket_id: int, body: CommentIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _do_step(db, _get_ticket(db, ticket_id), user, user_permissions(user, db), 3, body.comment)


@router.post("/{ticket_id}/reject")
def reject(ticket_id: int, body: RejectIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    t = _get_ticket(db, ticket_id)
    if not _can(t, user, perms)["reject"]:
        raise HTTPException(403, "You cannot reject this ticket")
    step = _pending_step(t)
    appr = next((a for a in t.approvals if a.step == step), None)
    if appr:
        appr.status, appr.user_id, appr.user_name, appr.comment, appr.acted_at = "REJECTED", user.id, user.name, body.reason, datetime.utcnow()
    t.status = "REJECTED"
    t.reject_reason = body.reason
    t.rejected_by = user.name
    _log(t, "REJECTED", user, f"Step {step}: {body.reason}")
    audit(db, user, "reject", "ticket", t.id, t.ticket_no)
    db.commit()
    return _detail(t, user, perms)


@router.post("/{ticket_id}/override")
def override(ticket_id: int, body: OverrideIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Emergency: skip all remaining approval steps. Reason is mandatory and logged."""
    perms = user_permissions(user, db)
    t = _get_ticket(db, ticket_id)
    if not _can(t, user, perms)["override"]:
        raise HTTPException(403, "You cannot override approval steps")
    step = _pending_step(t)
    for a in t.approvals:
        if a.step >= step and a.status == "PENDING":
            a.status, a.user_id, a.user_name, a.comment = "SKIPPED", user.id, user.name, body.reason
            a.is_override, a.acted_at = True, datetime.utcnow()
    t.status = "FINAL_APPROVED"
    _log(t, "OVERRIDE", user, f"Emergency approval (steps {step}–3 skipped): {body.reason}")
    audit(db, user, "override", "ticket", t.id, f"{t.ticket_no}: {body.reason}")
    db.commit()
    return _detail(t, user, perms)


@router.post("/{ticket_id}/reopen")
def reopen(ticket_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    t = _get_ticket(db, ticket_id)
    if not _can(t, user, perms)["reopen"]:
        raise HTTPException(403, "Only the creator can re-open a rejected ticket")
    t.status = "DRAFT"
    for a in t.approvals:
        a.status, a.user_id, a.user_name, a.comment, a.is_override, a.acted_at = "PENDING", None, None, None, False, None
    _log(t, "REOPENED", user, "Re-opened as draft for correction")
    db.commit()
    return _detail(t, user, perms)


@router.post("/{ticket_id}/cancel")
def cancel(ticket_id: int, body: CommentIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    t = _get_ticket(db, ticket_id)
    if not _can(t, user, perms)["cancel"]:
        raise HTTPException(403, "You cannot cancel this ticket")
    t.status = "CANCELLED"
    _log(t, "CANCELLED", user, body.comment)
    audit(db, user, "cancel", "ticket", t.id, t.ticket_no)
    db.commit()
    return _detail(t, user, perms)


@router.post("/{ticket_id}/comment")
def add_comment(ticket_id: int, body: CommentIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    t = _get_ticket(db, ticket_id)
    if not (body.comment or "").strip():
        raise HTTPException(422, "Comment is empty")
    _log(t, "COMMENT", user, body.comment.strip())
    db.commit()
    return _detail(t, user, perms)


@router.post("/{ticket_id}/start")
def start(ticket_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    t = _get_ticket(db, ticket_id)
    if not _can(t, user, perms)["start"]:
        raise HTTPException(403, "Work can only be started on a fully approved ticket")
    t.status = "IN_PROGRESS"
    t.started_at = datetime.utcnow()
    if t.bus and t.type != "PART_REQUEST":
        t.bus.status = "IN_GARAGE"
    _log(t, "STARTED", user, "Work started")
    db.commit()
    return _detail(t, user, perms)


def _write_history(db: Session, t: Ticket) -> None:
    bus = t.bus
    km = t.odometer_km if t.odometer_km is not None else (bus.odometer_km if bus else None)
    today = date.today()
    if bus and t.odometer_km is not None and t.odometer_km > (bus.odometer_km or 0):
        bus.odometer_km = t.odometer_km
    for i in t.items:
        if t.type == "PART_TRANSFER":
            db.add(PartHistory(bus_id=t.bus_id, part_name=i.part_name, action="TRANSFER_OUT", qty=i.qty, odometer_km=km,
                               on_date=today, ticket_id=t.id, counterpart_bus_no=t.to_bus.bus_no if t.to_bus else None,
                               note=t.reason_text))
            if t.to_bus_id:
                db.add(PartHistory(bus_id=t.to_bus_id, part_name=i.part_name, action="TRANSFER_IN", qty=i.qty,
                                   odometer_km=t.to_bus.odometer_km if t.to_bus else None, on_date=today,
                                   ticket_id=t.id, counterpart_bus_no=bus.bus_no if bus else None, note=t.reason_text))
        elif t.bus_id:
            action = "REPLACED" if t.type == "PART_REPLACEMENT" else "INSTALLED"
            db.add(PartHistory(bus_id=t.bus_id, part_name=i.part_name, action=action, qty=i.qty, odometer_km=km,
                               on_date=today, ticket_id=t.id, note=i.remarks))


def _apply_costs(t: Ticket, perms: set[str], labor, other, unit_prices) -> None:
    if not _has(perms, "tickets.cost"):
        return
    t.labor_cost = labor or 0
    t.other_cost = other or 0
    if unit_prices:
        by_id = {i.id: i for i in t.items}
        for item_id, price in unit_prices.items():
            if int(item_id) in by_id:
                by_id[int(item_id)].unit_price = max(float(price), 0)


@router.post("/{ticket_id}/complete")
def complete(ticket_id: int, body: CompleteIn = CompleteIn(), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    t = _get_ticket(db, ticket_id)
    if not _can(t, user, perms)["complete"]:
        raise HTTPException(403, "Only in-progress tickets can be completed")
    if t.type == "VEHICLE_RELEASE" and any(not c.checked for c in t.checklist):
        raise HTTPException(409, "Finish the release checklist before completing this ticket")
    _apply_costs(t, perms, body.labor_cost, body.other_cost, body.unit_prices)
    t.work_notes = body.work_notes
    t.status = "COMPLETED"
    t.completed_at = datetime.utcnow()
    _write_history(db, t)
    _log(t, "COMPLETED", user, body.work_notes)
    audit(db, user, "complete", "ticket", t.id, t.ticket_no)
    db.commit()
    return _detail(t, user, perms)


@router.put("/{ticket_id}/cost")
def update_cost(ticket_id: int, body: CostIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    t = _get_ticket(db, ticket_id)
    if not _can(t, user, perms)["cost"]:
        raise HTTPException(403, "You cannot edit costs on this ticket")
    _apply_costs(t, perms, body.labor_cost, body.other_cost, body.unit_prices)
    _log(t, "COST_UPDATED", user, f"Total ৳{_grand_total(t):,.2f}")
    db.commit()
    return _detail(t, user, perms)


@router.put("/{ticket_id}/checklist/{item_id}")
def toggle_checklist(ticket_id: int, item_id: int, body: ChecklistToggleIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    t = _get_ticket(db, ticket_id)
    if not _can(t, user, perms)["checklist"]:
        raise HTTPException(403, "The release checklist cannot be changed right now")
    item = next((c for c in t.checklist if c.id == item_id), None)
    if not item:
        raise HTTPException(404, "Checklist item not found")
    item.checked = body.checked
    item.note = body.note if body.note is not None else item.note
    item.checked_by = user.name if body.checked else None
    item.checked_at = datetime.utcnow() if body.checked else None
    db.commit()
    return _detail(t, user, perms)


@router.post("/{ticket_id}/garage-out")
def garage_out(ticket_id: int, body: GarageOutIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    t = _get_ticket(db, ticket_id)
    if not _can(t, user, perms)["garage_out"]:
        raise HTTPException(403, "Garage-out requires a completed ticket and release permission")
    if any(not c.checked for c in t.checklist):
        raise HTTPException(409, "Release checklist is incomplete — every item must be ticked before the bus leaves")
    t.status = "GARAGE_OUT"
    t.garage_out_at = datetime.utcnow()
    t.garage_out_by = user.name
    t.gate_pass_no = t.gate_pass_no or next_gate_pass_no(db)
    if t.bus:
        t.bus.status = "ACTIVE"
    _log(t, "GARAGE_OUT", user, f"Gate pass {t.gate_pass_no}" + (f" — {body.note}" if body.note else ""))
    audit(db, user, "garage_out", "ticket", t.id, f"{t.ticket_no} / {t.gate_pass_no}")
    db.commit()
    return _detail(t, user, perms)


@router.post("/{ticket_id}/close")
def close(ticket_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    perms = user_permissions(user, db)
    t = _get_ticket(db, ticket_id)
    if not _can(t, user, perms)["close"]:
        raise HTTPException(403, "This ticket cannot be closed yet")
    t.status = "CLOSED"
    t.closed_at = datetime.utcnow()
    _log(t, "CLOSED", user, "Ticket closed")
    audit(db, user, "close", "ticket", t.id, t.ticket_no)
    db.commit()
    return _detail(t, user, perms)
