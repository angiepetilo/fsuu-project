# 🎨 FSUU Facilities & Equipment Reservation System — Frontend SPA

**Father Saturnino Urios University (FSUU)**  
*React 18 Single Page Application (SPA) with Vite, Tailwind CSS, and Laravel Echo*

---

## 📋 Overview

This directory contains the **React 18 frontend** for the FSUU Venue Reservation & Equipment Borrowing System. It provides responsive public wizards for booking facilities and borrowing gear, a live tracking portal (`/track`), and rich administrative control panels for Staff, Admins, and SuperAdmins.

---

## ⚙️ Tech Stack & Key Libraries

* **Framework**: React 18
* **Build Tool**: Vite 8
* **Styling**: Tailwind CSS v4 & Lucide React
* **Routing**: React Router v7
* **Real-time WebSockets**: Laravel Echo & Pusher JS (`laravel-echo`, `pusher-js`)
* **State & Data Fetching**: Axios, React Query
* **Notifications & Feedback**: Sonner Toast Notifications

---

## 🚀 Quick Setup & Installation

### 1. Install Node Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create or configure `.env`:
```ini
VITE_API_BASE_URL=http://localhost:8000/api

# Pusher WebSockets (Optional - has graceful offline fallback)
VITE_PUSHER_APP_KEY=your_pusher_key
VITE_PUSHER_APP_CLUSTER=ap1
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## 📁 Directory Structure

```
src/
├── components/         # Reusable UI primitives (Modals, Badges, Cards, Sonner)
├── context/            # AuthContext (Sanctum authentication & role sessions)
├── lib/
│   ├── axios.js        # Configured Axios instance with interceptors
│   └── echo.js         # Laravel Echo WebSocket singleton with offline fallback
├── pages/
│   ├── admin/          # Admin management (Dashboard, Venues, Equipments, Reports, History)
│   ├── auth/           # Staff login and Google OAuth callback
│   ├── public/         # Public portal (Landing, VenueBooking, EquipmentBorrowing, TrackBooking)
│   └── superadmin/     # Super Admin layout & global settings
└── App.jsx             # Top-level routing and lazy-loaded code-splitting
```
