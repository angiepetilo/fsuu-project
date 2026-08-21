# Father Saturnino Urios University (FSUU)
## Automated Venue Reservation & Equipment Borrowing Management System
# System Documentation (v2.4.0)

## Overview & Architecture
This platform provides multi-office, role-based reservation management for Father Saturnino Urios University (FSUU). It handles **Venue Bookings** and **Equipment Borrowings** with real-time stock computation, physical unit barcode tracking, department breach analytics, strict schedule collision prevention, automated email confirmation with tracking codes, role-based incident alerting, and **instant WebSocket broadcasting via Pusher & Laravel Echo**.

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
- **Strict Email Delivery for Venue Bookings**: Automatically dispatch rich email receipts containing the official Tracking Reference Code, venue details, scheduled dates/times, and direct status lookup links strictly via email.
- **Document & Endorsement Verification**: Seamlessly upload and preview signed endorsement letters (PDF/PNG/JPG) with Cloudinary cloud storage and direct admin lightbox verification.
- **Dynamic Equipment Lifecycle & Inventory Triggers**:
  - Automatically moves requested equipment counts into **Reserved** upon booking submission.
  - Automatically transitions assigned physical units to **Released / In-use** upon release.
  - Dynamically processes post-event inspections:
    - **Good**: Restores unit to **Available** status and **Good** condition, immediately restocking available inventory.
    - **Damaged**: Updates unit to **Unavailable** status and **Damaged** condition, logging into the damaged asset register.
    - **Lost**: Updates unit to **Unavailable** status and **Lost** condition, logging into the lost asset register.
- **Multi-Category & Multi-Unit Support**: Seamlessly support borrowing requests containing multiple equipment categories with multiple physical units, tracking each unit's individual inspection outcome.
- **Institutional Department Governance**: Automatically charge and monitor policy breaches, damaged assets, lost items, and overdue returns against the university's 9 academic colleges.
- **Role-Based Incident Notification System**:
  - Tabbed **Inbox / Archive** notification dropdown with "Archive All" support.
  - **Super Admin**: Receives alerts for Damaged Units, Lost Units, and Policy Violations across all campuses; clicking opens the **Incident Detail Modal** displaying borrower details, unit barcodes, and inspection notes.
  - **Admin & Staff**: Receives office-scoped Venue Bookings, Equipment Borrowings, and Incidents; clicking redirects directly to the booking record or opens the Incident Detail Modal.

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
- **Notification Dropdown**: Tabbed **Inbox / Archive** component (`NotificationDropdown.jsx`) with live badge counts and hover archiving.
- **Incident Modal**: `IncidentDetailModal.jsx` for damaged, lost, and policy violation inspection reports.

### Backend Architecture:
- **Framework**: Laravel 11.
- **Authentication**: Laravel Sanctum (token-based API authentication) and Google OAuth 2.0.
- **Authorization**: Granular Policy classes (`VenueBookingPolicy`, `EquipmentBorrowingPolicy`, `UserPolicy`).
- **Cloud Media Storage**: Cloudinary integration (`MediaUploadService`) with fallback to local public disk.
- **Mail Pipeline**: Queueable Mails (`BookingConfirmationMail`, `BookingStatusUpdateMail`) with dual-mailer retry (Resend / SMTP).
- **Analytics & History**: `HistoryLogService`, `DepartmentAnalyticsController`, and `InspectionService`.

---

## 3. Academic Structure (FSUU Colleges)

The system is configured to support the 9 official colleges of Father Saturnino Urios University:

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

| Role | Identifiers | Scope & Responsibilities | User Management Capabilities | Portal URL |
| :--- | :--- | :--- | :--- | :--- |
| **Public User** | Unauthenticated | Submits venue reservations, files equipment requests, uploads endorsements, and tracks request status via Reference Code. | N/A | `/`, `/book-venue`, `/borrow-equipment`, `/track` |
| **Staff** | `staff` | Reviews and verifies reservations for their assigned office, assigns physical equipment barcodes, releases gear, and conducts post-usage inspections. | Cannot manage user accounts. | `/admin/dashboard` |
| **Admin** | `admin` | Full operational control over their assigned campus office/facility. Manages venues, equipment inventory, fee matrix, and history logs. | Can create and manage **Staff** accounts only. | `/admin/dashboard` |
| **Super Admin** | `super_admin`, `superadmin` | Global administrative oversight across all campuses and offices. Manages system settings, campus offices, global logs, and critical incident alerts. | Can create and manage both **Admin** and **Staff** accounts. | `/sysad/dashboard` |

---

## 5. Notification Bell System & Role-Based Incident Handling

### 5.1. UI Layout
- **Tabs**:
  - **Inbox**: Displays all active/unread notifications with a live numeric counter badge.
  - **Archive**: Displays read and archived notifications for historical tracking.
- **Hover & Batch Actions**:
  - Hovering over an individual notification reveals the archive action button.
  - Bottom **Archive All** button marks all notifications in the current view as read/archived in a single click.

### 5.2. Notification Rules by Role
```
+-----------------------------------------------------------------------------+
|                           SUPER ADMIN NOTIFICATIONS                         |
|  * Damaged Physical Units (Across all campus offices)                       |
|  * Lost Physical Units (Across all campus offices)                          |
|  * Policy Violations (Overdue returns, unauthorized use, damage)            |
|  --> Clicking opens IncidentDetailModal (Borrower info, unit barcode, notes)|
+-----------------------------------------------------------------------------+

+-----------------------------------------------------------------------------+
|                           ADMIN & STAFF NOTIFICATIONS                       |
|  * Venue Bookings (Office-scoped new requests & status updates)             |
|  * Equipment Borrowings (Office-scoped new requests & status updates)       |
|  * Damaged / Lost / Policy Violations (Office-scoped incidents)              |
|  --> Clicking Bookings redirects to record; Clicking Incidents opens Modal   |
+-----------------------------------------------------------------------------+
```

---

## 6. Equipment Quantity Lifecycle & Inspection Triggers

### 6.1. Real-Time Stock Lifecycle
1. **Reservation Phase**:
   - When a booking is submitted or approved, requested equipment quantity is recorded under **Reserved** count.
2. **Release Phase**:
   - Staff assigns specific physical units (e.g., `PRJ-001`, `PRJ-002`) and clicks *"Ready to Release"* / *"Release"*.
   - Physical units transition to status **`In-use` / `Released`**, moving count from **Reserved** to **Released**.
3. **Inspection Phase**:
   - During return inspection in Venue Booking or Equipment Borrowing modals:
     - **`Good`**: Unit status becomes **`Available`** and condition **`Good`**, immediately returning quantity back to available stock.
     - **`Damaged`**: Unit status becomes **`Unavailable`** and condition **`Damaged`**, recording quantity under **Damaged** inventory.
     - **`Lost`**: Unit status becomes **`Unavailable`** and condition **`Lost`**, recording quantity under **Lost** inventory.

### 6.2. Equipment Modal Condition Selector
In **Manage Equipments** (Add & Edit physical unit forms):
- **Good**: Sets Condition to `Good` and Status automatically to `Available`.
- **Damaged**: Sets Condition to `Damaged` and Status automatically to `Unavailable`.
- **Lost**: Sets Condition to `Lost` and Status automatically to `Unavailable`.

---

## 7. API Route Reference

### Public Routes (`/api/public/*`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/public/venues` | Lists all active venues for public booking |
| `GET` | `/public/venue-bookings` | Lists pending/approved reservations for calendar collision checks |
| `GET` | `/public/equipment-types` | Lists equipment categories with live dynamic stock |
| `GET` | `/public/departments` | Lists academic departments and colleges |
| `POST` | `/public/avr-venue-bookings` | Submits a new venue reservation request with endorsement file |
| `POST` | `/public/avr-equipment-borrowings` | Submits a new equipment borrowing request |
| `POST` | `/public/track` | Looks up booking status by Reference Code |

### Authenticated Admin & SysAd Routes (`/api/*`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/admin/notifications` | Office-scoped notifications feed (bookings, borrows, incidents) |
| `POST` | `/admin/notifications/mark-as-read` | Marks a single notification as read |
| `POST` | `/admin/notifications/mark-all-read` | Marks all notifications as read / archived |
| `GET` | `/sysad/notifications` | Global incident notifications feed (damaged, lost, policy violations) |
| `POST` | `/sysad/notifications/mark-as-read` | Marks a single SysAd notification as read |
| `POST` | `/sysad/notifications/mark-all-read` | Marks all SysAd notifications as read / archived |
| `GET` | `/admin/equipment-types` | Master equipment categories list with live stock breakdown |
| `GET` | `/admin/equipment-units` | Lists all physical equipment barcodes and status |
| `PUT` | `/admin/equipment-units/{id}` | Updates physical unit details and condition |
| `GET` | `/admin/history-log` | Returns completed bookings with inspection reports |
| `GET` | `/admin/department-analytics` | Department rule violations and incident analytics |

---

*Documentation Version: 2.4.0*  
*Father Saturnino Urios University (FSUU)*  
*Automated Venue Reservation & Equipment Borrowing Management System*
