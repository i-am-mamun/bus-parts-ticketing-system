"""Database seed script for Soudia Parts Ticketing System.

Usage:
    python -m app.seed --demo
"""
from __future__ import annotations

import sys
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models import (
    Branch,
    Bus,
    PartCatalog,
    PartHistory,
    ReleaseChecklistItem,
    Role,
    Ticket,
    TicketApproval,
    TicketAttachment,
    TicketEvent,
    TicketItem,
    User,
)
from app.rbac_service import DEFAULT_ROLES, ensure_rbac_seeded


def ensure_admin(db: Session) -> None:
    if not db.scalar(select(User.id).where(User.username == settings.ADMIN_USERNAME)):
        db.add(
            User(
                name=settings.ADMIN_NAME,
                username=settings.ADMIN_USERNAME,
                email=settings.ADMIN_EMAIL or "admin@soudiaparibahan.com",
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                role="admin",
                is_active=True,
            )
        )
        db.commit()


def seed_demo(db: Session) -> None:
    print("▶ Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    ensure_admin(db)
    ensure_rbac_seeded(db)

    today = date.today()

    # 1. Staff Users (Matching role definitions)
    users_data = [
        ("Kazi Zahidul Islam", "admin", "admin@soudiaparibahan.com", "Admin@12345", "admin"),
        ("Engr. Tanvir Ahmed", "manager", "manager@soudiaparibahan.com", "Demo@12345", "manager"),
        ("Md. Rafiqul Hasan", "storekeeper", "store@soudiaparibahan.com", "Demo@12345", "storekeeper"),
        ("Ustad Shahid Ali", "technician", "tech@soudiaparibahan.com", "Demo@12345", "technician"),
        ("Nurul Islam", "accountant", "accounts@soudiaparibahan.com", "Demo@12345", "accountant"),
    ]
    for name, uname, email, pwd, role in users_data:
        existing = db.scalar(select(User).where(User.username == uname))
        if not existing:
            matched_role = db.scalar(select(Role).where(Role.key == role))
            db.add(
                User(
                    name=name,
                    username=uname,
                    email=email,
                    password_hash=hash_password(pwd),
                    role=role,
                    role_id=matched_role.id if matched_role else None,
                    is_active=True,
                )
            )
    db.flush()

    # 2. Branches / Depots
    branches_data = [
        Branch(name="Sayedabad Central Depot & Workshop", code="DHK-01", city="Dhaka", address="Sayedabad Inter-district Terminal, Dhaka", phone="01711223344"),
        Branch(name="Dampara Main Garage & Service Center", code="CTG-01", city="Chittagong", address="Dampara, Chittagong", phone="01811223344"),
        Branch(name="Cox's Bazar Terminal Workshop", code="CXB-01", city="Cox's Bazar", address="Jhawtala, Cox's Bazar", phone="01911223344"),
        Branch(name="Sylhet Kadamtoli Hub", code="SYL-01", city="Sylhet", address="Kadamtoli Terminal, Sylhet", phone="01611223344"),
    ]
    for b in branches_data:
        if not db.scalar(select(Branch.id).where(Branch.code == b.code)):
            db.add(b)
    db.flush()

    dhk_branch = db.scalar(select(Branch).where(Branch.code == "DHK-01"))
    ctg_branch = db.scalar(select(Branch).where(Branch.code == "CTG-01"))
    cxb_branch = db.scalar(select(Branch).where(Branch.code == "CXB-01"))

    # 3. Bus Fleet Registry
    buses_data = [
        Bus(bus_no="DHK-METRO-BA-15-2021", name="Soudia Hino 1J (Coach 101)", make_model="Hino RM2 Ac Coach", route="Dhaka - Chittagong", branch_id=dhk_branch.id, odometer_km=142500, status="ACTIVE", notes="Primary VIP coach"),
        Bus(bus_no="DHK-METRO-BA-15-2022", name="Soudia Hino 1J (Coach 102)", make_model="Hino RM2 Ac Coach", route="Dhaka - Cox's Bazar", branch_id=dhk_branch.id, odometer_km=168400, status="IN_GARAGE", notes="Brake service scheduled"),
        Bus(bus_no="CHATTA-METRO-BA-11-4041", name="Soudia Scania Multi-Axle (Coach 201)", make_model="Scania K410IB High-Deck", route="Chittagong - Dhaka - Sylhet", branch_id=ctg_branch.id, odometer_km=215000, status="ACTIVE", notes="Multi-axle sleeper"),
        Bus(bus_no="CHATTA-METRO-BA-11-4042", name="Soudia Hyundai Universe (Coach 202)", make_model="Hyundai Universe Luxury Express", route="Chittagong - Cox's Bazar", branch_id=ctg_branch.id, odometer_km=98300, status="ACTIVE", notes="Express shuttle"),
        Bus(bus_no="DHK-METRO-BA-14-8890", name="Soudia Non-AC Super (Coach 305)", make_model="Hino AK1J Standard", route="Dhaka - Teknaf", branch_id=cxb_branch.id, odometer_km=312000, status="OFF_ROAD", notes="Gearbox overhaul pending"),
    ]
    for bus in buses_data:
        if not db.scalar(select(Bus.id).where(Bus.bus_no == bus.bus_no)):
            db.add(bus)
    db.flush()

    bus1 = db.scalar(select(Bus).where(Bus.bus_no == "DHK-METRO-BA-15-2021"))
    bus2 = db.scalar(select(Bus).where(Bus.bus_no == "DHK-METRO-BA-15-2022"))
    bus3 = db.scalar(select(Bus).where(Bus.bus_no == "CHATTA-METRO-BA-11-4041"))
    bus5 = db.scalar(select(Bus).where(Bus.bus_no == "DHK-METRO-BA-14-8890"))

    # 4. Part Catalog (Pre-populated suggestions + expected life)
    catalog_items = [
        PartCatalog(name="Front Brake Shoe Set", name_bn="সামনের ব্রেক শু সেট", category="Braking", unit="set", life_km=40000, life_days=180),
        PartCatalog(name="Rear Brake Shoe Set", name_bn="পেছনের ব্রেক শু সেট", category="Braking", unit="set", life_km=45000, life_days=200),
        PartCatalog(name="Heavy Duty Clutch Plate", name_bn="হেভি ডিউটি ক্লাচ প্লেট", category="Clutch & Transmission", unit="pcs", life_km=80000, life_days=365),
        PartCatalog(name="Clutch Pressure Plate", name_bn="ক্লাচ প্রেশার প্লেট", category="Clutch & Transmission", unit="pcs", life_km=100000, life_days=450),
        PartCatalog(name="Turbocharger Assembly / Cartridge", name_bn="টার্বোচার্জার অ্যাসেম্বলি", category="Engine", unit="pcs", life_km=150000, life_days=600),
        PartCatalog(name="Engine Oil Filter Element", name_bn="ইঞ্জিন অয়েল ফিল্টার", category="Filtration", unit="pcs", life_km=15000, life_days=60),
        PartCatalog(name="Primary Diesel Fuel Filter", name_bn="ডিজেল ফুয়েল ফিল্টার", category="Filtration", unit="pcs", life_km=20000, life_days=90),
        PartCatalog(name="Air Filter High Capacity", name_bn="এয়ার ফিল্টার", category="Filtration", unit="pcs", life_km=25000, life_days=120),
        PartCatalog(name="Front Shock Absorber", name_bn="সামনের শক অ্যাবজরবার", category="Suspension", unit="pcs", life_km=70000, life_days=300),
        PartCatalog(name="Rear Air Bellow / Suspension Bag", name_bn="এয়ার সাসপেনশন বেলো", category="Suspension", unit="pcs", life_km=90000, life_days=400),
        PartCatalog(name="Main Leaf Spring Assembly", name_bn="লিফ স্প্রিং পাতা", category="Suspension", unit="set", life_km=120000, life_days=500),
        PartCatalog(name="Alternator V-Belt Set", name_bn="অল্টারনেটর বেল্ট সেট", category="Electrical", unit="set", life_km=30000, life_days=120),
        PartCatalog(name="Starter Motor Relay & Solenoid", name_bn="স্টার্টার মোটর রিলে", category="Electrical", unit="pcs", life_km=60000, life_days=250),
        PartCatalog(name="Synthetic Fleet Engine Oil 15W40", name_bn="সিন্থেটিক ইঞ্জিন অয়েল (১৫W৪০)", category="Lubricants", unit="ltr", life_km=15000, life_days=60),
    ]
    for c in catalog_items:
        if not db.scalar(select(PartCatalog.id).where(PartCatalog.name == c.name)):
            db.add(c)
    db.flush()

    # 5. Historical Part Logs (To demonstrate premature failure detection)
    if not db.scalar(select(PartHistory.id)):
        # Bus 2 had a front brake shoe installed only 12,000 km ago (Expects 40,000 km)
        db.add(PartHistory(
            bus_id=bus2.id,
            part_name="Front Brake Shoe Set",
            action="INSTALLED",
            qty=1,
            odometer_km=156400,
            on_date=today - timedelta(days=45),
            note="Regular maintenance change"
        ))
        # Bus 1 had air filter replaced 20,000 km ago
        db.add(PartHistory(
            bus_id=bus1.id,
            part_name="Air Filter High Capacity",
            action="INSTALLED",
            qty=1,
            odometer_km=122500,
            on_date=today - timedelta(days=90),
            note="Depot routine service"
        ))
        db.flush()

    # 6. Sample Tickets
    # ── Ticket 1: Part Replacement (Premature flag + photo attached + Step 1 Verified) ──
    if not db.scalar(select(Ticket.id).where(Ticket.ticket_no == "RPL-2026-0001")):
        t1 = Ticket(
            ticket_no="RPL-2026-0001",
            type="PART_REPLACEMENT",
            title="Front Brake Shoe Replacement (Premature Wear)",
            description="Driver reported severe shuddering and metallic friction noise while descending Chittagong-Cox's Bazar hills.",
            priority="URGENT",
            status="VERIFIED",
            bus_id=bus2.id,
            branch_id=ctg_branch.id,
            route="Dhaka - Cox's Bazar",
            driver_name="Md. Babul Mia",
            odometer_km=168400,
            needed_by=today + timedelta(days=1),
            reason_category="ROAD_CONDITION",
            reason_text="Heavy hill braking on hilly terrain combined with sudden rainwater caused accelerated pad abrasion.",
            is_premature=True,
            created_by_id=4,  # tech
            created_by_name="Ustad Shahid Ali",
            submitted_at=datetime.utcnow() - timedelta(hours=6),
        )
        t1.items.append(TicketItem(
            part_name="Front Brake Shoe Set",
            part_no="BRK-HINO-502",
            qty=1,
            unit="set",
            unit_price=6800,
            last_replaced_on=today - timedelta(days=45),
            last_replaced_km=156400,
            used_km=12000,
            expected_life_km=40000,
            is_premature=True,
            remarks="Friction lining burnt and cracked"
        ))
        # Approvals: Step 1 Done by Storekeeper, Step 2 Pending
        t1.approvals.append(TicketApproval(
            step=1,
            status="DONE",
            user_id=3,
            user_name="Md. Rafiqul Hasan",
            comment="Physical inspection done. Pad is indeed cracked and worn down to iron base. Approved for replacement.",
            acted_at=datetime.utcnow() - timedelta(hours=3),
        ))
        t1.approvals.append(TicketApproval(step=2, status="PENDING"))
        t1.approvals.append(TicketApproval(step=3, status="PENDING"))

        # Attachment sample placeholder
        t1.attachments.append(TicketAttachment(
            kind="PROBLEM",
            file_path="sample_damaged_brake_pad.jpg",
            original_name="damaged_brake_friction_liner.jpg",
            is_image=True,
            note="Damaged brake pad friction lining photo from mobile camera",
            uploaded_by="Ustad Shahid Ali",
        ))

        t1.events.append(TicketEvent(event="CREATED", detail="Replacement ticket raised with photo", user_name="Ustad Shahid Ali"))
        t1.events.append(TicketEvent(event="SUBMITTED", detail="Submitted for verification (Premature flag)", user_name="Ustad Shahid Ali"))
        t1.events.append(TicketEvent(event="STEP1_VERIFIED", detail="Store incharge verified physical condition & photo", user_name="Md. Rafiqul Hasan"))

        db.add(t1)

    # ── Ticket 2: Bus-to-Bus Part Transfer (Coach 305 Off-Road -> Coach 101) ──
    if not db.scalar(select(Ticket.id).where(Ticket.ticket_no == "TRF-2026-0001")):
        t2 = Ticket(
            ticket_no="TRF-2026-0001",
            type="PART_TRANSFER",
            title="Alternator Transfer from Off-Road Coach 305 to Coach 101",
            description="Coach 101 alternator diode burnt before VIP trip. Off-road Coach 305 has healthy alternator installed.",
            priority="EMERGENCY",
            status="FINAL_APPROVED",
            bus_id=bus5.id,    # source (off road)
            to_bus_id=bus1.id, # target
            branch_id=dhk_branch.id,
            reason_category="BUS_OFF_ROAD",
            reason_text="Coach 305 is currently undergoing gearbox overhaul for 2 weeks. Its 24V 80A Denso alternator is in prime condition.",
            created_by_id=2,  # manager
            created_by_name="Engr. Tanvir Ahmed",
            submitted_at=datetime.utcnow() - timedelta(days=1),
        )
        t2.items.append(TicketItem(
            part_name="Alternator V-Belt Set",
            part_no="ALT-DENSO-24V",
            qty=1,
            unit="pcs",
            unit_price=18500,
            remarks="24V 80A Denso Alternator + V-Belts"
        ))
        t2.approvals.append(TicketApproval(step=1, status="DONE", user_name="Md. Rafiqul Hasan", comment="Verified both buses parked in Bay 3", acted_at=datetime.utcnow() - timedelta(hours=20)))
        t2.approvals.append(TicketApproval(step=2, status="DONE", user_name="Engr. Tanvir Ahmed", comment="Approved for VIP trip readiness", acted_at=datetime.utcnow() - timedelta(hours=18)))
        t2.approvals.append(TicketApproval(step=3, status="DONE", user_name="Kazi Zahidul Islam", comment="Final admin approval granted", acted_at=datetime.utcnow() - timedelta(hours=14)))

        t2.events.append(TicketEvent(event="CREATED", detail="Bus-to-bus transfer ticket raised", user_name="Engr. Tanvir Ahmed"))
        t2.events.append(TicketEvent(event="SUBMITTED", detail="Sent for multi-step authorization", user_name="Engr. Tanvir Ahmed"))
        t2.events.append(TicketEvent(event="STEP1_VERIFIED", detail="Store/Garage verified parts condition", user_name="Md. Rafiqul Hasan"))
        t2.events.append(TicketEvent(event="STEP2_APPROVED", detail="Operations Manager signed off", user_name="Engr. Tanvir Ahmed"))
        t2.events.append(TicketEvent(event="STEP3_FINAL_APPROVED", detail="Executive Admin final approval granted", user_name="Kazi Zahidul Islam"))

        db.add(t2)

    # ── Ticket 3: Vehicle Release (Form 1804 Checklist Completed + Garage Out with Gate Pass) ──
    if not db.scalar(select(Ticket.id).where(Ticket.ticket_no == "REL-2026-0001")):
        t3 = Ticket(
            ticket_no="REL-2026-0001",
            type="VEHICLE_RELEASE",
            title="Pre-Trip Vehicle Release & Gate Pass (Coach 101)",
            description="Routine pre-departure inspection and garage exit authorization for Dhaka - Chittagong morning trip.",
            priority="NORMAL",
            status="GARAGE_OUT",
            bus_id=bus1.id,
            branch_id=dhk_branch.id,
            driver_name="Abdul Mannan",
            odometer_km=142500,
            gate_pass_no="GP-2026-0001",
            garage_out_by="Md. Rafiqul Hasan",
            garage_out_at=datetime.utcnow() - timedelta(minutes=45),
            completed_at=datetime.utcnow() - timedelta(hours=1),
            created_by_id=3,
            created_by_name="Md. Rafiqul Hasan",
            submitted_at=datetime.utcnow() - timedelta(hours=4),
        )
        t3.approvals.append(TicketApproval(step=1, status="DONE", user_name="Md. Rafiqul Hasan", acted_at=datetime.utcnow() - timedelta(hours=3)))
        t3.approvals.append(TicketApproval(step=2, status="DONE", user_name="Engr. Tanvir Ahmed", acted_at=datetime.utcnow() - timedelta(hours=2)))
        t3.approvals.append(TicketApproval(step=3, status="DONE", user_name="Kazi Zahidul Islam", acted_at=datetime.utcnow() - timedelta(hours=1, minutes=30)))

        # Checklist Form 1804 items all verified
        from app.routers.tickets import DEFAULT_CHECKLIST
        for label, label_bn in DEFAULT_CHECKLIST:
            t3.checklist.append(ReleaseChecklistItem(
                label=label,
                label_bn=label_bn,
                checked=True,
                checked_by="Md. Rafiqul Hasan",
                checked_at=datetime.utcnow() - timedelta(hours=1),
                note="OK"
            ))

        t3.events.append(TicketEvent(event="CREATED", detail="Vehicle release checklist initiated", user_name="Md. Rafiqul Hasan"))
        t3.events.append(TicketEvent(event="SUBMITTED", detail="All 3-step approvals completed", user_name="Md. Rafiqul Hasan"))
        t3.events.append(TicketEvent(event="CHECKLIST_COMPLETED", detail="All 11 technical safety checks passed", user_name="Md. Rafiqul Hasan"))
        t3.events.append(TicketEvent(event="GARAGE_OUT", detail="Gate Pass GP-2026-0001 issued. Bus cleared for highway.", user_name="Md. Rafiqul Hasan"))

        db.add(t3)

    db.commit()
    print("✅ Soudia Parts Ticketing demo dataset seeded successfully!")


def main():
    with SessionLocal() as db:
        if "--demo" in sys.argv or True:
            seed_demo(db)
        else:
            Base.metadata.create_all(bind=engine)
            ensure_admin(db)
            ensure_rbac_seeded(db)
            print("Base schema and admin initialized.")


if __name__ == "__main__":
    main()
