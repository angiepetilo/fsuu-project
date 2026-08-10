# 🏛️ FSUU AVR Venue Booking & Equipment Lending System

**Father Saturnino Urios University (FSUU)**  
*BS Information Technology — Capstone Project*

---

## 📌 Executive Summary (Non-Technical Overview)

Welcome to the **FSUU AVR Facility & Equipment Reservation System**. This digital platform modernizes how Father Saturnino Urios University manages event venues and audio-visual equipment lending across its university campuses (**FSUU Main Campus** and **FSUU Morelos Campus**).

### 🎯 Core Purpose
- **For Students, Faculty & External Guests**: Easily request venue reservations and borrow audio-visual equipment online without needing to create an account or visit offices in person.
- **For Campus Administrators & Office Staff**: Review, approve, track, inspect, and manage facility bookings and equipment loans through secure, campus-isolated dashboards.

---

## 🗺️ Page-by-Page Architectural Breakdown (Frontend to Backend Mapping)

Below is the complete specification of every application page, detailing what each page does and how it connects to its **Frontend Route**, **Backend Controller**, **API Route**, **Eloquent Model**, and **Database Tables**.

---

### 🌐 Public Portals (Guest & Filer Views)

#### 1. Public Landing / Home Page
* **Page Description**: Displays the university welcome banner, facility overview, quick-access links to venue and equipment request forms, and tracking number lookup bar.
* **Frontend Component**: `frontend/src/pages/public/Home.jsx`
* **Frontend Route**: `/`
* **Backend API Routes**:
  - `GET /api/public/venues`
  - `GET /api/public/equipment`
* **Backend Controller**: `PublicVenueBookingController.php`, `PublicEquipmentBorrowingController.php`
* **Eloquent Models**: `Venue.php`, `EquipmentType.php`, `Office.php`
* **Database Tables**: `venues`, `equipment_types`, `offices`

---

#### 2. Public Venue Booking Form
* **Page Description**: Allows filers to submit venue reservation requests (e.g., AVR Hall 1), specify event schedules, filers' details, and select optional built-in equipment items. Generates a unique tracking code (e.g., `TRK-AVR1234`).
* **Frontend Component**: `frontend/src/pages/public/VenueBookingForm.jsx`
* **Frontend Route**: `/booking-form`
* **Backend API Routes**:
  - `GET /api/public/venues`
  - `POST /api/public/venue-bookings`
* **Backend Controller**: `PublicVenueBookingController.php`
* **Eloquent Models**: `AvrVenueBooking.php`, `TrackingNumber.php`, `Venue.php`, `VenueBookingEquipment.php`
* **Database Tables**: `avr_venue_bookings`, `tracking_numbers`, `venues`, `venue_booking_equipment`

---

#### 3. Public Equipment Borrowing Form
* **Page Description**: Form for standalone audio-visual equipment loans (projectors, microphones, cameras). Users specify quantity, requested dates, and event purpose.
* **Frontend Component**: `frontend/src/pages/public/EquipmentBorrowingForm.jsx`
* **Frontend Route**: `/equipment-form`
* **Backend API Routes**:
  - `GET /api/public/equipment-types`
  - `POST /api/public/equipment-borrowings`
* **Backend Controller**: `PublicEquipmentBorrowingController.php`
* **Eloquent Models**: `EquipmentBorrowing.php`, `TrackingNumber.php`, `EquipmentType.php`, `EquipmentBorrowItem.php`
* **Database Tables**: `equipment_borrowings`, `tracking_numbers`, `equipment_types`, `equipment_borrow_items`

---

#### 4. Public Tracking Status Page
* **Page Description**: Allows filers to enter their tracking number (or email) to check real-time request progress (*Pending*, *Approved*, *On-Going*, *Completed*, *Rejected*).
* **Frontend Component**: `frontend/src/pages/public/TrackStatus.jsx`
* **Frontend Route**: `/track-status`
* **Backend API Routes**:
  - `GET /api/public/track/{tracking_code}`
* **Backend Controller**: `PublicTrackStatusController.php`
* **Eloquent Models**: `TrackingNumber.php`, `AvrVenueBooking.php`, `EquipmentBorrowing.php`
* **Database Tables**: `tracking_numbers`, `avr_venue_bookings`, `equipment_borrowings`

---

#### 5. Public Venue Availability Calendar
* **Page Description**: Public interactive calendar showing venue status per day (*Available*, *Partial*, *Fully Booked*, *Under Maintenance*).
* **Frontend Component**: `frontend/src/pages/public/CalendarView.jsx`
* **Frontend Route**: `/calendar`
* **Backend API Routes**:
  - `GET /api/public/venue-calendar`
* **Backend Controller**: `PublicVenueCalendarController.php`
* **Eloquent Models**: `Venue.php`, `AvrVenueBooking.php`, `VenueMaintenance.php`
* **Database Tables**: `venues`, `avr_venue_bookings`, `venue_maintenances`

---

### 🔐 Administrator & Staff Dashboards

#### 6. Admin Institutional Dashboard
* **Page Description**: Executive overview displaying system-wide analytics: metric overview cards, Department Rankings with `OTHERS` percentage, Department Breach bar graph, Equipment Loan Frequency, live pending shift tasks, and compact calendar widget.
* **Frontend Component**: `frontend/src/pages/admin/Dashboard.jsx`
* **Frontend Route**: `/admin/dashboard`
* **Backend API Routes**:
  - `GET /api/admin/dashboard-stats`
  - `GET /api/admin/avr-venue-bookings`
  - `GET /api/admin/equipment-borrowings`
* **Backend Controller**: `AdminDashboardController.php`, `AdminVenueBookingController.php`
* **Eloquent Models**: `AvrVenueBooking.php`, `EquipmentBorrowing.php`, `EquipmentType.php`, `RuleViolation.php`
* **Database Tables**: `avr_venue_bookings`, `equipment_borrowings`, `equipment_types`, `rule_violations`

---

#### 7. Active Venue Bookings Management
* **Page Description**: Manages active venue reservations. Staff can approve requests, conduct post-event inspections, log violations/damages (with 4-step sequence flow for damaged equipment units), attach photo evidence, manage violation types (Admin/Super Admin only), and mark events as complete to archive them.
* **Frontend Component**: `frontend/src/pages/admin/VenueBookings.jsx` & `VenueBookingDetailModal.jsx`
* **Frontend Route**: `/admin/venue-bookings`
* **Backend API Routes**:
  - `GET /api/admin/avr-venue-bookings`
  - `POST /api/admin/avr-venue-bookings/{id}/approve`
  - `POST /api/admin/avr-venue-bookings/{id}/reject`
  - `POST /api/admin/avr-venue-bookings/{id}/complete`
  - `POST /api/admin/inspections`
* **Backend Controller**: `AdminVenueBookingController.php`, `InspectionController.php`
* **Eloquent Models**: `AvrVenueBooking.php`, `Inspection.php`, `EquipmentUnit.php`, `TrackingNumber.php`
* **Database Tables**: `avr_venue_bookings`, `inspections`, `equipment_units`, `tracking_numbers`

---

#### 8. Standalone Equipment Borrowing Management
* **Page Description**: Handles equipment loan workflows. Staff review requests, assign specific equipment unit barcodes, process claims/returns, and log return condition.
* **Frontend Component**: `frontend/src/pages/admin/EquipmentBorrowings.jsx` & `EquipmentBorrowDetailModal.jsx`
* **Frontend Route**: `/admin/equipment-borrowing`
* **Backend API Routes**:
  - `GET /api/admin/equipment-borrowings`
  - `POST /api/admin/equipment-borrowings/{id}/approve`
  - `POST /api/admin/equipment-borrowings/{id}/release`
  - `POST /api/admin/equipment-borrowings/{id}/return`
* **Backend Controller**: `AdminEquipmentBorrowingController.php`, `InspectionController.php`
* **Eloquent Models**: `EquipmentBorrowing.php`, `EquipmentUnit.php`, `EquipmentBorrowItem.php`, `Inspection.php`
* **Database Tables**: `equipment_borrowings`, `equipment_units`, `equipment_borrow_items`, `inspections`

---

#### 9. Manage Venues & Maintenance Override
* **Page Description**: Administrator portal to create, edit, or decommission campus venue facilities, and set maintenance status (blocking public bookings).
* **Frontend Component**: `frontend/src/pages/admin/ManageVenues.jsx`
* **Frontend Route**: `/admin/manage-venues`
* **Backend API Routes**:
  - `GET /api/admin/venues`
  - `POST /api/admin/venues`
  - `PUT /api/admin/venues/{id}`
  - `DELETE /api/admin/venues/{id}`
  - `POST /api/admin/venues/{id}/maintenance`
* **Backend Controller**: `AdminVenueController.php`
* **Eloquent Models**: `Venue.php`, `VenueMaintenance.php`, `Office.php`
* **Database Tables**: `venues`, `venue_maintenances`, `offices`

---

#### 10. Manage Equipment Catalog & Barcodes
* **Page Description**: Catalog management for equipment models and physical units. Allows adding new models, scanning unit barcodes, tracking lifespan health percentages, and setting status (*Available*, *Maintenance*, *Decommissioned*).
* **Frontend Component**: `frontend/src/pages/admin/ManageEquipments.jsx` & `EquipmentModal.jsx`
* **Frontend Route**: `/admin/manage-equipment`
* **Backend API Routes**:
  - `GET /api/admin/equipment-types`
  - `POST /api/admin/equipment-types`
  - `PUT /api/admin/equipment-types/{id}`
  - `DELETE /api/admin/equipment-types/{id}`
  - `GET /api/admin/equipment-units`
* **Backend Controller**: `AdminEquipmentTypeController.php`, `AdminEquipmentUnitController.php`
* **Eloquent Models**: `EquipmentType.php`, `EquipmentUnit.php`, `Office.php`
* **Database Tables**: `equipment_types`, `equipment_units`, `offices`

---

#### 11. Reports & Executive Analytics Module
* **Page Description**: Modular reporting suite containing 3 sub-tabs:
  1. **Venue Booking Reports**: Displays completed violation records with photo lightbox viewer & PDF report generator.
  2. **Department Violation Summary**: Department breach totals (1 count per booking form) & late return statistics.
  3. **Equipment Inventory & Stock Audit**: Real-time stock tracking with Expected Qty, Available Qty ($\text{Expected} - \text{Released} - \text{Damaged} - \text{Lost}$), separate **DAMAGED** and **LOST** columns with `-` / `+` steppers, and save stock report feature.
* **Frontend Component**: `frontend/src/pages/admin/Reports.jsx`, `BookingBorrowingReportTab.jsx`, `BreachesTab.jsx`, `EquipmentStockTab.jsx`
* **Frontend Route**: `/admin/reports`
* **Backend API Routes**:
  - `GET /api/admin/reports/venue-violations`
  - `GET /api/admin/reports/breaches`
  - `GET /api/admin/reports/stock`
  - `PUT /api/admin/equipment-types/{id}`
* **Backend Controller**: `AdminReportController.php`, `AdminEquipmentTypeController.php`
* **Eloquent Models**: `AvrVenueBooking.php`, `EquipmentBorrowing.php`, `RuleViolation.php`, `EquipmentType.php`, `Inspection.php`
* **Database Tables**: `avr_venue_bookings`, `equipment_borrowings`, `rule_violations`, `equipment_types`, `inspections`

---

#### 12. Institutional Audit History Log
* **Page Description**: Permanent archive storing completed/archived venue reservations and equipment loans. Read-only modal hides photo upload controls while allowing staff to audit finished inspections and endorsement letters.
* **Frontend Component**: `frontend/src/pages/admin/HistoryLog.jsx`
* **Frontend Route**: `/admin/history-log`
* **Backend API Routes**:
  - `GET /api/admin/history-logs`
* **Backend Controller**: `AdminHistoryLogController.php`
* **Eloquent Models**: `AvrVenueBooking.php`, `EquipmentBorrowing.php`, `Inspection.php`, `TrackingNumber.php`
* **Database Tables**: `avr_venue_bookings`, `equipment_borrowings`, `inspections`, `tracking_numbers`

---

#### 13. System & Security Settings
* **Page Description**: Account and office settings. Allows updating office profile information, security PIN verification for sensitive actions, and user preferences.
* **Frontend Component**: `frontend/src/pages/admin/Settings.jsx`
* **Frontend Route**: `/admin/settings`
* **Backend API Routes**:
  - `GET /api/admin/settings`
  - `POST /api/admin/settings/update-pin`
  - `POST /api/admin/settings/profile`
* **Backend Controller**: `AdminSettingsController.php`
* **Eloquent Models**: `User.php`, `Office.php`, `Setting.php`
* **Database Tables**: `users`, `offices`, `settings`

---

## 🛠️ Technical Overview & Architecture

### 💡 Non-Technical Analogy: How the Application Works
Imagine this application as a **High-End University Service Counter**:

```
 ┌─────────────────┐       ┌────────────────┐       ┌──────────────────┐       ┌─────────────────┐       ┌──────────────────┐
 │  1. FRONTEND    │ ────> │   2. ROUTE     │ ────> │  3. CONTROLLER   │ ────> │    4. MODEL     │ ────> │   5. DATABASE    │
 │ (Dining Screen) │ <──── │ (Waiter Path)  │ <──── │  (Kitchen Chef)  │ <──── │ (Store Manager) │ <──── │ (Filing Cabinet) │
 └─────────────────┘       └────────────────┘       └──────────────────┘       └─────────────────┘       └──────────────────┘
```

| Component | Technical Name | Non-Technical Analogy | What it does in this Booking System |
| :--- | :--- | :--- | :--- |
| **1. Frontend** | React.js / Vite | **The Customer Service Desk & Screen** | The interactive website page with buttons, forms, tables, and colors that users and admins see on their screens. |
| **2. Route** | Laravel API Routes (`routes/api.php`) | **The Waiter / Order Dispatcher** | The specific Web Address (e.g., `/api/admin/offices`) that directs user clicks from the screen to the right kitchen station. |
| **3. Controller** | Laravel Controllers (`AdminOfficeController`) | **The Head Chef in the Kitchen** | Receives the user request, checks security rules, validates campus location names, creates unique tags (slugs), and prepares the response. |
| **4. Model** | Eloquent Models (`Office.php`, `Venue.php`) | **The Inventory Manager** | Understands the business rules of each record (e.g., "A venue belongs to a campus office", "An office must generate a unique location tag"). |
| **5. Database** | MySQL Database (23 Tables) | **The Master Filing Cabinet / Vault** | The permanent digital storage box where all offices, venues, equipment, users, and booking records are safely saved. |

---

## 🏢 System Architecture & Tech Stack

### Offices Covered

| Office | Code | What they manage | Campus Scope |
|--------|------|-----------------| ------------ |
| Audio Visual Room | AVR | Event venues (rooms), equipment lending (projectors, microphones, etc.) | FSUU Main & FSUU Morelos |

---

## Tech Stack & Architecture

### Backend (`backend/`)
- **Framework**: Laravel 12 (PHP, Eloquent ORM, Artisan)
- **Auth**: Laravel Sanctum (token-based) + Google OAuth via Socialite
- **Database**: MySQL (23 tables, all migrated and verified)
- **Testing**: Pest (PHP, SQLite in-memory)
- **API Style**: JSON REST (`/api/` endpoints)

### Frontend (`frontend/`)
- **Framework**: React + Vite
- **Styling**: Vanilla CSS + Tailwind CSS v4 + Tailwind UI / Lucide Icons
- **HTTP Client**: Axios (`Bearer` token headers)
- **Routing**: React Router v6

---

## 🚀 Running Locally

### 1. Backend Setup
```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve          # runs on http://localhost:8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev                # runs on http://localhost:5173
```

---

## 📋 Closed System Decisions Log

| Decision | Rationale |
|----------|-----------|
| **Campus Isolation** | Multi-campus isolation prevents data bleed between FSUU Main and FSUU Morelos. |
| **Icon-Only Action Buttons** | Reduces clutter on smaller laptop screens while remaining clear and responsive. |
| **Post-Event Inspection Form** | Standardizes physical room handover and accountability after events conclude. |
| **No OTP for Public Booking** | Public forms use tracking code + email lookup for simplified user experience. |
