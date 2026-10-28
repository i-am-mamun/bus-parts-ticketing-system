"""Pydantic request/response schemas (auth, users, settings, audit, tickets, fleet)."""
from __future__ import annotations

from datetime import date, datetime
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int


# ── Auth / Users ────────────────────────────────────────────────────────────
class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    username: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    role_id: Optional[int] = None
    is_active: bool = True
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    permissions: List[str] = Field(default_factory=list)


class LoginOut(BaseModel):
    token: str
    user: UserOut


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class AdminPasswordResetIn(BaseModel):
    new_password: str = Field(min_length=8)


class UserCreate(BaseModel):
    name: str
    username: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str = Field(min_length=8)
    role: str = "technician"
    is_active: bool = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=8)
    role: Optional[str] = None
    is_active: Optional[bool] = None


class SettingsIn(BaseModel):
    model_config = ConfigDict(extra="allow")


class SettingsOut(BaseModel):
    model_config = ConfigDict(extra="allow")


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_name: Optional[str] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    detail: Optional[str] = None
    created_at: datetime


# ── Fleet ───────────────────────────────────────────────────────────────────
class BranchIn(BaseModel):
    name: str
    code: str
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True


class BusIn(BaseModel):
    bus_no: str
    name: Optional[str] = None
    make_model: Optional[str] = None
    route: Optional[str] = None
    branch_id: Optional[int] = None
    odometer_km: float = 0
    status: str = "ACTIVE"
    notes: Optional[str] = None


# ── Tickets ─────────────────────────────────────────────────────────────────
class TicketItemIn(BaseModel):
    part_name: str = Field(min_length=1)
    part_no: Optional[str] = None
    qty: float = Field(default=1, gt=0)
    unit: str = "pcs"
    unit_price: float = Field(default=0, ge=0)
    remarks: Optional[str] = None


class TicketIn(BaseModel):
    type: str
    title: str = Field(min_length=3)
    description: Optional[str] = None
    priority: str = "NORMAL"
    bus_id: Optional[int] = None
    to_bus_id: Optional[int] = None
    branch_id: Optional[int] = None
    route: Optional[str] = None
    driver_name: Optional[str] = None
    odometer_km: Optional[float] = None
    needed_by: Optional[date] = None
    reason_category: Optional[str] = None
    reason_text: Optional[str] = None
    items: List[TicketItemIn] = Field(default_factory=list)


class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    bus_id: Optional[int] = None
    to_bus_id: Optional[int] = None
    branch_id: Optional[int] = None
    route: Optional[str] = None
    driver_name: Optional[str] = None
    odometer_km: Optional[float] = None
    needed_by: Optional[date] = None
    reason_category: Optional[str] = None
    reason_text: Optional[str] = None
    items: Optional[List[TicketItemIn]] = None


class CommentIn(BaseModel):
    comment: Optional[str] = None


class RejectIn(BaseModel):
    reason: str = Field(min_length=3)


class OverrideIn(BaseModel):
    reason: str = Field(min_length=5)


class CompleteIn(BaseModel):
    labor_cost: float = Field(default=0, ge=0)
    other_cost: float = Field(default=0, ge=0)
    work_notes: Optional[str] = None
    unit_prices: Optional[dict[int, float]] = None  # item_id -> unit price (typed in by the accountant/manager)


class CostIn(BaseModel):
    labor_cost: float = Field(default=0, ge=0)
    other_cost: float = Field(default=0, ge=0)
    unit_prices: Optional[dict[int, float]] = None


class ChecklistToggleIn(BaseModel):
    checked: bool
    note: Optional[str] = None


class GarageOutIn(BaseModel):
    note: Optional[str] = None
