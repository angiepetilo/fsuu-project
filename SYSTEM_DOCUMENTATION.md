# Father Saturnino Urios University (FSUU)
## Automated Venue Reservation & Equipment Borrowing Management System
# FSUU Facilities & Equipment Reservation System — System Documentation (v2.3.0)

## Overview & Architecture
This platform provides multi-office, role-based reservation management for Father Saturnino Urios University (FSUU). It handles **Venue Bookings** and **Equipment Borrowings** with real-time stock computation, physical unit barcode tracking, department breach analytics, strict schedule collision prevention, automated email confirmation with tracking codes, and **instant WebSocket broadcasting via Pusher & Laravel Echo**.

---

## ⚡ Real-Time Broadcasting & WebSocket Infrastructure (Pusher & Laravel Echo)

### 1. Broadcast Channels & Events
| Channel Name | Broadcast Event | Trigger Condition | Frontend Listeners & Actions |
| :--- | :--- | :--- | :--- |
| `admin-notifications` | `booking.created` | Public applicant submits venue booking or equipment borrow request. | Admin header displays pop-up toast notification, sound alert, and increments unread badge. |
| `admin-notifications` | `booking.status_updated` | Staff approves, rejects, cancels, or completes a request. | Admin updates notification lists and refreshes queue metrics. |
| `booking.reference_code` | `booking.status_updated` | Request status transitions (`pending` $\rightarrow$ `approved` $\rightarrow$ `ongoing` $\rightarrow$ `completed`). | Public Tracking page (`/track`) auto-advances the step indicator without manual search. |
| `equipment-inventory` | `inventory.updated` | Units released, returned, or marked damaged/lost during inspection. | Manage Equipment table & Master Category Stock table instantly reload shelf counts. |

### 2. Graceful Offline Fallback
- If `VITE_PUSHER_APP_KEY` is not present in `.env`, the frontend initializes a silent dummy channel provider, ensuring the entire application continues operating normally via standard REST APIs without throwing console errors.

---

## 1. System Overview & Purpose

The **FSUU Automated Venue Reservation & Equipment Borrowing Management System** is an enterprise-grade institutional web platform designed to streamline, automate, and centralize facility scheduling and physical asset management for Father Saturnino Urios University.

### Primary Objectives:
- **Public Convenience**: Enable students, faculty, staff, and external clients to easily book campus venues and borrow institutional equipment online with real-time availability checks.
- **Strict Collision & Double-Booking Prevention**: Prohibit overlapping bookings on the same venue, date, and time slot. Prevent users from advancing to detail entry if a conflict is detected.
- **End-to-End Email Notifications**: Automatically dispatch rich email receipts containing the official Tracking Reference Code, venue details, scheduled dates/times, and direct status lookup links.
- **Document & Endorsement Verification**: Seamlessly upload and preview signed endorsement letters (PDF/PNG/JPG) with Cloudinary cloud storage and direct admin lightbox verification.
- **Granular Asset Accountability**: Track physical equipment down to unique serial barcodes (e.g., `MAIN-PRJ-001`), monitoring individual equipment conditions (*Good*, *Damaged*, *Lost*) through mandatory post-event inspections.
- **Multi-Category & Multi-Unit Support**: Seamlessly support borrowing requests containing multiple equipment categories with multiple physical units, tracking each unit's individual inspection outcome.
- **Institutional Department Governance**: Automatically charge and monitor policy breaches, damaged assets, lost items, and overdue returns against the university's 9 academic colleges.
- **Administrative Transparency**: Offer role-based dashboards for Staff, Office Managers, and Super Administrators with detailed audit trails, fee matrices, and historical reports.

---

## 2. Technology Stack & Architecture

```
+-----------------------------------------------------------------------+
|                           CLIENT LAYER                                |
|  React 18  *  Vite  *  Tailwind CSS  *  Lucide Icons  *  Axios       |
+-----------------------------------------------------------------------+
                                  |
                                  | REST API (JSON / Multipart Form-Data)
                                  v
+-----------------------------------------------------------------------+
|                          APPLICATION LAYER                            |
|  Laravel 11 (PHP 8.2+)  *  Sanctum Auth  *  Form Requests  * Policies |
+-----------------------------------------------------------------------+
                                  |
                                  | Eloquent ORM / Query Builder
                                  v
+-----------------------------------------------------------------------+
|                           DATABASE LAYER                              |
|  MySQL / MariaDB / SQLite / TiDB (Relational Schema, Soft Deletes)    |
+-----------------------------------------------------------------------+
```

### Frontend Architecture:
- **Framework**: React 18 with Vite bundling.
- **Routing**: `react-router-dom` with role-based layout guards (`SysadLayout`, `AdminLayout`).
- **Styling**: Tailwind CSS with custom responsive utilities, plain minimalist cards, and modern UI tokens.
- **Icons & UI Utilities**: `lucide-react`, `date-fns`, `sonner` notifications.

### Backend Architecture:
- **Framework**: Laravel 11.
- **Authentication**: Laravel Sanctum (token-based API authentication) and Google OAuth 2.0.
- **Authorization**: Granular Policy classes (`VenueBookingPolicy`, `EquipmentBorrowingPolicy`).
- **Cloud Media Storage**: Cloudinary integration (`MediaUploadService`) with fallback to local public disk.
- **Mail Pipeline**: Queueable Mails (`BookingConfirmationMail`, `BookingStatusUpdateMail`) with dual-mailer retry (Resend / SMTP).
- **Analytics & History**: `HistoryLogService`, `DepartmentAnalyticsController`, and `InspectionService`.

---

## 3. Academic Structure (FSUU Colleges)

The system is seeded and configured to support the 9 official colleges of Father Saturnino Urios University:

1. **College of Information, Technology, Entertainment, and Computing (CITEC)**
2. **College of Criminal Justice Education (CCJE)**
3. **College of Teacher Education (CTE)**
4. **College of Accountancy (CoA)**
5. **College of Nursing (CoN)**
6. **College of Arts and Sciences (CAS)**
7. **College of Operations, Resources, and Entrepreneurship (CORE)**
8. **College of Engineering and Technology (CEnTech)**
9. **College of Innovative Hospitality and Tourism (CIHT)**

---

## 4. User Roles & Permission Hierarchy

| Role | Identifiers | Scope & Responsibilities | Portal URL |
| :--- | :--- | :--- | :--- |
| **Public User** | Unauthenticated | Submits venue reservations, files equipment requests, uploads endorsements, and tracks request status via Reference Code. | `/`, `/book-venue`, `/borrow-equipment`, `/track` |
| **Staff** | `role: staff` | Handles day-to-day front desk operations: scans/assigns unit barcodes, verifies endorsement letters, marks requests as *On-Going* (release), and performs post-inspections. | `/admin/*` |
| **Office Manager (Admin)** | `role: admin` | Manages facility operations: reviews & approves/rejects bookings, manages venue catalog, requests new equipment categories, and oversees staff. | `/admin/*` |
| **Super Admin (SysAd)** | `role: super_admin` | Full institutional authority: manages user accounts/invitations, approves equipment categories, configures operating hours, sets fee matrices, and oversees global audit logs. | `/sysad/*` |

---

## 5. End-to-End System Lifecycles & Workflows

### 5.1. Equipment Category Request & Catalog Setup Workflow

```mermaid
graph TD
    A["1. Office Manager Submits Category Request<br>(Proposed Name + Justification)"] --> B["2. Super Admin Reviews Request<br>(in SysAd Settings)"]
    B --> C{"Decision"}
    C -- "Approve" --> D["3. Official Category Created in Master Catalog"]
    D --> E["4. Office Manager Registers Physical Units & Barcodes<br>(MAIN-PRJ-001, MAIN-PRJ-002) in Manage Equipment"]
    E --> F["5. Category Published to Public Booking Pages"]
    C -- "Reject" --> G["Request Marked Rejected"]
```

1. **Category Request**: An Office Manager submits a proposed equipment category (e.g., *"Wireless Lapel & Handheld Microphone Set"*) with a justification.
2. **Super Admin Approval**: Super Admin approves the category in `Sysad Settings → Category Requests`, creating the official `EquipmentType` record.
3. **Physical Barcoding**: Office Managers add physical units under the category in `Manage Equipment`, setting initial condition (*Good*), lifespan, and purchase date.
4. **Public Availability**: The category and its dynamic real-time stock become immediately bookable on the public portal.

---

### 5.2. Public Venue Reservation Workflow (Updated System Flow)

```mermaid
graph TD
    S1["Step 1: Role / Identity Selection<br>(Student / Faculty / External / Admin)"] --> S2["Step 2: Venue Selection, Date & Time Picker<br>+ Live Schedule Collision Checking"]
    S2 --> S2A{"Collision or Invalid Range?"}
    S2A -- "Yes (Overlapping Booking / Past / End < Start)" --> S2B["BLOCK Proceeding<br>Disable 'Next: Fill Details' Button<br>Show Red Warning Banner"]
    S2A -- "No (Available & Valid)" --> S2C{"Requires Admin PIN?<br>(Outside Hours / Multi-Day / External)"}
    S2C -- "Yes" --> S2D["Prompt Admin Verification PIN Modal"]
    S2D --> S3["Step 3: Filer & Event Details<br>+ Equipment Add-On Selection"]
    S2C -- "No" --> S3
    S3 --> S4["Step 4: Endorsement Letter Upload<br>(PDF/PNG/JPG) & Policy Agreement"]
    S4 --> S5["Submission (Multipart/Form-Data)<br>Pessimistic Lock & Overlap Validation"]
    S5 --> S6["Generate Tracking Code (TRK-AVR...)<br>Save to Documents Table<br>Dispatch Real-Time WebSocket Event"]
    S6 --> S7["Send Automated Confirmation Email<br>to Requestor with Tracking Code & Schedule"]
    S7 --> S8["Admin/Staff Portal Review<br>View Accurate Endorsement Preview<br>Approve / Reject / Assign Equipment"]
    S8 --> S9["Event Concludes -> Conduct Post-Inspection<br>Archive Record in History Log"]
```

#### Detailed Breakdown of Venue Reservation Steps:

1. **Step 1 — Identity & Role Selection**:
   - The filer selects their institutional identity: *Student*, *Faculty / Staff*, *External Client*, or *Admin Walk-in*.
2. **Step 2 — Venue Selection, Multi-Day Extensions & Conflict Validation**:
   - **Calendar Availability**: Calendar displays color-coded badges (*Available*, *Partially Booked*, *Fully Booked*).
   - **Real-Time Overlap Detection**: As soon as a venue, date, start time, end time, and optional multi-day end date are selected, the system calculates time-slot intersections against all active (`pending`, `approved`) reservations.
   - **Strict Automatic Blocking**: If an overlapping reservation exists:
     - A prominent red banner informs the user: *"Time Slot Blocked / Already Reserved! [Venue] is already booked on [Date] from [Start Time] to [End Time]. You cannot proceed to fill details for an overlapping schedule."*
     - The **"Next: Fill Details"** button is **automatically disabled**.
     - `handleStep2Next()` prevents advancing to Step 3.
   - **Multi-Day End Date Rule**: `Reservation End Date` must be equal to or ahead of `date_of_usage` (`min={selectedDate}`). `timeEnd` must be strictly later than `timeStart` on single-day bookings.
   - **Verification PIN Modal**: If the booking spans multiple days, falls outside official hours (7:30 AM – 5:00 PM), or is requested by an external client, an AVR Head / Admin Authorization PIN is required.
3. **Step 3 — Filer Information & Equipment Selection**:
   - Filer enters Full Name, Email Address, Contact Number, Academic Department/Office, Event Purpose, and Expected Attendee Count.
   - Selects optional AVR equipment add-ons (Projectors, HDMI cables, Projector Screens, Microphones) with real-time stock limits.
4. **Step 4 — Endorsement Document Upload & Policy Agreement**:
   - Filer uploads signed endorsement letter / clearance document (PDF, PNG, JPG up to 10MB).
   - Checks the institutional policy and safety rules acknowledgment checkbox.
5. **Backend Processing & Email Dispatch**:
   - `VenueBookingController` uploads the file via `MediaUploadService` to Cloudinary/Local storage.
   - `VenueBookingService` executes a `lockForUpdate()` transaction, re-verifies date/time collision, generates a unique Tracking Reference Code (`TRK-AVR####`), and inserts the record into `venue_bookings`, `documents`, and `tracking_numbers`.
   - `SendBookingConfirmationJob` eagerly loads relational models and sends `BookingConfirmationMail` to the requestor with full venue details and tracking link.
   - Pusher broadcasts `booking.created` to admin dashboards.
6. **Admin Verification & Lightbox Modal**:
   - Office Managers view the booking in the Admin portal.
   - [VenueBookingInfo.jsx](file:///c:/Booking%20system/frontend/src/pages/admin/components/booking-modal/VenueBookingInfo.jsx) resolves the exact uploaded endorsement document directly from `selected.endorsement_url` or `documents` table without placeholder image corruption.
   - Clicking "Open Document" or "Open External" in [EvidenceLightboxModal.jsx](file:///c:/Booking%20system/frontend/src/pages/admin/components/booking-modal/EvidenceLightboxModal.jsx) opens the original PDF or image in high definition.

---

### 5.3. Public Equipment Borrowing Workflow

1. **Step 1 (Usage Date & Time)**: Borrower selects usage date, start/pickup time, and return time.
2. **Step 2 (Equipment Selection)**: Borrower browses equipment category cards and specifies requested quantities. The available counter live-decrements as the user increments selection quantity:
   $$\text{Remaining Available} = \max(0, \text{Total Available} - \text{Selected Quantity})$$
3. **Step 3 (Filer Details & Place of Use)**: Borrower inputs contact information, college/program, campus place of use, purpose, and attaches endorsement document.
4. **Submission**: Unique tracking number generated (`EQ-2026-####`), confirmation email dispatched, and status set to `PENDING`.

---

### 5.4. Unit Assignment, Release & Multi-Tab Synchronization

```
+---------------------------------------------------------------------------------------------------+
|                                 INVENTORY STOCK & MASTER TABLE                                    |
|  ITEM NO. | CATEGORY | TOTAL STOCK | QTY PRESENT | RESERVED | RELEASED | DAMAGED | LOST | NOTES |
+---------------------------------------------------------------------------------------------------+
```

```mermaid
flowchart TD
    A[Public Portal: Request Created] -->|Reserved Count +Qty| B[Inventory / Category Table: RESERVED]
    B --> C[Admin Portal: Unit Assignment in Borrow Modal]
    C -->|Barcodes Assigned e.g. MAIN-PRJ-001| D[Manage Equipment: Unit Status = BORROWED]
    D -->|Mark as Ongoing / Released| E[Inventory: RELEASED Count +Qty, RESERVED Decrements]
    E --> F[Return & Inspection Process]
    F -->|Step 1: Update Physical Units| G[Manage Equipment: Unit Status = DAMAGED / LOST / AVAILABLE]
    F -->|Step 2: Update Category Stock| H[Inventory Stock: QTY PRESENT updated, DAMAGED/LOST incremented]
    F -->|Step 3: Log Inspection Record| I[Booking & Borrowing Report Tab: VIOLATION Badge]
    F -->|Step 4: Department Analytics| J[Rule & Late Violations Tab: Dept Breach +1]
    F -->|Step 5: Archive Record| K[Complete History: Read-Only Inspection Modal]
```

1. **Unit Assignment (`Status: APPROVED`)**:
   - Staff/Admin selects specific operational barcodes from the dropdown (e.g., `MAIN-PRJ-001`, `MAIN-PRJ-002`).
   - Category inventory displays quantity in the `RESERVED` column, protecting units from double-allocation.
2. **Hand-over / Event Start (`Status: ON-GOING`)**:
   - Staff clicks **"Set On-Going / Release"**.
   - Unit barcodes transition to status `released` / `borrowed`.
   - `RESERVED` decrements to 0; `RELEASED` increases by assigned quantity.
3. **Return & Post-Inspection (`Status: COMPLETED`)**:
   - Staff inspects each unit independently (*Good*, *Damaged*, *Lost*).
   - **Timeliness Check**: Staff records if returned *On Time* or *Late Return* (with minutes overdue).

---

### 5.5. Multi-Category & Multi-Unit Inspection Tracking

When a single borrowing contains **multiple categories** and **multiple units per category**, the system records every unit individually:

```json
{
  "inspectable_type": "App\\Models\\EquipmentBorrow",
  "assigned_units": ["MAIN-PRJ-004", "MAIN-PRJ-005", "MAIN-MIC-002", "MAIN-MIC-003", "MAIN-CBL-002", "MAIN-CBL-003"],
  "unit_conditions": {
    "MAIN-PRJ-004": "Good",
    "MAIN-PRJ-005": "Damaged",
    "MAIN-MIC-002": "Good",
    "MAIN-MIC-003": "Lost",
    "MAIN-CBL-002": "Good",
    "MAIN-CBL-003": "Good"
  },
  "violation_type": "Mixed Units Damage & Loss",
  "notes": "Projector MAIN-PRJ-005 lamp failure; Mic MAIN-MIC-003 clip declared lost."
}
```

---

## 6. Seeded Facilities & Master Equipment Inventory

### 6.1. Seeded Venues
| Venue Name | Seating Capacity | Location | Type |
| :--- | :--- | :--- | :--- |
| **AVR 1 (Audio-Visual Room 1)** | 100 persons | FSUU Main Campus | AVR / Conference |
| **AVR 2 (Audio-Visual Room 2)** | 300 persons | FSUU Main Campus | Auditorium / Large AVR |
| **HAGGENBURG HALL** | 400 persons | FSUU Main Campus | Grand Multi-purpose Hall |

### 6.2. Seeded Equipment Categories
| Equipment Category | Unit Code Prefix | Default Stock | Barcode Examples |
| :--- | :--- | :--- | :--- |
| **Projector** | `PRJ` | 5 units | `MAIN-PRJ-001` to `MAIN-PRJ-005` |
| **HDMI** | `HDMI` | 5 units | `MAIN-HDMI-001` to `MAIN-HDMI-005` |
| **Projector Screen** | `SCR` | 5 units | `MAIN-SCR-001` to `MAIN-SCR-005` |
| **Camera** | `CAM` | 5 units | `MAIN-CAM-001` to `MAIN-CAM-005` |
| **Microphone** | `MIC` | 5 units | `MAIN-MIC-001` to `MAIN-MIC-005` |
| **Wireless Microphone** | `WMIC` | 5 units | `MAIN-WMIC-001` to `MAIN-WMIC-005` |

---

## 7. Core System Modules & Features

### 7.1. Public Portal
- **Landing Page (`/`)**: Gateway for venue booking, equipment borrowing, and status tracking.
- **Venue Booking Form (`/book-venue`)**: 4-step wizard with live collision blocking, multi-day support, and endorsement letter upload.
- **Equipment Borrowing Form (`/borrow-equipment`)**: 3-step wizard with live stock calculation per time window.
- **Tracking & Status Lookup (`/track`)**: Public tracking portal allowing requestors to view progress, approvals, and claim details using their Reference Code.

### 7.2. Facility & Venue Management (`/admin/manage-venues`)
- Create, update, and soft-delete university venues.
- Configure seating capacities, room amenities, and facility photos.
- 12-column responsive layout (7-col calendar, 5-col form) with plain minimalist cards.
- Isolated venue availability overrides strictly keyed by `${venueId}_${date}`.
- Gantt Timeline Matrix calibrated strictly to operating hours (7:00 AM – 7:00 PM).

### 7.3. Equipment & Inventory Management (`/admin/manage-equipments`)
- Register physical units with unique barcodes, serial numbers, purchase dates, and lifespan years.
- Live inventory stock table showing **Item No.**, **Category**, **Total Stock**, **Qty Present**, **Reserved**, **Released**, **Damaged**, and **Lost**.
- Direct barcode copy-to-clipboard functionality.

### 7.4. Reports & Departmental Analytics (`/admin/reports`)
- **Booking & Borrowing Reports Tab**: Comprehensive table showing all historical bookings and borrowings with `CLEAN` or `VIOLATION` outcome tags.
- **Rule & Late Violations Tab (`BreachesTab`)**: Real-time analytics breakdown tracking departmental violations across 4 categories:
  1. *Venue Violations & Facility Damage*
  2. *Late Equipment Returns (with delay duration)*
  3. *Equipment Damage*
  4. *Equipment Lost*
- **Equipment Stock Tab**: Live synchronization of physical units with master categories.

### 7.5. Super Admin System Control (`/sysad/settings`)
- **User Management**: Invite staff, assign roles (`staff`, `admin`, `super_admin`), and toggle permissions.
- **Equipment Catalog**: Approve category requests and manage master categories.
- **Venue Catalog**: Manage university-wide facilities and room configurations.
- **Fee Matrix**: Configure rental prices, student discounts, overtime surcharges, and damage penalties.
- **Operating Hours**: Define standard opening/closing hours and minimum lead-time notice.
- **Verification PIN**: Set high-security master PIN for emergency administrative overrides.
- **Departments & Colleges**: Manage university academic departments.

---

## 8. Database Schema & Key Data Models

```
+-------------------+       +-----------------------+       +---------------------+
|      venues       |       |    equipment_types    |       |   equipment_units   |
+-------------------+       +-----------------------+       +---------------------+
| id (PK)           |       | id (PK)               |       | id (PK)             |
| name              |       | eq_name               |       | equipment_type_id   |
| capacity          |       | office_id             |       | unit_code (barcode) |
| location          |       | description           |       | status              |
| status            |       | avatar                |       | condition           |
| office_id         |       | is_active             |       | purchased_at        |
+-------------------+       +-----------------------+       | eq_lifespan         |
                                                            +---------------------+
                                                                       |
+-------------------+       +-----------------------+                  |
|  tracking_numbers |       |    venue_bookings     |                  |
+-------------------+       +-----------------------+                  |
| id (PK)           |       | id (PK)               |                  |
| reference_code    |       | tracking_number_id    |                  |
| status            |       | venue_id              |                  |
| reservation_type  |       | filer_name            |                  |
| reservation_id    |       | email_address         |                  |
| approved_by       |       | program_office (dept) |                  |
+-------------------+       | date_of_usage         |                  |
                            | reservation_end_date  |                  |
+-------------------+       | time_start / time_end |                  |
|     documents     |       | assigned_units (JSON) |------------------+
+-------------------+       +-----------------------+                  |
| id (PK)           |                                                  |
| venue_booking_id  |       +-----------------------+                  |
| file_path         |       |   equipment_borrows   |                  |
| document_type     |       +-----------------------+                  |
+-------------------+       | id (PK)               |                  |
                            | tracking_number_id    |                  |
+-------------------+       | filer_name            |                  |
|    inspections    |       | program_office (dept) |                  |
+-------------------+       | date_of_usage         |                  |
| id (PK)           |       | time_start / time_end |                  |
| inspectable_type  |       | assigned_units (JSON) |------------------+
| inspectable_id    |       +-----------------------+
| condition         |
| is_late (boolean) |
| minutes_late      |
| violation_type    |
| unit_conditions   |
| notes             |
+-------------------+
```

---

## 9. API Route Reference

### Public Routes (`/api/public/*`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/public/venues` | Lists all active venues for public booking |
| `GET` | `/public/venue-bookings` | Lists pending/approved reservations for calendar collision checks |
| `GET` | `/public/equipment-types` | Lists equipment categories with live dynamic stock |
| `GET` | `/public/departments` | Lists academic departments and colleges |
| `GET` | `/public/operating-hours` | Gets current institutional operating hours |
| `POST` | `/public/avr-venue-bookings` | Submits a new venue reservation request with endorsement file |
| `POST` | `/public/avr-equipment-borrowings` | Submits a new equipment borrowing request |
| `POST` | `/public/track` | Looks up booking status by Reference Code |

### Authenticated Admin & Staff Routes (`/api/*`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/admin/equipment-types` | Master equipment categories list |
| `POST` | `/admin/equipment-types` | Creates a new equipment category |
| `GET` | `/admin/equipment-units` | Lists all physical equipment barcodes and status |
| `POST` | `/admin/equipment-units` | Registers a new physical unit |
| `PUT` | `/admin/equipment-units/{id}` | Updates physical unit details / condition |
| `GET` | `/admin/history-log` | Returns completed bookings with inspection reports |
| `POST` | `/admin/history-log/undo` | Reverts completed booking back to on-going |
| `GET` | `/admin/department-analytics` | Department rule violations and late return analytics |
| `POST` | `/admin/equipment-borrowings/{id}/return-inspect` | Submits post-return inspection with unit condition map |

---

## 10. Security, Data Protection & Maintenance

1. **Pessimistic Row Locking**: `->lockForUpdate()` is used during booking submissions inside `DB::transaction(...)` to eliminate race conditions and double-bookings.
2. **Strict Time Overlap Guarding**: Overlap validation runs on both client-side and server-side, evaluating single-day and multi-day date/time intersections.
3. **Cloud Media Integrity**: Uploaded endorsements are uploaded to Cloudinary/local storage with HTTPS URLs and tied to the `documents` relational table, preventing placeholder image substitution.
4. **Automated Notification Queue**: Queued mail jobs serialize booking relationships safely and use dual-mailer fallback (SMTP / Resend) to guarantee delivery of tracking codes.
5. **Soft Deletes**: Critical assets utilize `SoftDeletes` (`archived_at` column) to prevent accidental permanent data loss.

---

## 11. Production Deployment Guide & Complete Environment Variables (Render & Vercel)

### 11.1. Render (Backend Laravel REST API) Environment Variables
In your **Render Dashboard** $\rightarrow$ **Laravel Web Service** $\rightarrow$ **Environment**, configure the following keys:

| Environment Variable Key | Production Example Value | Purpose / Description |
| :--- | :--- | :--- |
| `APP_NAME` | `FSUU Reservation System` | Application institutional name |
| `APP_ENV` | `production` | Production environment flag |
| `APP_DEBUG` | `false` | Disables debug stacktraces in production |
| `APP_KEY` | `base64:...` | Laravel encryption key (`php artisan key:generate`) |
| `APP_URL` | `https://your-backend.onrender.com` | Live Render backend URL |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` | Live Vercel frontend URL for CORS & tracking links |
| `DB_CONNECTION` | `pgsql` / `mysql` / `sqlite` | Production database connection driver |
| `DB_HOST` | `dpg-xxxx.render.com` | Database host |
| `DB_DATABASE` | `fsuu_booking_db` | Database schema name |
| `DB_USERNAME` | `fsuu_user` | Database username |
| `DB_PASSWORD` | `your_secure_db_password` | Database password |
| `BROADCAST_CONNECTION` | `pusher` | Enables Pusher real-time WebSocket broadcasting |
| `PUSHER_APP_ID` | `2186773` | Pusher application ID |
| `PUSHER_APP_KEY` | `89f3021817090b62bd2f` | Pusher public application key |
| `PUSHER_APP_SECRET` | `65d7106cdb9b525a1bfc` | Pusher private application secret |
| `PUSHER_APP_CLUSTER` | `ap1` | Pusher Asia-Pacific server cluster |
| `CLOUDINARY_URL` | `cloudinary://243499257123114:Axo0_LVuSCam2Ojb98In0cY8mL0@tymkk5ea` | Cloudinary persistent media storage (venues, gear, endorsements) |
| `MAIL_MAILER` | `smtp` / `resend` | Mail driver for sending confirmation & tracking emails |
| `MAIL_HOST` | `smtp-relay.brevo.com` | SMTP host |
| `MAIL_PORT` | `587` | SMTP port |
| `MAIL_USERNAME` | `b59e96001@smtp-brevo.com` | SMTP login |
| `MAIL_PASSWORD` | `xsmtpsib-...` | SMTP API / app password |
| `MAIL_FROM_ADDRESS` | `noreply@urios.edu.ph` | Sender email address for automated receipts |
| `MAIL_FROM_NAME` | `FSUU Facilities & Equipment` | Sender display name |

---

### 11.2. Vercel (Frontend React SPA) Environment Variables
In your **Vercel Dashboard** $\rightarrow$ **Project Settings** $\rightarrow$ **Environment Variables**, configure the following:

| Environment Variable Key | Production Example Value | Purpose / Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com/api` | Direct HTTPS pointer to your live Render backend API |
| `VITE_PUSHER_APP_KEY` | `89f3021817090b62bd2f` | Public Pusher key for live Laravel Echo connection |
| `VITE_PUSHER_APP_CLUSTER` | `ap1` | Pusher server cluster region |

---

*Documentation Version: 2.3.0*  
*Father Saturnino Urios University (FSUU)*  
*Automated Venue Reservation & Equipment Borrowing Management System*
