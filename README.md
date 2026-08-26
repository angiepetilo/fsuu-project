# 🏛️ FSUU AVR Venue Booking & Equipment Lending System

**Father Saturnino Urios University (FSUU)**  
*BS Information Technology — Capstone Project*

This is the repository for the **FSUU AVR Venue Booking & Equipment Lending System**. The project is split into two main components: a **Laravel backend (REST API)** and a **React/Vite frontend (Single Page Application UI)**.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your machine:

* **PHP** (v8.1 or higher)
* **Composer** (for PHP backend dependencies)
* **Node.js & npm** (for React frontend dependencies)
* **MySQL** (or XAMPP / WAMP for local database hosting)
* **Git**

---

## 🚀 Installation & Setup Guide

### 1. Clone the Repository
Open your terminal and clone the repository to your local machine (e.g., inside your workspace or `htdocs` folder):

```bash
git clone https://github.com/angiepetilo/fsuu-project.git
cd fsuu-project
```

---

### 2. Backend Setup (Laravel API)
The backend handles database migrations, authentication, reservation workflows, inspection logs, and REST API endpoints.

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install PHP dependencies:
   ```bash
   composer install
   ```
3. Set up your environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Open `.env` and configure your database connection parameters:
   ```ini
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=fsuu_booking_db   # Create this database in phpMyAdmin / MySQL first!
   DB_USERNAME=root
   DB_PASSWORD=
   ```
5. Generate the application encryption key:
   ```bash
   php artisan key:generate
   ```
6. Run database migrations and seed default administrative accounts:
   ```bash
   php artisan migrate:fresh --seed
   ```
7. Start the backend development server:
   ```bash
   php artisan serve
   ```
   The backend REST API will run at **`http://127.0.0.1:8000`** (or `http://localhost:8000`).

---

### 3. Frontend Setup (React + Vite)
The frontend provides the responsive user interface for public filers, office staff, and system administrators.

1. Open a new terminal window and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Verify environment configuration in `.env`:
   ```ini
   VITE_API_URL=http://localhost:8000/api
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The UI will open in your browser at **`http://localhost:5173`**.

---

## 🔑 Default Administrative Login Credentials

---

## 📌 Development & Design Standards

* **Design Aesthetics**: Built on a modern off-white canvas base (`#F8FAFC`) with high-contrast text (`text-slate-900`), subtle borders (`border-slate-200`), and smooth micro-interactions.
* **Button Guidelines**: Action and footer buttons use clean, neutral outlined styling (`border border-slate-300 bg-white hover:bg-slate-50`). Solid colored action buttons are avoided.
* **Plain Text Status Labels**: Status indicators in headers, tables, and inspection forms use clear plain-text labels rather than distracting solid badge fills:
  * **Good / Available**: Emerald (`text-emerald-600`)
  * **On-Going / Released**: Blue (`text-blue-600`)
  * **Maintenance**: Amber (`text-amber-600`)
  * **Damaged / Rejected / Violation**: Rose (`text-rose-600`)
  * **Completed / Done**: Slate (`text-slate-800`)
* **Icons**: Powered strictly by Lucide SVG icons (`lucide-react`).
* **Zero LocalStorage Business Logic**: Business data (barcode assignments, unit conditions, damage records, stock counts) is stored 100% in the MySQL database. `localStorage` is restricted to user UI state.

---

## 🧾 Reservation & Post-Event Inspection Guidelines

### 1. Automatic Tracking Code Generation
Every submitted venue reservation or equipment borrowing request receives a unique tracking code (e.g., `TRK-AVR1001`). Filers use this code to monitor real-time request progress without needing an account.

### 2. Barcode Assignment & Unit Tracking
When office staff approve an equipment loan or venue booking, specific physical unit barcodes (e.g., `BC-EQP-2026-001`) are assigned directly to the record and stored in the database.

### 3. Post-Event Inspection & Accountability
Upon event conclusion, staff conduct a post-use inspection:
* **Clean Inspection**: Units are returned to `Available` / `Good Condition`.
* **Violation / Damage Inspection**: If an item is reported damaged or lost, photo evidence is uploaded, the violation reason is recorded, and the unit's physical status in `equipment_units` is updated to `Damaged` or `Decommissioned`.
* **Audit Trail**: Inspection details and endorsements remain permanently accessible in the **History Log**.

---

## 🛡️ System Security & Data Protection Architecture

* **Token Authorization (Laravel Sanctum / Bearer Tokens)**: All administrative API endpoints require valid Bearer token headers.
* **Password Hashing (Bcrypt Encryption)**: Credentials are encrypted using one-way Bcrypt hashing (`Hash::make()`).
* **SQL Injection Protection**: Executed via Laravel Eloquent ORM with PDO Parameter Binding.
* **Role-Based Access Control (RBAC)**: Enforces campus isolation between FSUU Main Campus and FSUU Morelos Campus.
* **Sanitized Media Uploads**: Endorsement letters and inspection evidence photos are validated against strict MIME types and stored securely in server storage.

---

## 🗺️ Page-by-Page Architectural Breakdown

### 🌐 Public Portals (Guest & Filer Views)

#### 1. Home / Landing Page (`/`)
* **Description**: University welcome banner, quick-access links to reservation forms, and tracking lookup.
* **Frontend**: `src/pages/public/Home.jsx`
* **API Endpoints**: `GET /api/public/venues`, `GET /api/public/equipment`
* **Tables**: `venues`, `equipment_types`, `offices`

#### 2. Public Venue Booking Form (`/booking-form`)
* **Description**: Request form for venue reservations (AVR Hall 1, Haggenburg Hall) with event purpose, schedules, and built-in equipment choices.
* **Frontend**: `src/pages/public/VenueBookingForm.jsx`
* **API Endpoints**: `GET /api/public/venues`, `POST /api/public/venue-bookings`
* **Tables**: `venue_bookings`, `tracking_numbers`, `venues`, `venue_booking_equipment`

#### 3. Public Equipment Borrowing Form (`/equipment-form`)
* **Description**: Standalone equipment loan request form for projectors, wireless microphones, screens, and cameras.
* **Frontend**: `src/pages/public/EquipmentBorrowingForm.jsx`
* **API Endpoints**: `GET /api/public/equipment-types`, `POST /api/public/equipment-borrowings`
* **Tables**: `equipment_borrows`, `tracking_numbers`, `equipment_types`, `equipment_borrow_items`

#### 4. Public Request Tracking Page (`/track-status`)
* **Description**: Real-time status lookup using reference codes (`TRK-AVR...`).
* **Frontend**: `src/pages/public/TrackStatus.jsx`
* **API Endpoints**: `GET /api/public/track/{tracking_code}`
* **Tables**: `tracking_numbers`, `venue_bookings`, `equipment_borrows`

---

### 🔐 Administrator & Staff Dashboards

#### 5. Institutional Overview Dashboard (`/admin/dashboard`)
* **Description**: Executive dashboard with metric cards, department reservation distribution, violation charts, equipment damage totals, and interactive schedule overview calendar.
* **Frontend**: `src/pages/admin/Dashboard.jsx`
* **API Endpoints**: `GET /api/admin/history-log`, `GET /api/admin/equipment-damages`, `GET /api/avr-venue-bookings`
* **Tables**: `venue_bookings`, `equipment_borrows`, `inspections`, `equipment_units`

#### 6. Venue Bookings Management (`/admin/venue-bookings`)
* **Description**: Review, approve, assign equipment unit barcodes, execute 4-step post-event inspections, log violation photos, and complete reservations.
* **Frontend**: `src/pages/admin/VenueBookings.jsx` & `VenueBookingDetailModal.jsx`
* **API Endpoints**: `GET /api/avr-venue-bookings`, `POST /api/avr-venue-bookings/{id}/approve`, `PUT /api/avr-venue-bookings/{id}/assign-units`, `POST /api/inspections`
* **Tables**: `venue_bookings`, `inspections`, `equipment_units`, `tracking_numbers`

#### 7. Equipment Borrowing Management (`/admin/equipment-borrowing`)
* **Description**: Review standalone borrowing requests, assign unit barcodes, process releases and returns, and log return conditions.
* **Frontend**: `src/pages/admin/EquipmentBorrowings.jsx` & `EquipmentBorrowDetailModal.jsx`
* **API Endpoints**: `GET /api/avr-equipment-borrowings`, `POST /api/avr-equipment-borrowings/{id}/approve`, `PUT /api/avr-equipment-borrowings/{id}/assign-units`
* **Tables**: `equipment_borrows`, `equipment_borrow_items`, `equipment_units`, `inspections`

#### 8. Manage Equipment Catalog & Stock (`/admin/manage-equipment`)
* **Description**: Inventory management of equipment types and physical units. Track barcode numbers, purchased dates, lifespan health, and physical unit statuses (`Available`, `Damaged`, `Decommissioned`).
* **Frontend**: `src/pages/admin/ManageEquipments.jsx` & `EquipmentModal.jsx`
* **API Endpoints**: `GET /api/admin/equipment-types`, `GET /api/admin/equipment-units`, `PUT /api/admin/equipment-units/{id}`
* **Tables**: `equipment_types`, `equipment_units`, `offices`

#### 9. Reports & Executive Analytics Module (`/admin/reports`)
* **Description**: Reporting module featuring 3 tabs:
  1. **Venue Reports**: Completed event records with evidence photo viewer.
  2. **Department Violation Summary**: Department breach counts (ASP, CSP, BAP) and late return statistics.
  3. **Equipment Inventory & Stock Audit**: Real-time stock audit tracking Expected Qty, Released Qty, Damaged Qty, Lost Qty, and Present Available Qty.
* **Frontend**: `src/pages/admin/Reports.jsx`, `EquipmentStockTab.jsx`, `BreachesTab.jsx`
* **API Endpoints**: `GET /api/admin/equipment-types`, `GET /api/admin/equipment-damages`, `GET /api/admin/history-log`
* **Tables**: `equipment_types`, `equipment_units`, `inspections`, `venue_bookings`, `equipment_borrows`

#### 10. Institutional Audit History Log (`/admin/history-log`)
* **Description**: Archived transaction records for completed, cancelled, or rejected reservations.
* **Frontend**: `src/pages/admin/HistoryLog.jsx`
* **API Endpoints**: `GET /api/admin/history-log`
* **Tables**: `venue_bookings`, `equipment_borrows`, `inspections`, `tracking_numbers`

---

## 📄 License & Attribution

Developed for **Father Saturnino Urios University (FSUU)**.  
All rights reserved © 2026 Father Saturnino Urios University.
