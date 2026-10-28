# Soudia Coach Parts Ticketing System (সৌদিয়া পার্টস টিকেটিং সিস্টেম)

A dedicated, enterprise fleet maintenance & parts ticketing management system built specifically for **Soudia Coach Service (সৌদিয়া পরিবহন)**, maintaining the signature **Ocean Wave Crimson (`#ec1e21`)** design theme and component library.

---

## 🎯 Key Capabilities & Architectural Requirements

1. **3-Step Verification Pipeline (৩-ধাপ অনুমোদন পাইপলাইন)**:
   - **Step 1:** Store / Garage Incharge physically inspects parts and verifies (`tickets.verify`).
   - **Step 2:** Operations / Depot Manager reviews route impact and approves (`tickets.approve`).
   - **Step 3:** Executive Super Administrator grants final clearance (`tickets.final_approve`).
   - **Emergency Override:** High-priority highway breakdown override with mandatory audit reason logging (`tickets.override`).

2. **Defective Part Photo Attachments (ছবি সংযুক্তি)**:
   - Direct camera / gallery image uploads of damaged, cracked, or worn parts directly within tickets.
   - Replaces manual WhatsApp image sharing with an audited, permanent photo log.

3. **Bus-to-Bus Parts Transfer (বাস থেকে বাসে পার্টস ট্রান্সফার)**:
   - Facilitates transferring serviceable parts from an off-road / standby coach (Bus A) to an active route coach (Bus B).
   - Simultaneously writes reciprocal history entries to both coaches' permanent log books.

4. **Premature Wear & Lifecycle Tracking (অকাল পার্টস নষ্ট ট্র্যাকিং)**:
   - Live check against previous installation date and mileage.
   - Automatic calculation of actual vs expected lifespan (KM / Days).
   - Enforces root cause failure classification (`POOR_QUALITY`, `ROAD_CONDITION`, `DRIVING`, `ACCIDENT`, `WRONG_INSTALL`, `WEAR_TEAR`).

5. **Form 1804 Vehicle Release Checklist & Gate Pass (ফর্ম ১৮০৪ ও গেটপাস)**:
   - Mandatory multi-point safety verification (Brake test, Air pressure, Steering alignment, Road test, Old parts returned to store).
   - Generates official Gate Pass number (`GP-2026-XXXX`) allowing vehicle to exit workshop.

6. **Bilingual UI (বাংলা + ইংরেজি)**:
   - English and Bengali labels across all ticket stages, forms, approval steps, and fleet status cards.

7. **Strictly Omitted Inventory / Commercial Sales**:
   - Stock ledgers, supplier quotations, purchase orders, customer invoicing, and showrooms have been completely omitted in favor of fleet maintenance ticketing.

---

## 🏗️ Tech Stack & Database

- **Database:** Local MySQL `parts_ticketing_system` (`root:qaws@127.0.0.1:3306`) with `utf8mb4_unicode_ci`.
- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 ORM, PyMySQL, JWT authentication, RBAC.
  - Port: **4002** (API Proxy `/api/*` and `/uploads/*`)
- **Frontend:** Next.js 16 (Turbopack, App Router), React 19, Vanilla CSS + Tailwind v4 tokens, Lucide Icons.
  - Port: **3003** (Web UI: `http://localhost:3003`)

---

## 🚀 Quick Start (macOS)

### Option 1: Double-Click Startup
Double-click `start_all.command` in the project root. This starts both the Backend and Frontend servers and automatically launches `http://localhost:3003` in your browser.

To stop all services:
Double-click `stop_all.command`.

---

### Option 2: Manual Terminal Commands

#### 1. Start Backend:
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --port 4002 --reload
```

#### 2. Start Frontend:
```bash
cd frontend
npm run start # Or: npm run dev
```

Visit: **`http://localhost:3003`**

---

## 🔑 Demo Staff Accounts

| Username | Password | Role | Responsibility |
| :--- | :--- | :--- | :--- |
| **`admin`** | `Admin@12345` | Super Administrator | Step 3 Final Approval, Emergency Override, RBAC & Settings |
| **`store_ctg`** | `Store@12345` | Store / Garage Incharge | Step 1 Physical Part Verification & Stock Issues |
| **`manager_dhk`** | `Manager@12345` | Operations Depot Manager | Step 2 Operations Approval & Fleet Allocations |
| **`tech_kamal`** | `Tech@12345` | Senior Bus Technician | Ticket Creation, Photo Uploads & Maintenance Completion |
| **`acc_faruk`** | `Acc@12345` | Accounts Officer | Spare Part Unit Costs, Labor & Workshop Ledgers |

---

## 📁 System Route Map

- **`/dashboard`** — Executive KPIs, Pending Approvals Inbox, 14-day Ticket Trends, Top Maintenance Spend Coaches.
- **`/tickets`** — Complete Ticket Registry with Filter Tabs (*All*, *Pending My Approval*, *In Progress*, *Premature*, *Garage Out*).
- **`/tickets/new`** — Multi-type Ticket Creation (*Part Request*, *Replacement with Camera Photos*, *Bus-to-Bus Transfer*, *Work Sheet*, *Release Form*).
- **`/tickets/[id]`** — Detailed 3-Step Verification Pipeline, Photo Gallery, Form 1804 Checklist, Cost Ledger & Gate Pass issuance.
- **`/fleet`** — Coach Registry (*Scania, Hino 1J, Hyundai Universe, Ashok Leyland*) with Odometer and Status badges.
- **`/fleet/history`** — Per-bus and fleet-wide Parts Log Book with Bus-to-Bus mutual transfer tracking.
- **`/branches`** — Operational Depots & Workshop Terminals (*Dhaka Central, Chittagong Port, Sylhet, Khulna*).
- **`/reports`** — Ticket Analytics, Premature Failure Alerts & Printable Executive Maintenance Reports.
- **`/rbac`** — Role & Granular Permission Matrix Checkbox Governance.
- **`/users`** — Staff User Accounts, Depot Assignments & Password Management.
- **`/settings`** — Company Branding, Signature Livery, Logo Upload & Verification Policies.
