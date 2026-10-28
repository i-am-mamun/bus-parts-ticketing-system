"""Warehouses and Location Bins router (physical storage hierarchy: Branch -> Warehouse -> Rack/Shelf/Bin)."""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, user_permissions
from app.models import Branch, User, Warehouse, WarehouseLocationBin
from app.schemas import (
    BulkGenerateBinsIn,
    HierarchyCol,
    HierarchyRack,
    HierarchyRow,
    LocationBinIn,
    LocationBinOut,
    WarehouseIn,
    WarehouseLocationsPayload,
    WarehouseOut,
)
from app.services import audit

router = APIRouter(prefix="/api/v1/warehouses", tags=["Warehouses & Bins"])


def _has(perms: set[str], code: str) -> bool:
    return "*" in perms or code in perms


def _to_warehouse_out(w: Warehouse, db: Session) -> WarehouseOut:
    total_bins = db.scalar(
        select(func.count(WarehouseLocationBin.id)).where(WarehouseLocationBin.warehouse_id == w.id)
    ) or 0
    return WarehouseOut(
        id=w.id,
        branch_id=w.branch_id,
        branch_name=w.branch.name if w.branch else None,
        name=w.name,
        code=w.code,
        location=w.location,
        warehouse_type=w.warehouse_type,
        is_location_based=w.is_location_based,
        is_active=w.is_active,
        total_bins=total_bins,
        created_at=w.created_at,
    )


@router.get("", response_model=List[WarehouseOut])
def list_warehouses(
    branch_id: Optional[int] = None,
    q: Optional[str] = None,
    active: Optional[bool] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Warehouse)
    if branch_id:
        stmt = stmt.where(Warehouse.branch_id == branch_id)
    if active is not None:
        stmt = stmt.where(Warehouse.is_active.is_(active))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Warehouse.name.ilike(like), Warehouse.code.ilike(like), Warehouse.location.ilike(like)))

    rows = db.scalars(stmt.order_by(Warehouse.name)).all()
    return [_to_warehouse_out(w, db) for w in rows]


@router.get("/{wid}", response_model=WarehouseOut)
def get_warehouse(
    wid: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    w = db.get(Warehouse, wid)
    if not w:
        raise HTTPException(404, "Warehouse not found")
    return _to_warehouse_out(w, db)


@router.post("", response_model=WarehouseOut, status_code=201)
def create_warehouse(
    body: WarehouseIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "warehouses.manage") and not _has(perms, "branches.manage"):
        raise HTTPException(403, "You do not have permission to manage warehouses")

    br = db.get(Branch, body.branch_id)
    if not br:
        raise HTTPException(404, "Branch/Depot not found")

    code_clean = body.code.strip().upper()
    if db.scalar(select(Warehouse.id).where(func.lower(Warehouse.code) == code_clean.lower())):
        raise HTTPException(409, f"Warehouse code '{code_clean}' already exists")

    w = Warehouse(
        branch_id=body.branch_id,
        name=body.name.strip(),
        code=code_clean,
        location=body.location,
        warehouse_type=body.warehouse_type or "Spares Store",
        is_location_based=body.is_location_based,
        is_active=body.is_active,
    )
    db.add(w)
    db.flush()
    audit(db, user, "create", "warehouse", str(w.id), f"{w.name} ({w.code})")
    db.commit()
    db.refresh(w)
    return _to_warehouse_out(w, db)


@router.put("/{wid}", response_model=WarehouseOut)
def update_warehouse(
    wid: int,
    body: WarehouseIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "warehouses.manage") and not _has(perms, "branches.manage"):
        raise HTTPException(403, "You do not have permission to manage warehouses")

    w = db.get(Warehouse, wid)
    if not w:
        raise HTTPException(404, "Warehouse not found")

    code_clean = body.code.strip().upper()
    dup = db.scalar(
        select(Warehouse.id).where(func.lower(Warehouse.code) == code_clean.lower(), Warehouse.id != wid)
    )
    if dup:
        raise HTTPException(409, f"Warehouse code '{code_clean}' already taken by another store")

    w.branch_id = body.branch_id
    w.name = body.name.strip()
    w.code = code_clean
    w.location = body.location
    w.warehouse_type = body.warehouse_type or "Spares Store"
    w.is_location_based = body.is_location_based
    w.is_active = body.is_active

    audit(db, user, "update", "warehouse", str(w.id), f"{w.name} ({w.code})")
    db.commit()
    db.refresh(w)
    return _to_warehouse_out(w, db)


@router.delete("/{wid}", status_code=204)
def delete_warehouse(
    wid: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "warehouses.manage") and not _has(perms, "branches.manage"):
        raise HTTPException(403, "You do not have permission to delete warehouses")

    w = db.get(Warehouse, wid)
    if not w:
        raise HTTPException(404, "Warehouse not found")

    audit(db, user, "delete", "warehouse", str(w.id), f"{w.name} ({w.code})")
    db.delete(w)
    db.commit()


# ── Location Bins (Rack / Shelf / Bin within Warehouse) ───────────────────────
@router.get("/{wid}/locations", response_model=WarehouseLocationsPayload)
def get_warehouse_locations(
    wid: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    w = db.get(Warehouse, wid)
    if not w:
        raise HTTPException(404, "Warehouse not found")

    bins = db.scalars(
        select(WarehouseLocationBin)
        .where(WarehouseLocationBin.warehouse_id == wid)
        .order_by(
            WarehouseLocationBin.row_code,
            WarehouseLocationBin.col_code,
            WarehouseLocationBin.rack_code,
            WarehouseLocationBin.bin_code,
        )
    ).all()

    bin_outs = []
    tree = {}
    for b in bins:
        bout = LocationBinOut(
            id=b.id,
            warehouse_id=b.warehouse_id,
            row_code=b.row_code,
            col_code=b.col_code,
            rack_code=b.rack_code,
            bin_code=b.bin_code,
            full_code=b.full_code,
            name=b.name,
            loc_type=b.loc_type,
            max_capacity=b.max_capacity,
            status=b.status,
        )
        bin_outs.append(bout)

        r = b.row_code
        c = b.col_code
        rk = b.rack_code
        tree.setdefault(r, {}).setdefault(c, {}).setdefault(rk, []).append(bout)

    hierarchy = []
    for r_code, cols in sorted(tree.items()):
        col_list = []
        for c_code, racks in sorted(cols.items()):
            rack_list = []
            for rk_code, b_list in sorted(racks.items()):
                rack_list.append(HierarchyRack(rack_code=rk_code, bins=b_list))
            col_list.append(HierarchyCol(col_code=c_code, racks=rack_list))
        hierarchy.append(HierarchyRow(row_code=r_code, cols=col_list))

    wh_out = _to_warehouse_out(w, db)
    return WarehouseLocationsPayload(
        warehouse=wh_out,
        total_bins=len(bins),
        locations=bin_outs,
        hierarchy=hierarchy,
    )


@router.post("/{wid}/locations", response_model=LocationBinOut, status_code=201)
def create_single_bin(
    wid: int,
    payload: LocationBinIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "warehouses.manage") and not _has(perms, "branches.manage"):
        raise HTTPException(403, "You do not have permission to manage storage bins")

    w = db.get(Warehouse, wid)
    if not w:
        raise HTTPException(404, "Warehouse not found")

    row_str = (payload.row_code or "R01").strip().upper()
    col_str = (payload.col_code or "C01").strip().upper()
    rack_str = (payload.rack_code or "RK01").strip().upper()
    bin_str = (payload.bin_code or "B01").strip().upper()
    full_code = f"{row_str}-{col_str}-{rack_str}-{bin_str}"

    exists = db.scalar(
        select(WarehouseLocationBin.id).where(
            WarehouseLocationBin.warehouse_id == wid,
            WarehouseLocationBin.full_code == full_code,
        )
    )
    if exists:
        raise HTTPException(400, f"Location bin '{full_code}' already exists in this warehouse")

    b = WarehouseLocationBin(
        warehouse_id=wid,
        row_code=row_str,
        col_code=col_str,
        rack_code=rack_str,
        bin_code=bin_str,
        full_code=full_code,
        name=payload.name or f"Bin {full_code}",
        loc_type=payload.loc_type or "STANDARD",
        max_capacity=payload.max_capacity,
        status=payload.status or "ACTIVE",
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return LocationBinOut.model_validate(b)


@router.post("/{wid}/locations/generate")
@router.post("/{wid}/locations/bulk-generate")
def bulk_generate_bins(
    wid: int,
    payload: BulkGenerateBinsIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "warehouses.manage") and not _has(perms, "branches.manage"):
        raise HTTPException(403, "You do not have permission to generate bins")

    w = db.get(Warehouse, wid)
    if not w:
        raise HTTPException(404, "Warehouse not found")

    created = 0
    for r_idx in range(1, payload.rows + 1):
        row_str = f"R{r_idx:02d}"
        for c_idx in range(1, payload.cols + 1):
            col_str = f"C{c_idx:02d}"
            for rk_idx in range(1, payload.racks + 1):
                rack_str = f"RK{rk_idx:02d}"
                for b_idx in range(1, payload.bins + 1):
                    bin_str = f"B{b_idx:02d}"
                    full_code = f"{row_str}-{col_str}-{rack_str}-{bin_str}"

                    exists = db.scalar(
                        select(WarehouseLocationBin.id).where(
                            WarehouseLocationBin.warehouse_id == wid,
                            WarehouseLocationBin.full_code == full_code,
                        )
                    )
                    if not exists:
                        b = WarehouseLocationBin(
                            warehouse_id=wid,
                            row_code=row_str,
                            col_code=col_str,
                            rack_code=rack_str,
                            bin_code=bin_str,
                            full_code=full_code,
                            name=f"Bin {full_code}",
                            loc_type="STANDARD",
                            status="ACTIVE",
                        )
                        db.add(b)
                        created += 1

    db.commit()
    return {
        "status": "ok",
        "message": f"Generated {created} storage bin locations successfully",
        "created_count": created,
    }


@router.delete("/{wid}/locations/{bin_id}", status_code=204)
def delete_location_bin(
    wid: int,
    bin_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    perms = user_permissions(user, db)
    if not _has(perms, "warehouses.manage") and not _has(perms, "branches.manage"):
        raise HTTPException(403, "You do not have permission to delete storage bins")

    b = db.scalar(
        select(WarehouseLocationBin).where(
            WarehouseLocationBin.id == bin_id,
            WarehouseLocationBin.warehouse_id == wid,
        )
    )
    if not b:
        raise HTTPException(404, "Location bin not found")

    db.delete(b)
    db.commit()
