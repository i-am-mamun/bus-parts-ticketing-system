"""Settings key/value store, audit logging, numbering and file helpers."""
from __future__ import annotations

import os
import uuid
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings as cfg
from app.models import AuditLog, Setting, Ticket, User

# ── Settings ────────────────────────────────────────────────────────────────
DEFAULT_SETTINGS: dict[str, str] = {
    "app_name": "Soudia Parts Ticketing",
    "app_tagline": "Parts • Tickets • Fleet",
    "company_name": "Soudia Paribahan Ltd.",
    "legal_name": "Soudia Paribahan Ltd.",
    "company_tagline": "Every part tracked • Every ticket verified",
    "company_address": "Dhaka, Bangladesh",
    "address": "Dhaka, Bangladesh",
    "company_phone": "",
    "phone": "",
    "company_email": "",
    "email": "",
    "currency_symbol": "৳",
    "ticket_prefix": "TKT-",
    "paper_size": "A4",
    "print_show_logo": "true",
    "print_show_signatures": "true",
    "sig_1_title": "Requested By",
    "sig_1_sub": "Garage / Supervisor",
    "sig_2_title": "Verified By",
    "sig_2_sub": "Store / Garage Incharge",
    "sig_3_title": "Approved By",
    "sig_3_sub": "Manager",
    "sig_4_title": "Final Approval",
    "sig_4_sub": "Admin",
    "premature_strict_mode": "true",
    "active_theme": "ocean",
    "company_logo": "",
}


def get_settings(db: Session) -> dict:
    rows = {s.key: s.value for s in db.scalars(select(Setting))}
    merged = {**DEFAULT_SETTINGS, **{k: (v or "") for k, v in rows.items()}}
    try:
        merged["default_tax_rate"] = float(merged.get("default_tax_rate") or merged.get("tax_rate") or 0)
    except Exception:
        merged["default_tax_rate"] = 0.0
    return merged


def save_settings(db: Session, values: dict) -> dict:
    for key, value in values.items():
        if value is None:
            continue
        row = db.get(Setting, key)
        str_val = str(value) if not isinstance(value, bool) else ("true" if value else "false")
        if row is None:
            db.add(Setting(key=key, value=str_val))
        else:
            row.value = str_val
    db.commit()
    return get_settings(db)


# ── Audit ───────────────────────────────────────────────────────────────────
def audit(db: Session, user: Optional[User], action: str, entity: str, entity_id=None, detail: str | None = None) -> None:
    db.add(
        AuditLog(
            user_id=user.id if user else None,
            user_name=user.name if user else None,
            action=action,
            entity=entity,
            entity_id=str(entity_id) if entity_id is not None else None,
            detail=(detail or "")[:400] or None,
        )
    )


# ── Numbering ───────────────────────────────────────────────────────────────
TICKET_PREFIX = {
    "PART_REQUEST": "PRQ",
    "PART_REPLACEMENT": "RPL",
    "PART_TRANSFER": "TRF",
    "WORK_SHEET": "WSH",
    "VEHICLE_RELEASE": "REL",
}


def next_ticket_no(db: Session, ticket_type: str, on: date | None = None) -> str:
    on = on or date.today()
    prefix = TICKET_PREFIX.get(ticket_type, "TKT")
    base = f"{prefix}-{on.year}-"
    count = db.scalar(select(func.count(Ticket.id)).where(Ticket.ticket_no.like(f"{base}%"))) or 0
    n = count + 1
    while db.scalar(select(Ticket.id).where(Ticket.ticket_no == f"{base}{n:04d}")):
        n += 1
    return f"{base}{n:04d}"


def next_gate_pass_no(db: Session, on: date | None = None) -> str:
    on = on or date.today()
    base = f"GP-{on.year}-"
    count = db.scalar(select(func.count(Ticket.id)).where(Ticket.gate_pass_no.like(f"{base}%"))) or 0
    n = count + 1
    while db.scalar(select(Ticket.id).where(Ticket.gate_pass_no == f"{base}{n:04d}")):
        n += 1
    return f"{base}{n:04d}"


# ── Files ───────────────────────────────────────────────────────────────────
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
DOC_EXT = IMAGE_EXT | {".pdf"}


def save_upload(file: UploadFile, subdir: str, allowed: set[str] = IMAGE_EXT) -> tuple[str, str]:
    """Persist an upload under UPLOAD_DIR/subdir. Returns (relative_posix_path, original_name)."""
    original = os.path.basename(file.filename or "file")
    ext = Path(original).suffix.lower()
    if ext not in allowed:
        raise HTTPException(400, f"File type {ext or '(none)'} is not allowed. Allowed: {', '.join(sorted(allowed))}")
    data = file.file.read()
    if len(data) > cfg.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f"File exceeds the {cfg.MAX_UPLOAD_MB} MB limit")
    if not data:
        raise HTTPException(400, "Empty file")
    folder = cfg.UPLOAD_DIR / subdir
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    (folder / name).write_bytes(data)
    return f"{subdir}/{name}", original


def delete_file(rel_path: str | None) -> None:
    if not rel_path:
        return
    target = (cfg.UPLOAD_DIR / rel_path).resolve()
    try:
        target.relative_to(cfg.UPLOAD_DIR.resolve())
    except ValueError:
        return
    if target.is_file():
        target.unlink(missing_ok=True)
