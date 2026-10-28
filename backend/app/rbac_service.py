"""RBAC Service: Permissions registry, default roles seed, and effective permission calculation."""
from __future__ import annotations

import json
from typing import Dict, List, Optional, Set
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Permission, Role, RolePermission, User

# Master Permission Registry for the Soudia Parts Ticketing System (no inventory / purchasing modules)
SYSTEM_PERMISSIONS = [
    # 1. Dashboard
    {"code": "dashboard.view", "module": "dashboard", "action": "view", "description": "View ticket dashboard, pending approvals and alerts"},

    # 2. Tickets (core)
    {"code": "tickets.view", "module": "tickets", "action": "view", "description": "View tickets, timeline, images and documents"},
    {"code": "tickets.create", "module": "tickets", "action": "create", "description": "Raise tickets (part request, replacement, transfer, work sheet, release)"},
    {"code": "tickets.verify", "module": "tickets", "action": "verify", "description": "Step 1 — verify ticket details and problem images"},
    {"code": "tickets.approve", "module": "tickets", "action": "approve", "description": "Step 2 — approve a verified ticket"},
    {"code": "tickets.final_approve", "module": "tickets", "action": "final_approve", "description": "Step 3 — final approval of a ticket"},
    {"code": "tickets.override", "module": "tickets", "action": "override", "description": "Emergency: skip approval steps (reason is logged)"},
    {"code": "tickets.work", "module": "tickets", "action": "work", "description": "Start work and complete approved tickets"},
    {"code": "tickets.release", "module": "tickets", "action": "release", "description": "Vehicle release checklist, gate pass and garage-out"},
    {"code": "tickets.cost", "module": "tickets", "action": "cost", "description": "See and enter part prices, labour cost and invoice totals"},
    {"code": "tickets.delete", "module": "tickets", "action": "delete", "description": "Delete draft / cancelled tickets"},

    # 3. Bus fleet
    {"code": "fleet.view", "module": "fleet", "action": "view", "description": "View bus fleet registry and per-bus parts log book"},
    {"code": "fleet.create", "module": "fleet", "action": "create", "description": "Add a bus to the fleet registry"},
    {"code": "fleet.edit", "module": "fleet", "action": "edit", "description": "Edit bus details, route, odometer and status"},
    {"code": "fleet.delete", "module": "fleet", "action": "delete", "description": "Remove a bus from the registry"},

    # 4. Branches / depots
    {"code": "branches.view", "module": "branches", "action": "view", "description": "View depots and branches"},
    {"code": "branches.manage", "module": "branches", "action": "manage", "description": "Create and edit depots and branches"},

    # 4.1 Warehouses & Bins
    {"code": "warehouses.view", "module": "warehouses", "action": "view", "description": "View spare parts stores, warehouses and location bins"},
    {"code": "warehouses.manage", "module": "warehouses", "action": "manage", "description": "Create and manage warehouses and storage bins"},

    # 4.2 Suppliers
    {"code": "suppliers.view", "module": "suppliers", "action": "view", "description": "View parts vendors and suppliers directory"},
    {"code": "suppliers.manage", "module": "suppliers", "action": "manage", "description": "Create and edit parts vendors and suppliers"},

    # 5. Reports
    {"code": "reports.view", "module": "reports", "action": "view", "description": "View ticket, cost and premature-replacement reports"},
    {"code": "reports.export", "module": "reports", "action": "export", "description": "Export / print reports"},

    # 6. Users & security
    {"code": "users.view", "module": "users", "action": "view", "description": "View staff accounts"},
    {"code": "users.manage", "module": "users", "action": "manage", "description": "Create staff accounts, reset passwords, enable / disable"},
    {"code": "rbac.manage", "module": "rbac", "action": "manage", "description": "Configure roles and the permission matrix"},

    # 7. Settings & audit
    {"code": "settings.view", "module": "settings", "action": "view", "description": "View company and system settings"},
    {"code": "settings.manage", "module": "settings", "action": "manage", "description": "Modify company profile, logo and print settings"},
    {"code": "audit.view", "module": "audit", "action": "view", "description": "View the system audit trail"},
]

DEFAULT_ROLES = [
    {
        "key": "admin",
        "name": "Administrator",
        "description": "Step 3 (Final Approval). Full system administration, RBAC governance and audit authority.",
        "is_system": True,
        "permissions": [p["code"] for p in SYSTEM_PERMISSIONS],
    },
    {
        "key": "manager",
        "name": "Manager",
        "description": "Step 2 (Approve). Oversees tickets, work and costs for the depot.",
        "is_system": True,
        "permissions": [
            "dashboard.view",
            "tickets.view", "tickets.create", "tickets.approve", "tickets.work", "tickets.release", "tickets.cost",
            "fleet.view", "fleet.create", "fleet.edit",
            "branches.view",
            "warehouses.view", "warehouses.manage",
            "suppliers.view", "suppliers.manage",
            "reports.view", "reports.export",
            "settings.view",
        ],
    },
    {
        "key": "storekeeper",
        "name": "Store / Garage Incharge",
        "description": "Step 1 (Verify). Checks ticket details and problem images, runs the vehicle release.",
        "is_system": True,
        "permissions": [
            "dashboard.view",
            "tickets.view", "tickets.create", "tickets.verify", "tickets.work", "tickets.release",
            "fleet.view",
            "branches.view",
            "warehouses.view", "warehouses.manage",
            "suppliers.view",
        ],
    },
    {
        "key": "technician",
        "name": "Mechanic / Supervisor",
        "description": "Raises tickets with problem photos and carries out the approved work.",
        "is_system": True,
        "permissions": [
            "dashboard.view",
            "tickets.view", "tickets.create", "tickets.work",
            "fleet.view",
        ],
    },
    {
        "key": "accountant",
        "name": "Accountant",
        "description": "Enters part prices and labour cost, prints invoices and cost reports.",
        "is_system": True,
        "permissions": [
            "dashboard.view",
            "tickets.view", "tickets.cost",
            "fleet.view",
            "branches.view",
            "reports.view", "reports.export",
        ],
    },
]



def ensure_rbac_seeded(db: Session) -> None:
    """Ensure all system permissions and default roles are seeded and synchronized."""
    # 1. Sync permissions
    existing_perms = {p.code: p for p in db.scalars(select(Permission)).all()}
    for sp in SYSTEM_PERMISSIONS:
        if sp["code"] not in existing_perms:
            p = Permission(
                code=sp["code"],
                module=sp["module"],
                action=sp["action"],
                description=sp["description"],
            )
            db.add(p)
        else:
            p = existing_perms[sp["code"]]
            p.module = sp["module"]
            p.action = sp["action"]
            p.description = sp["description"]
    db.flush()

    all_perms_map = {p.code: p for p in db.scalars(select(Permission)).all()}

    # 2. Sync roles
    existing_roles = {r.key: r for r in db.scalars(select(Role)).all()}
    for dr in DEFAULT_ROLES:
        role = existing_roles.get(dr["key"])
        if not role:
            role = Role(
                key=dr["key"],
                name=dr["name"],
                description=dr["description"],
                is_system=dr["is_system"],
            )
            db.add(role)
            db.flush()
            existing_roles[dr["key"]] = role

            # Assign default role permissions
            for pcode in dr["permissions"]:
                p_obj = all_perms_map.get(pcode)
                if p_obj:
                    db.add(RolePermission(role_id=role.id, permission_id=p_obj.id))
        else:
            role.is_system = dr["is_system"]
            # If role has zero permissions, seed defaults
            has_perms = db.scalar(select(func.count(RolePermission.id)).where(RolePermission.role_id == role.id))
            if not has_perms:
                for pcode in dr["permissions"]:
                    p_obj = all_perms_map.get(pcode)
                    if p_obj:
                        db.add(RolePermission(role_id=role.id, permission_id=p_obj.id))
            elif dr["key"] == "admin":
                owned = set(db.scalars(select(RolePermission.permission_id).where(RolePermission.role_id == role.id)).all())
                for p_obj in all_perms_map.values():
                    if p_obj.id not in owned:
                        db.add(RolePermission(role_id=role.id, permission_id=p_obj.id))

    db.flush()

    # 3. Associate any unassociated users to their role
    roles_by_key = {r.key: r for r in db.scalars(select(Role)).all()}
    users = db.scalars(select(User)).all()
    for u in users:
        if not u.role_id:
            matched_role = roles_by_key.get(u.role)
            if matched_role:
                u.role_id = matched_role.id
        elif u.role_id:
            # Sync user.role string with role.key
            r = db.get(Role, u.role_id)
            if r and u.role != r.key:
                u.role = r.key

    db.commit()


def get_user_effective_permissions(user: User, db: Session) -> Set[str]:
    """Calculate the complete set of effective permission codes for a user."""
    # Super admin bypass
    if user.role == "admin":
        all_codes = db.scalars(select(Permission.code)).all()
        return set(all_codes) | {"*"}

    perms: Set[str] = set()

    # Check if user has role
    role_id = user.role_id
    if not role_id and user.role:
        role = db.scalar(select(Role).where(Role.key == user.role))
        if role:
            role_id = role.id

    if role_id:
        role_codes = db.scalars(
            select(Permission.code)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .where(RolePermission.role_id == role_id)
        ).all()
        perms.update(role_codes)

    # Check user-specific direct custom permissions override
    if user.custom_permissions:
        try:
            custom_list = json.loads(user.custom_permissions)
            if isinstance(custom_list, list):
                perms.update(custom_list)
        except Exception:
            pass

    return perms
