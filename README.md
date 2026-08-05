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

## 📊 Current System Status

| Functional Area | Current Status | Non-Technical Description |
| :--- | :---: | :--- |
| **Public Booking Portals** | ✅ **100% Operational** | Students and faculty can submit venue and equipment requests with instant tracking numbers. |
| **Campus Data Isolation** | ✅ **100% Operational** | FSUU Main and FSUU Morelos operate independently. Admin data is strictly isolated by campus. |
| **Venue Availability Calendar** | ✅ **100% Operational** | Shows real-time venue status (*Available*, *Partial*, *Fully Booked*, *Maintenance*) synced across public and admin views. |
| **Reports & Analytics** | ✅ **100% Operational** | Provides actionable tables for venue usage, rule breaches, late returns, and equipment health lifespan. |
| **Post-Event Inspection** | ✅ **100% Operational** | Allows staff to inspect venues after events, record cleanliness or damages, and view official endorsement letters. |
| **Equipment Inventory Control** | ✅ **100% Operational** | Enables full catalog management (Add, Edit, Delete equipment models, track lifespan and health percentages). |
| **History Log Audit** | ✅ **100% Operational** | Stores completed/archived requests with strict campus privacy filtering and one-click undo capability. |

---

## 💡 Key System Features & Recent Enhancements

### 1. 🏢 Campus & Branch Office Isolation
- **FSUU Main Campus & FSUU Morelos Campus Separation**: Each campus administrator sees only the venues, equipment, and records belonging to their respective campus.
- **Strict Data Privacy**: Ensures data from one branch office is never exposed to or modified by administrators of another branch.

### 2. 📅 Real-Time Calendar & Maintenance Synchronization
- Venue availability dynamically updates across public and admin portals to display four clear statuses:
  - 🟢 **Available**: Ready for public booking.
  - 🟡 **Partial**: Some time slots booked.
  - 🔴 **Fully Booked**: All time slots taken.
  - 🟣 **Maintenance**: Set by admins for repairs/maintenance (immediately blocks public booking).

### 3. 🛡️ Security & Privacy Protection
- **AVR Head PIN Verification**: Sensitive administrative actions (such as venue maintenance overrides or PIN updates) require PIN confirmation.
- **Hidden Verification Fields**: Security PINs and internal verification fields are hidden during form filling for privacy protection.
- **Standardized Operating Hours**: University operational hours (*Monday - Saturday, 8:00 AM - 9:00 PM*) are standard across all portals.

### 4. 📈 Streamlined Reports & Executive Analytics
The Reports module is divided into 3 clear, non-cluttered tabs:
1. **Venue Booking Reports**: Shows active and approved venue reservations. Clicking the **Eyeview (👁️)** icon opens a detailed window featuring:
   - Requestor details and event schedules.
   - **Post-Event Clearance & Inspection**: Staff can mark venue status as *Clean / Compliant* or *Damages / Rule Violation*, enter incident reasons, and record the inspecting staff name.
   - **Official Endorsement Form**: A preview of the verified University endorsement letter.
2. **Rule & Late Return Breaches**:
   - *Department with Most Rule Violation*: Tracks venue policy violations and equipment damage occurrences.
   - *Equipment Late Return*: Displays requestors with delayed returns, average delay time, and borrow details.
3. **Equipment Inventory & Lifespan**:
   - Displays equipment model names, purchase dates, lifespan vs current age (with health percentages like *95% Good Condition*), and stock status.
   - Full management capabilities to **Add**, **Edit**, or **Delete** equipment models.
   - One-click **Download CSV Report** button to save reports directly to your computer.

### 5. 🎨 Modern & Clean User Experience
- Action buttons across all administrator tables use clean, modern icon buttons (👁️ Eyeview, ✏️ Edit, 🗑️ Delete).
- Dropdown filters have clean, readable designs for easy navigation.

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

### 🔄 Step-by-Step Data Journey (Real-World Example)

Here is what happens behind the scenes when an admin adds a new office like **AVR | FSUU Morelos Campus**:

1. **User Action (Frontend)**:
   - An administrator opens the *Campuses & Branch Offices* tab in React, types `"AVR"` for name and `"FSUU Morelos Campus"` for location, and clicks **Save Campus Office**.
2. **Order Dispatch (Route)**:
   - The React frontend sends a secure message over the internet path `POST /api/admin/offices`.
3. **Business Processing (Controller)**:
   - `AdminOfficeController` receives the request.
   - It checks that the office name is valid and auto-combines the name and location into a unique web tag (`avr-fsuu-morelos-campus`) so it never collides with Main Campus.
4. **Data Management (Model & Database)**:
   - The `Office` Model writes the new record permanently into the `offices` table inside the MySQL database vault.
5. **Success Confirmation (Back to Screen)**:
   - The kitchen sends back a green `201 Created` receipt.
   - The React frontend instantly refreshes the page and displays a green notification checkmark: **"✅ Campus office AVR updated!"**.

---

## 🏗️ System Architecture & Tech Stack

### Offices Covered

| Office | Code | What they manage | Campus Scope |
|--------|------|-----------------| ------------ |
| Audio Visual Room | AVR | Event venues (rooms), equipment lending (projectors, microphones, etc.) | FSUU Main & FSUU Morelos |

An Admin or Staff account belongs to exactly one office/campus and cannot act on other campus records.

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

### 3. Automated Verification Tests
```bash
cd backend
php artisan test           # SQLite in-memory test suite
```

```bash
cd frontend
npm run build              # Verifies production build & JSX compilation
```

---

## 📋 Closed System Decisions Log

| Decision | Rationale |
|----------|-----------|
| **Campus Isolation** | Multi-campus isolation prevents data bleed between FSUU Main and FSUU Morelos. |
| **Icon-Only Action Buttons** | Reduces clutter on smaller laptop screens while remaining clear and responsive. |
| **Post-Event Inspection Form** | Standardizes physical room handover and accountability after events conclude. |
| **No OTP for Public Booking** | Public forms use tracking code + email lookup for simplified user experience. |
