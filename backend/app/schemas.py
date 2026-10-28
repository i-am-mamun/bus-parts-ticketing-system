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


# ── Warehouses & Storage Bins ───────────────────────────────────────────────
class WarehouseIn(BaseModel):
    branch_id: int
    name: str = Field(min_length=1)
    code: str = Field(min_length=1)
    location: Optional[str] = "Main Depot"
    warehouse_type: Optional[str] = "Spares Store"
    is_location_based: bool = True
    is_active: bool = True


class WarehouseOut(BaseModel):
    id: int
    branch_id: int
    branch_name: Optional[str] = None
    name: str
    code: str
    location: Optional[str] = None
    warehouse_type: str = "Spares Store"
    is_location_based: bool = True
    is_active: bool = True
    total_bins: int = 0
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LocationBinIn(BaseModel):
    row_code: Optional[str] = "R01"
    col_code: Optional[str] = "C01"
    rack_code: Optional[str] = "RK01"
    bin_code: Optional[str] = "B01"
    name: Optional[str] = None
    loc_type: Optional[str] = "STANDARD"
    max_capacity: Optional[int] = None
    status: Optional[str] = "ACTIVE"


class BulkGenerateBinsIn(BaseModel):
    rows: int = Field(default=2, ge=1, le=20)
    cols: int = Field(default=2, ge=1, le=20)
    racks: int = Field(default=3, ge=1, le=20)
    bins: int = Field(default=2, ge=1, le=20)


class LocationBinOut(BaseModel):
    id: int
    warehouse_id: int
    row_code: str
    col_code: str
    rack_code: str
    bin_code: str
    full_code: str
    name: str
    loc_type: str = "STANDARD"
    max_capacity: Optional[int] = None
    status: str = "ACTIVE"

    model_config = ConfigDict(from_attributes=True)


class HierarchyRack(BaseModel):
    rack_code: str
    bins: List[LocationBinOut]


class HierarchyCol(BaseModel):
    col_code: str
    racks: List[HierarchyRack]


class HierarchyRow(BaseModel):
    row_code: str
    cols: List[HierarchyCol]


class WarehouseLocationsPayload(BaseModel):
    warehouse: WarehouseOut
    total_bins: int
    locations: List[LocationBinOut]
    hierarchy: List[HierarchyRow]


# ── Suppliers Directory ─────────────────────────────────────────────────────
class SupplierIn(BaseModel):
    name: str = Field(min_length=1)
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    supplied_categories: Optional[str] = None
    rating: float = Field(default=5.0, ge=1.0, le=5.0)
    notes: Optional[str] = None
    is_active: bool = True


class SupplierOut(BaseModel):
    id: int
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    supplied_categories: Optional[str] = None
    rating: float = 5.0
    notes: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ── Tickets ─────────────────────────────────────────────────────────────────
class TicketItemIn(BaseModel):
    part_name: str = Field(min_length=1)
    part_no: Optional[str] = None
    qty: float = Field(default=1, gt=0)
    unit: str = "pcs"
    unit_price: float = Field(default=0, ge=0)
    remarks: Optional[str] = None
    bin_code: Optional[str] = None
    warehouse_id: Optional[int] = None


class TicketIn(BaseModel):
    type: str
    title: str = Field(min_length=3)
    description: Optional[str] = None
    priority: str = "NORMAL"
    bus_id: Optional[int] = None
    to_bus_id: Optional[int] = None
    branch_id: Optional[int] = None
    warehouse_id: Optional[int] = None
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
    warehouse_id: Optional[int] = None
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
