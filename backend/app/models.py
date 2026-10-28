"""Database models for the Soudia Parts Ticketing System.

There is intentionally NO stock / GRN / PO / warehouse model: inventory is managed
in a separate system. Everything here revolves around a *Ticket*.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=func.now()
    )


# ── Auth / RBAC ─────────────────────────────────────────────────────────────
class Role(Base, TimestampMixin):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    description: Mapped[Optional[str]] = mapped_column(String(400), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)


class Permission(Base):
    __tablename__ = "permissions"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    module: Mapped[str] = mapped_column(String(60), index=True)
    action: Mapped[str] = mapped_column(String(60))
    description: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), index=True)
    permission_id: Mapped[int] = mapped_column(ForeignKey("permissions.id", ondelete="CASCADE"), index=True)


class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    username: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(160), unique=True, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(60), default="technician", index=True)
    role_id: Mapped[Optional[int]] = mapped_column(ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)
    custom_permissions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON list of extra codes
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    user_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    action: Mapped[str] = mapped_column(String(60), index=True)
    entity: Mapped[str] = mapped_column(String(60), index=True)
    entity_id: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    detail: Mapped[Optional[str]] = mapped_column(String(400), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now(), index=True)


class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


# ── Fleet ───────────────────────────────────────────────────────────────────
class Branch(Base, TimestampMixin):
    __tablename__ = "branches"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    city: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Bus(Base, TimestampMixin):
    __tablename__ = "buses"
    id: Mapped[int] = mapped_column(primary_key=True)
    bus_no: Mapped[str] = mapped_column(String(40), unique=True, index=True)  # fleet / reg no, e.g. "DHK-METRO-11-2345"
    name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    make_model: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    route: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    branch_id: Mapped[Optional[int]] = mapped_column(ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    odometer_km: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE")  # ACTIVE / IN_GARAGE / OFF_ROAD
    notes: Mapped[Optional[str]] = mapped_column(String(400), nullable=True)

    branch: Mapped[Optional[Branch]] = relationship(lazy="joined")


class PartCatalog(Base):
    """Name-only helper list (NOT stock). Powers suggestions and 'premature' detection."""
    __tablename__ = "part_catalog"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    name_bn: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    unit: Mapped[str] = mapped_column(String(20), default="pcs")
    life_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # normal life in km
    life_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # normal life in days
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


# ── Ticketing ───────────────────────────────────────────────────────────────
class Ticket(Base, TimestampMixin):
    __tablename__ = "tickets"
    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_no: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    type: Mapped[str] = mapped_column(String(30), index=True)  # see TICKET_TYPES
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="NORMAL")  # NORMAL / URGENT / EMERGENCY
    status: Mapped[str] = mapped_column(String(30), default="DRAFT", index=True)

    bus_id: Mapped[Optional[int]] = mapped_column(ForeignKey("buses.id", ondelete="SET NULL"), nullable=True, index=True)
    to_bus_id: Mapped[Optional[int]] = mapped_column(ForeignKey("buses.id", ondelete="SET NULL"), nullable=True)
    branch_id: Mapped[Optional[int]] = mapped_column(ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)

    route: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    driver_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    odometer_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    needed_by: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Why is the part changed (Replacement / Transfer)
    reason_category: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    reason_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_premature: Mapped[bool] = mapped_column(Boolean, default=False)

    # Costs (typed manually – there is no inventory to price from)
    labor_cost: Mapped[float] = mapped_column(Float, default=0)
    other_cost: Mapped[float] = mapped_column(Float, default=0)
    work_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    garage_out_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    garage_out_by: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    gate_pass_no: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    reject_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejected_by: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    bus: Mapped[Optional[Bus]] = relationship(foreign_keys=[bus_id], lazy="joined")
    to_bus: Mapped[Optional[Bus]] = relationship(foreign_keys=[to_bus_id], lazy="joined")
    branch: Mapped[Optional[Branch]] = relationship(foreign_keys=[branch_id], lazy="joined")
    items: Mapped[List["TicketItem"]] = relationship(
        back_populates="ticket", cascade="all, delete-orphan", order_by="TicketItem.id"
    )
    approvals: Mapped[List["TicketApproval"]] = relationship(
        back_populates="ticket", cascade="all, delete-orphan", order_by="TicketApproval.step"
    )
    attachments: Mapped[List["TicketAttachment"]] = relationship(
        back_populates="ticket", cascade="all, delete-orphan", order_by="TicketAttachment.id"
    )
    events: Mapped[List["TicketEvent"]] = relationship(
        back_populates="ticket", cascade="all, delete-orphan", order_by="TicketEvent.id"
    )
    checklist: Mapped[List["ReleaseChecklistItem"]] = relationship(
        back_populates="ticket", cascade="all, delete-orphan", order_by="ReleaseChecklistItem.id"
    )


class TicketItem(Base):
    __tablename__ = "ticket_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    part_name: Mapped[str] = mapped_column(String(160))
    part_no: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    qty: Mapped[float] = mapped_column(Float, default=1)
    unit: Mapped[str] = mapped_column(String(20), default="pcs")
    unit_price: Mapped[float] = mapped_column(Float, default=0)
    remarks: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    # Auto-filled when the ticket is saved (Replacement / Transfer)
    last_replaced_on: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    last_replaced_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    used_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    expected_life_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_premature: Mapped[bool] = mapped_column(Boolean, default=False)

    ticket: Mapped[Ticket] = relationship(back_populates="items")


class TicketApproval(Base):
    """One row per verification step (1 Verify, 2 Approve, 3 Final Approve)."""
    __tablename__ = "ticket_approvals"
    __table_args__ = (UniqueConstraint("ticket_id", "step", name="uq_ticket_step"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    step: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # PENDING / DONE / REJECTED / SKIPPED
    user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    user_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_override: Mapped[bool] = mapped_column(Boolean, default=False)
    acted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    ticket: Mapped[Ticket] = relationship(back_populates="approvals")


class TicketAttachment(Base):
    __tablename__ = "ticket_attachments"
    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(20), default="PROBLEM")  # PROBLEM / OLD_PART / DOCUMENT / OTHER
    file_path: Mapped[str] = mapped_column(String(300))
    original_name: Mapped[str] = mapped_column(String(255))
    is_image: Mapped[bool] = mapped_column(Boolean, default=True)
    note: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    uploaded_by: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())

    ticket: Mapped[Ticket] = relationship(back_populates="attachments")


class TicketEvent(Base):
    """Audit trail / timeline shown on the ticket and on printed documents."""
    __tablename__ = "ticket_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    event: Mapped[str] = mapped_column(String(40))
    detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, server_default=func.now())

    ticket: Mapped[Ticket] = relationship(back_populates="events")


class ReleaseChecklistItem(Base):
    """Vehicle release checklist (Form 1804): every item must be ticked before the bus leaves the garage."""
    __tablename__ = "release_checklist_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(200))
    label_bn: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    checked: Mapped[bool] = mapped_column(Boolean, default=False)
    checked_by: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    note: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    ticket: Mapped[Ticket] = relationship(back_populates="checklist")


class PartHistory(Base):
    """Per-bus parts log book. Written when a ticket is completed."""
    __tablename__ = "part_history"
    id: Mapped[int] = mapped_column(primary_key=True)
    bus_id: Mapped[int] = mapped_column(ForeignKey("buses.id", ondelete="CASCADE"), index=True)
    part_name: Mapped[str] = mapped_column(String(160), index=True)
    action: Mapped[str] = mapped_column(String(20))  # INSTALLED / REPLACED / TRANSFER_OUT / TRANSFER_IN
    qty: Mapped[float] = mapped_column(Float, default=1)
    odometer_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    on_date: Mapped[date] = mapped_column(Date, default=date.today, index=True)
    ticket_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True)
    counterpart_bus_no: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
