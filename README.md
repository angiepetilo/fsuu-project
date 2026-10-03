# 🏛️ FSUU Automated Venue Reservation & Equipment Lending System

**Father Saturnino Urios University (FSUU)**  
*Audio-Visual Resource (AVR) Operations Management System*

An intuitive, modern web platform designed for students, faculty, and administrative staff to easily reserve campus venues and borrow university equipment online—eliminating paper forms, preventing double-bookings, and tracking institutional assets with barcode precision.

---

## 🌟 What is This System?

Before this system, booking an AVR venue or borrowing multimedia equipment required manual forms, physical routing of signed approval slips, and handwritten logbooks. 

This platform centralizes the entire process into a single, automated online portal:
* **For Students & Faculty:** Easily browse available campus venues, check available dates and times, request equipment, and track approval status in real time from a phone or computer.
* **For AVR Staff & Custodians:** Instantly review booking requests, approve or decline schedules without conflicting overlaps, assign equipment using barcode scanners, and record returns with post-use inspection notes.
* **For Campus Administrators:** Monitor facility usage across university departments, track overdue items, view incident/damage reports, and generate official university summaries with one click.

---

## 🔄 How It Works (The 5-Step Process)

```
1. Submit Request ──▶ 2. Instant Receipt ──▶ 3. Staff Approval ──▶ 4. Barcode Handout ──▶ 5. Return & Inspection
   (Online Portal)      (Email + SMS Ref)      (No Double-Booking)    (Counter Pickup)      (Clearance & Restock)
```

1. **Submit Online:** The applicant selects their preferred venue or equipment, picks their date and timeslot, attaches their endorsement letter, and submits.
2. **Instant Tracking Code:** The system issues a unique tracking reference code (e.g., `VN-202610-0001` or `EQ-202610-0001`) and sends an immediate email and SMS confirmation.
3. **Staff Review & Approval:** AVR staff review the request. If approved, the system automatically reserves the timeslot and safeguards it from any competing requests.
4. **Counter Turnover (Pickup):** When the event begins, the borrower presents their school ID at the AVR counter. Staff scan the physical equipment barcodes to officially release the items.
5. **Return & Post-Use Inspection:** When the equipment is returned, staff inspect the units (checking for good condition, damages, or missing parts), issue an official digital return clearance, and automatically restock the inventory.

---

## ✨ Key Benefits in Plain English

### 1. 🛡️ Guaranteed No Double-Bookings
The system automatically monitors room and equipment schedules down to the minute. Two groups can never accidentally be approved for the same venue at the same time.

### 2. 📦 Real-Time Equipment Stock & Barcode Tracking
Every projector, microphone, speaker, and HDMI cable is registered in the system with its own barcode. Staff can scan items in seconds during pickup and return, preventing lost items and human counting errors.

### 3. 📱 Live "Track My Request" Kiosk
Just like tracking an online package, applicants can visit the **Track Status** page at any time, enter their reference code, and see whether their request is *Pending*, *Approved*, *In Progress*, or *Completed*.

### 4. 📬 Automated Email & SMS Notifications
Applicants receive official notices at every stage:
* Confirmation upon submission
* Approval notice with room arrival reminders
* Turnover notice listing every physical unit handed over
* Return receipt certifying all items were safely returned

### 5. 🔍 Inspection & Department Accountability
If an item is returned damaged or past due, staff record photo evidence and incident notes. The system links the incident to the responsible collegiate department for fair, university-wide accountability.

---

## 👥 User Roles & Access

| Role | Who It's For | What They Can Do |
| :--- | :--- | :--- |
| **Public User** | Students, Faculty, University Staff, Guests | Browse venue availability, submit venue or equipment requests online, upload endorsement letters, and track request status. |
| **Student Assistant** | Student Desk Helpers at the AVR Counter | Scan barcodes for equipment checkout, assist borrowers at the counter, and view scheduled reservations. |
| **AVR Staff** | Facility Custodians & Operational Officers | Approve or decline reservations, release equipment, conduct return inspections, log damages, and manage operating hours. |
| **Super Admin** | AVR Director, Department Heads, System Admins | Full control over all system settings, user accounts, university fee schedules, departmental analytics, and audit logs. |

---

## 💻 System Architecture at a Glance

* **Web Interface:** React & Tailwind CSS (Clean, responsive design that works on desktops, tablets, and smartphones)
* **Application Engine:** Laravel (Handles validation, collision prevention, automated email notifications, and security)
* **Cloud Database:** TiDB Cloud (High-performance, secure cloud database that keeps all university data safely preserved)
* **Delivery & Security:** Cloudflare & Render (Fast page loads, HTTPS security, and continuous uptime)

---

<details>
<summary>🛠️ <strong>Click here for Developer & IT Setup Instructions (Technical Section)</strong></summary>

### Prerequisites
* **PHP** >= 8.2 & **Composer**
* **Node.js** >= 18.x & **npm**
* **MySQL** >= 8.0 or **TiDB Cloud**

### 1. Backend Setup (Laravel API)
```bash
# Navigate to backend directory
cd backend

# Install dependencies
composer install

# Set up environment
cp .env.example .env

# Generate application key
php artisan key:generate

# Run database migrations
php artisan migrate

# Start development API server
php artisan serve
```
*API runs at `http://127.0.0.1:8000`*

### 2. Frontend Setup (React + Vite)
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend runs at `http://localhost:5173`*

### 3. Cloud Production Deployment
* **Backend:** Automated Docker deployment on Render running `php artisan migrate --force`.
* **Frontend:** Static web deployment on Cloudflare Pages / Render Nginx.
* **Database:** TiDB Cloud distributed SQL cluster.
</details>

---

## 📄 Institutional Governance & Ownership

Developed specifically for the **Audio-Visual Resource (AVR) Center** of **Father Saturnino Urios University (FSUU)**, Butuan City, Philippines.  
All rights reserved © 2026 Father Saturnino Urios University.
