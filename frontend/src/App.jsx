import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cleanupLocalStorage } from "@/lib/cleanupLocalStorage";
import { PageLoader } from "@/components/ui/page-loader";

// Public — landing page loads eagerly (it's the first paint)
import LandingPage from "./pages/public/LandingPage/LandingPage";

// All other pages are lazy-loaded — only parsed when the user navigates to them
const TrackBooking       = lazy(() => import("./pages/public/TrackBooking"));
const VenueBooking       = lazy(() => import("./pages/public/VenueBooking/VenueBooking"));
const EquipmentBorrowing = lazy(() => import("./pages/public/EquipmentBorrowing/EquipmentBorrowing"));

// Auth pages
const StaffLogin         = lazy(() => import("./pages/auth/StaffLogin"));
const GoogleCallback     = lazy(() => import("./pages/auth/GoogleCallback"));
const AccountActivation  = lazy(() => import("./pages/auth/AccountActivation"));

// SysAd pages
const SysadLayout        = lazy(() => import("./pages/sysad/SysadLayout"));
const SysadSettings      = lazy(() => import("./pages/sysad/SysadSettings"));

// Admin pages
const AdminLayout        = lazy(() => import("./pages/admin/AdminLayout"));
const Dashboard          = lazy(() => import("./pages/admin/Dashboard"));
const VenueBookings      = lazy(() => import("./pages/admin/VenueBookings"));
const EquipmentBorrowings = lazy(() => import("./pages/admin/EquipmentBorrowings"));
const ManageEquipments   = lazy(() => import("./pages/admin/ManageEquipments"));
const ManageVenues       = lazy(() => import("./pages/admin/ManageVenues"));
const Reports            = lazy(() => import("./pages/admin/Reports"));
const HistoryLog         = lazy(() => import("./pages/admin/HistoryLog"));
const Settings           = lazy(() => import("./pages/admin/Settings"));

import { Toaster } from "@/components/ui/sonner";

function AppContent() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    cleanupLocalStorage();
  }, []);

  const isAuthPage     = location.pathname.startsWith("/login") || location.pathname.startsWith("/auth") || location.pathname.startsWith("/activate");
  const isAdminPage    = location.pathname.startsWith("/admin");
  const isSysadPage    = location.pathname.startsWith("/sysad");
  const hideHeaderFooter = isAuthPage || isAdminPage || isSysadPage;

  return (
    <>
      {/* Navigation — only on public pages */}
      {!hideHeaderFooter && (
        <header className="fixed top-0 left-0 w-full z-50 bg-white/85 backdrop-blur-md border-b border-slate-200 transition-all shadow-xs">
          <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-3.5 flex justify-between items-center">
            {/* Logo on Left */}
            <Link to="/" className="flex items-center gap-3.5 text-slate-900 group">
              <img src="/fsuu_logo.png" alt="FSUU Seal" className="h-11 w-auto transition-transform duration-300 group-hover:scale-105" />
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 leading-tight">FSUU</span>
                <span className="text-xs text-slate-500 font-semibold">Reserve and Booking System</span>
              </div>
            </Link>
          </div>
        </header>
      )}

      <main className={
        (isAdminPage || isSysadPage)
          ? "w-full min-h-screen"
          : isAuthPage
            ? "w-full min-h-screen"
            : "w-full max-w-[1280px] mx-auto px-8 pt-[9rem] pb-[4rem] flex-1 flex flex-col overflow-x-hidden"
      }>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/"                 element={<LandingPage />} />
            <Route path="/track"            element={<TrackBooking />} />
            <Route path="/track-booking"    element={<TrackBooking />} />
            <Route path="/book-venue"       element={<VenueBooking />} />
            <Route path="/borrow-equipment" element={<EquipmentBorrowing />} />

            {/* Auth */}
            <Route path="/login"                 element={<StaffLogin />} />
            <Route path="/auth/google/callback"  element={<GoogleCallback />} />
            <Route path="/activate/:token"       element={<AccountActivation />} />

            {/* SysAd Portal — dedicated route for Super Administrator */}
            <Route path="/sysad" element={<SysadLayout />}>
              <Route index              element={<Navigate to="/sysad/dashboard" replace />} />
              <Route path="dashboard"           element={<Dashboard />} />
              <Route path="venue-bookings"      element={<VenueBookings />} />
              <Route path="equipment-borrowing" element={<EquipmentBorrowings />} />
              <Route path="manage-equipments"   element={<ManageEquipments />} />
              <Route path="manage-venues"       element={<ManageVenues />} />
              <Route path="reports"             element={<Reports />} />
              <Route path="history-log"         element={<HistoryLog />} />
              <Route path="settings"            element={<SysadSettings />} />
            </Route>

            {/* Admin — nested under AdminLayout */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index              element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard"           element={<Dashboard />} />
              <Route path="venue-bookings"      element={<VenueBookings />} />
              <Route path="equipment-borrowing" element={<EquipmentBorrowings />} />
              <Route path="manage-equipments"   element={<ManageEquipments />} />
              <Route path="manage-venues"       element={<ManageVenues />} />
              <Route path="reports"             element={<Reports />} />
              <Route path="history-log"         element={<HistoryLog />} />
              <Route path="settings"            element={<Settings />} />
            </Route>
          </Routes>
        </Suspense>
      </main>

      {!hideHeaderFooter && (
        <footer className="text-center py-12 border-t border-slate-200 mt-20 text-slate-500 text-sm font-medium">
          © {new Date().getFullYear()} Father Saturnino Urios University. All rights reserved.
        </footer>
      )}

      <Toaster position="top-center" />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
