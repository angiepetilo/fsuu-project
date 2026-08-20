# 🏛️ FSUU Facilities & Equipment Reservation System — Backend REST API

**Father Saturnino Urios University (FSUU)**  
*Laravel 11 REST API Service with Pusher Real-Time Broadcasting & Multi-Office Support*

---

## 📋 Overview

This directory contains the **Laravel 11 backend service** for the FSUU Venue Reservation & Equipment Borrowing System. It manages database persistence, authentication (Sanctum & Google OAuth), real-time WebSockets via Pusher, PDF generation, email notifications, and automated department accountability analytics.

---

## ⚙️ Requirements & Tech Stack

* **PHP**: 8.2 or higher
* **Composer**: 2.x
* **Database**: MySQL 8.0+ / MariaDB / SQLite
* **Real-time WebSockets**: Pusher Channels / Laravel Reverb (`pusher/pusher-php-server`)
* **Email Delivery**: Resend API (`resend/resend-laravel`)
* **Authentication**: Laravel Sanctum & Laravel Socialite (Google OAuth)

---

## 🚀 Quick Setup & Installation

### 1. Install PHP Dependencies
```bash
composer install
```

### 2. Environment Configuration
Copy the example environment file and configure database and broadcast credentials:
```bash
cp .env.example .env
php artisan key:generate
```

Key environment variables in `.env`:
```ini
APP_NAME="FSUU Reservation System"
APP_ENV=local
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

DB_CONNECTION=sqlite
# or MySQL:
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=fsuu_booking_system
# DB_USERNAME=root
# DB_PASSWORD=

# Broadcasting (Pusher WebSockets)
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=your_pusher_app_id
PUSHER_APP_KEY=your_pusher_key
PUSHER_APP_SECRET=your_pusher_secret
PUSHER_APP_CLUSTER=ap1

# Mail Delivery (Resend API)
MAIL_MAILER=resend
RESEND_API_KEY=your_resend_api_key
MAIL_FROM_ADDRESS=noreply@fsuu.edu.ph
```

### 3. Database Migration & Seeding
```bash
php artisan migrate:fresh --seed
```

### 4. Run Development Server
```bash
php artisan serve
```

---

## 📡 Broadcast Channels & Real-Time Events

* `admin-notifications` (`booking.created`): Broadcasts instant alert when any public reservation is filed.
* `booking.{reference_code}` (`booking.status_updated`): Broadcasts status updates directly to the applicant's live tracker (`/track`).
* `equipment-inventory` (`inventory.updated`): Broadcasts real-time stock and physical barcode changes to admin inventory tables.

---

## 📁 Key Directories

```
app/
├── Events/             # Real-time WebSocket broadcast event classes
├── Http/
│   ├── Controllers/    # API endpoint controllers (Public, Admin, SuperAdmin)
│   ├── Requests/       # Form request validation classes
│   └── Middleware/     # Sanctum, CORS, and role authentication middleware
├── Models/             # Eloquent models (Venues, Equipment, Inspections, Bookings)
├── Policies/           # Authorization policies
└── Services/           # Core business logic (Inventory, Collision, History, Breaches)
database/
├── migrations/         # Relational database schema migrations
└── seeders/            # Database seeders (Roles, Users, Departments)
routes/
├── api.php             # REST API endpoint route definitions
├── channels.php        # Real-time WebSocket channel authorization rules
└── web.php             # Static file handler and SPA routing
```
