# 🏛️ FSUU AVR Venue Booking & Equipment Lending System

**Father Saturnino Urios University (FSUU)**  
*AVR Operations & Equipment Lending Management System*

A web-based reservation, equipment kiosk lending, and post-use inspection system built for Father Saturnino Urios University.

---

## 💻 Tech Stack

* **Backend**: Laravel 11 (PHP 8.2+), MySQL / TiDB, Laravel Sanctum, Pusher / Laravel Echo (WebSockets)
* **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Axios
* **Security & Auth**: Role-Based Access Control (RBAC), Granular Permission Matrix, Password Encryption, API Rate Limiting

---

## 🌟 Key Features

### 1. Public Self-Service Portals
* **Venue Booking**: Interactive calendar, multi-day support, arrival grace period calculation, and real-time conflict prevention.
* **Equipment Lending**: Kiosk borrowing mode with today vs. next-day scheduling and dynamic stock checks.
* **Live Status Tracking**: Instant reference code tracking (`TRK-...`) with real-time status updates and applicant self-cancellation.

### 2. Administrative & Staff Operations
* **Operational Dashboard**: Live metrics, pending tasks indicator, and schedule overview matrix.
* **Venue & Schedule Management**: Operating hours bounds, multi-day availability overrides, and maintenance locks.
* **Equipment Inventory**: Barcode unit tracking, lifecycles, and category management.
* **Post-Use Inspection**: Turnover validation, photographic evidence upload, and policy violation tagging.
* **Reports**:
  * Booking & Borrowing Activity
  * Policy Violations & Late Returns
  * Equipment Inventory Audit
  * Equipment Out (Live accountability of unreturned physical units currently with borrowers)
* **System Settings & Fee Matrix**: Customizable fee schedule titles, dynamic signatory authorities, and PDF export.
* **Role & Permission Management**: Granular action-level permissions per role (Super Admin, Staff, Student Assistant).

### 3. Reliability & Anti-Spam Safeguards
* **Button Debounce & Immediate Lock**: Prevents multi-click duplicate submissions during slow network connections.
* **15-Minute Anti-Spam Buffer**: Soft duplicate detection with instant tracking code feedback.
* **Database Row Locking**: Atomic transactions with `lockForUpdate` to eliminate double-booking race conditions.
* **Rate Limiting**: Automated protection against brute-force and request flooding (`throttle:api`, `throttle:login`).

---

## ⚙️ Environment Configuration (`.env`)

### Backend Environment Variables (`backend/.env`)

```ini
# Application Setup
APP_NAME="FSUU AVR Booking System"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

# Database Connection (MySQL / TiDB)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fsuu_booking_db
DB_USERNAME=root
DB_PASSWORD=

# Cloud Storage for Photo Evidence & Endorsements
CLOUDINARY_URL=cloudinary://<API_KEY>:<API_SECRET>@<CLOUD_NAME>

# SMS Gateway (iPROG SMS for Tracking & Reminders)
IPROG_SMS_API_KEY=your_api_key_here
IPROG_SMS_API_URL=https://sms.iprogtech.com/api/v1/sms_messages
IPROG_SMS_SENDER_NAME=FSUU_AVR

# Email Dispatch (SMTP / Gmail / Brevo)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM_ADDRESS=notifications@urios.edu.ph
MAIL_FROM_NAME="FSUU AVR Center"
```

### Frontend Environment Variables (`frontend/.env`)

```ini
# Canonical Backend REST API URL
VITE_API_URL=http://localhost:8000/api
```

---

## 🚀 Quick Setup & Installation

### Prerequisites
* **PHP** >= 8.2 & **Composer**
* **Node.js** >= 18.x & **npm**
* **MySQL** >= 8.0 (or MariaDB / TiDB)

---

### Backend Setup (Laravel API)

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install PHP dependencies
composer install

# 3. Configure environment file
cp .env.example .env
# Edit .env with your database and service credentials

# 4. Generate application encryption key
php artisan key:generate

# 5. Run migrations and database seeders
php artisan migrate --seed

# 6. Start the backend API server
php artisan serve
```
*Backend API runs at `http://127.0.0.1:8000`*

---

### Frontend Setup (React + Vite)

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Start the frontend development server
npm run dev
```
*Frontend UI runs at `http://localhost:5173`*

---

## 🚢 Production Deployment Commands

When deploying to a production server (Ubuntu/VPS/Cloud):

```bash
# Backend Production Optimization
cd backend
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force

# Frontend Production Build
cd ../frontend
npm run build
```

---

## 🔒 Permissions & Roles Overview

| Role | Default Access |
| :--- | :--- |
| **Super Admin** | Unrestricted access across all modules, settings, fee matrices, and permission assignments |
| **Staff** | Operational management (bookings, borrowings, inspections, reports) governed by granular permissions |
| **Student Assistant** | Kiosk-level claims, basic unit checkouts, and view-only permissions configured by Super Admin |

---

## 📄 License & Attribution

Developed for **Father Saturnino Urios University (FSUU)**.  
All rights reserved © 2026 Father Saturnino Urios University.
