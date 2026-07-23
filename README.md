# FSUU SCO/AVR Booking & Reservation System

**Father Saturnino Urios University**
BS Information Technology — Capstone Project

> A unified, security-first online booking and reservation system for two offices at FSUU:
> the **Strategic Communication Office (SCO)** which manages the campus recording studio, and the
> **Audio Visual Room (AVR)** which manages event venues and equipment lending.

---

## Goal

Replace manual, paper-based or chat-based reservation requests with a structured digital system that:

- Lets **students, faculty, and external individuals** submit booking requests online without creating an account
- Lets **SCO and AVR staff** manage, approve, and track requests through a secured dashboard
- Maintains a verifiable audit trail of every approval, rejection, cancellation, and physical handover
- Enforces strict **office-level isolation** (SCO staff cannot see or act on AVR records, and vice versa)

The system is built with security as the primary concern (~70% of the capstone grading weight is security-related). Every architectural decision in this project can be traced back to a confirmed security requirement or a real bug caught and fixed during development.

---

## Offices Covered

| Office | Code | What they manage |
|--------|------|-----------------|
| Audio Visual Room | AVR | Event venues (rooms), equipment lending (projectors, microphones, webcams, etc.) |
| Strategic Communication Office | SCO | Campus recording studio reservations |

Each office is a fully isolated silo. An Admin or Staff account belongs to exactly one office and cannot act on the other office's records.

---

## Who Uses It

| User Type | How they access it | Account needed? |
|-----------|-------------------|-----------------|
| Students, faculty, external individuals | Public booking forms (no login) | ❌ No |
| AVR / SCO Staff | Google OAuth → Staff dashboard | ✅ Yes (created by Admin) |
| AVR / SCO Admin | Google OAuth → Admin dashboard | ✅ Yes (seeded manually) |

---

## Tech Stack

### Backend (`backend/`)
| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Laravel 12 | PHP, Eloquent ORM, Artisan |
| Auth | Laravel Sanctum (token-based) + Google OAuth via Socialite | Socialite handles identity, Sanctum issues the session token |
| Database | MySQL | 23 tables, all migrated and verified |
| Testing | Pest (PHP) | SQLite in-memory, never touches the dev MySQL DB |
| API Style | JSON REST | All endpoints under `/api/`, versioned by route group |

### Frontend (`frontend/`)
| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | React + Vite | |
| Styling | Tailwind CSS v4 + shadcn/UI (Nova preset) | |
| HTTP Client | Axios | Sanctum Bearer token in Authorization header |
| Routing | React Router v6 | |
| Notifications | Sonner (toast library) | |

### Recommended Deployment Target
- **Backend:** Railway.app (free tier — Laravel + MySQL, deploys from GitHub, no server management)
- **Frontend:** Vercel (free tier — React/Vite, deploys from GitHub)
- Both give a real public URL, eliminating XAMPP/localhost availability issues during demos and grading.

---

## System Architecture

```
Public Users (no login)
    └── Public booking forms → POST /api/public/* → Throttled, rate-limited
    └── Booking tracker     → POST /api/public/track → Reference code + email pair

Authenticated Users (Google OAuth → Sanctum token)
    └── Staff  → Permission-scoped dashboard (sees only assigned records)
    └── Admin  → Full office dashboard (all records for their office)
```

### Key Design Principles
1. **Thin controllers** — Controllers only validate the request and call a Service. Business logic lives exclusively in Services.
2. **`$fillable` exclusion** — `reference_code`, `status`, `approved_by`, `submitted_by`, and system FK columns are excluded from `$fillable` on every model. They are written only by the system via `forceCreate()`, never by client input.
3. **Dual audit trail** — Every state change (approve/reject/cancel) writes to both the `approvals` table (approval record with `remarks`) and the `audit_logs` table.
4. **Manual polymorphism** — `approvals`, `documents`, `notification_log`, `entry_verifications`, `inspections`, and `audit_logs` use a manual `reference_type` + `reference_id` pattern (not Laravel `morphTo`) for clarity and simpler queries.
5. **No cross-office access** — Every Policy method that reads records first checks office ownership. This was an explicitly caught bug category during development, found twice.

---

## Database — 23 Tables

### Core Reference
| Table | Purpose |
|-------|---------|
| `offices` | AVR and SCO office records, with `pin_hash` for staff entry gate |
| `users` | Admin and Staff accounts (`role`: `admin` or `staff`) |
| `venues` | Physical rooms managed by each office |
| `equipment_types` | Categories of equipment (Projector, Microphone, etc.) scoped to an office |
| `equipment_units` | Individual physical items with barcode and `unit_status` |
| `venue_equipment_types` | Pivot: which equipment types are available at which venue |
| `reference_counters` | Per-prefix auto-increment for generating reference codes (VN-, EQ-, ST-) |

### Booking / Reservation Tables
| Table | Purpose |
|-------|---------|
| `avr_venue_bookings` | AVR venue booking requests |
| `equipment_borrowings` | Equipment borrowing requests (linked to a venue booking for external users) |
| `equipment_borrowing_items` | Line items per borrowing (one row per equipment type requested) |
| `equipment_borrowing_units` | Barcode-to-item assignment at pickup (maps physical unit to a borrowing item) |
| `sco_studio_reservations` | SCO studio booking requests (single date/time block per reservation) |

### Shared / Audit Tables
| Table | Purpose |
|-------|---------|
| `approvals` | Shared approval/rejection/cancellation records, type-flagged |
| `documents` | Uploaded files (permit letters, etc.) linked to any booking type |
| `notification_log` | Logged notification intents (email/SMS, `status: pending` — actual sending is async) |
| `entry_verifications` | Staff PIN gate records for external AVR walk-ins |
| `inspections` | Post-use condition reports for venues and equipment |
| `audit_logs` | Immutable log of every staff action |

### Permission Tables
| Table | Purpose |
|-------|---------|
| `staff_permissions` | Area + action grants per staff member, issued by their office's Admin |
| `permissions` | _(Legacy — superseded by `staff_permissions`, pending DROP migration after audit)_ |
| `user_permissions` | _(Legacy — superseded by `staff_permissions`, pending DROP migration after audit)_ |

---

## Equipment Status Lifecycles

Two separate status fields on two separate records — do **not** conflate them.

### Borrowing Request Status (`equipment_borrowings.status`)
```
pending → approved → ready_for_pickup → checked_out → returned
                                                      ↘ lost
                                                      ↘ damaged
       ↘ rejected
       ↘ cancelled
```

### Physical Unit Status (`equipment_units.unit_status`)
```
available ←→ checked_out    (normal borrow/return cycle)
available or checked_out → damaged → under_repair → available   (repair cycle)
available or checked_out → lost    (permanent, terminal — no return path)
```
Valid values enforced via `App\Enums\UnitStatus` PHP backed enum.

---

## Permission Model

### Roles
| Role | Scope | Created by |
|------|-------|-----------|
| `admin` | Full access to their office's records | Seeded manually (one per office) |
| `staff` | Permission-scoped, sees only assigned records | Created by their office's Admin |

No cross-office roles. SCO Admin cannot act on AVR records and vice versa.
No self-registration — Admin creates Staff accounts directly.

### Staff Permissions (`staff_permissions` table)
A Staff member has zero permissions by default. Their Admin grants them specific area + action combinations:

| Area | Actions Available |
|------|------------------|
| `equipment_management` | `add_edit`, `assign_checkout` |
| `venue_management` | `add_edit` |
| `equipment_borrowing` | `approve`, `assign_checkout` |
| `venue_booking` | `approve` |
| `inventory` | `add_edit` |
| `reports` | `approve` _(view-only equivalent)_ |

Valid values enforced via `App\Enums\PermissionArea` and `App\Enums\PermissionAction` PHP backed enums.

**Hard rule:** Staff can never edit a venue booking that has reached `approved` status, regardless of any granted permission. Enforced in the Service layer, not the permission table.

### Staff Visibility Scope
Staff members see **only** records explicitly assigned to them (`assigned_to_staff_id = auth()->id()`). They do not see all records in their office. This column is nullable on all three booking tables — a booking can exist unassigned (e.g. immediately after public submission) until an Admin assigns it to a Staff member.

---

## Authentication Flow

```
Staff / Admin Login:
  1. Frontend redirects to Google OAuth (Socialite)
  2. Google confirms identity → callback to Laravel
  3. Laravel looks up or creates the User record
  4. Sanctum issues a token → stored in browser (Authorization header)
  5. All subsequent API calls use Bearer token

Public Users:
  - No login. Booking forms are unauthenticated.
  - Rate-limited: throttle:10,1 on all public form submission and tracking endpoints.
  - Booking lookup requires reference_code + requestor_email pair (prevents enumeration).
```

---

## Frontend Pages

### Public (No Login)
| Route | Page | Purpose |
|-------|------|---------|
| `/` | Landing Page | Explains the system, links to booking forms |
| `/book-venue` | Venue Booking | Public AVR venue booking form |
| `/borrow-equipment` | Equipment Borrowing | Public equipment borrowing form |
| `/track` | Track Booking | Look up booking status by reference code + email |

### Staff Dashboard (Login Required)
| Route | Page | Purpose |
|-------|------|---------|
| `/dashboard` | Overview | Summary stats and activity |
| `/dashboard/bookings` | Bookings List | Approve/reject/cancel venue bookings |
| `/dashboard/borrowing` | Equipment Borrowing | Manage equipment borrowing requests |
| `/dashboard/equipment` | Equipment Inventory | Manage physical units and unit status |
| `/dashboard/venues` | Venue Management | Manage venue records |
| `/dashboard/reports` | Reports | Booking reports, violations, program usage |
| `/dashboard/settings` | Settings | Users, categories, programs, operation hours, PINs |

---

## What Is Built (Backend)

### ✅ Fully Verified (controller + Service + Policy + Pest tests)
- `AvrVenueBookingController` — 4 Pest tests
- `AvrEquipmentBorrowingController` — 7 Pest tests (includes multi-office items rejection)
- `ScoStudioReservationController` — 4 Pest tests
- `DocumentController` — 3 Pest tests
- `InspectionController` — 1 Pest test
- `StaffPinVerificationController` — 2 Pest tests
- `AvrEquipmentBorrowingAssignmentController` — 2 Pest tests _(authorization gap pending fix)_
- `PublicAvrVenueBookingController` — throttled, enum-safe reference tracking
- `PublicTrackingController` — throttle:10,1, enumeration-safe generic error messages
- **30 Pest tests passing, 67 assertions**

### ⏳ Pending / In Progress
- `AvrEquipmentBorrowingAssignmentController` — authorization gap being fixed under new staff permission model
- `UnitStatus` PHP backed enum — pending creation
- `hasPermission()` rewrite on `User` model to query `staff_permissions` instead of old tables
- Drop migration for legacy `permissions` + `user_permissions` tables (after audit confirms zero remaining dependencies)
- Google OAuth / Socialite integration
- Queued Jobs for actual email/SMS delivery (currently only logged as `pending` in `notification_log`)
- Frontend wired to live API (currently uses static/mock data)

### 🚫 Explicitly Out of Scope (Capstone)
- `studio_reservation_dates` multi-date support — deliberately dropped; SCO studio uses single `start_datetime`/`end_datetime` per reservation. Do not reintroduce.
- Cross-office Admin oversight view — deferred to Phase 2
- Repair history log for equipment — simple `unit_status` flag is sufficient

---

## Running Locally

### Backend
```bash
cd backend
cp .env.example .env
# Configure DB_* and GOOGLE_CLIENT_ID/SECRET in .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve          # runs on localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                # runs on localhost:5173
```

### Running Tests
```bash
cd backend
php artisan test           # SQLite in-memory, never touches dev DB
```

---

## Seed Accounts (Development Only)

> ⚠️ The seeder currently uses old role names (`head`, `super_admin`). These will be updated to `admin` as part of the role model migration. Do not use seed credentials in production.

| Email | Role | Office |
|-------|------|--------|
| `director@urios.edu.ph` | head → _admin_ | SCO |
| `staff@urios.edu.ph` | staff | SCO |
| `avrhead@urios.edu.ph` | head → _admin_ | AVR |
| `avrstaff@urios.edu.ph` | staff | AVR |
| `admin@urios.edu.ph` | super_admin → _deprecated_ | SCO |

---

## Closed Decisions Log

| Decision | Rationale |
|----------|-----------|
| Single date block per SCO studio reservation | Multi-date support (`studio_reservation_dates` table) was scoped out for capstone. Do not reintroduce. |
| `nullOnDelete()` on `assigned_to_staff_id` | Booking history must survive Staff account deletion. |
| `restrictOnDelete()` on `staff_permissions.granted_by` | Admin cannot be deleted while they have active grants — preserves accountability trail. |
| `string` not `enum` for `unit_status` | MySQL enum alteration pain; valid values enforced via PHP backed enum instead. |
| `ongoing` status removed | Was a hallucinated status value with no migration backing. Removed per section 4 of architecture update. |
| No OTP/email verification for public submissions | `OtpService`, `PublicOtpController`, and `ValidOtp` rule were deleted — not part of original design. |
| `office_id` explicit in `staff_permissions` | Defense-in-depth against cross-office IDOR. Note: MySQL cannot enforce cross-table CHECK constraints; this is enforced at the application layer. |
