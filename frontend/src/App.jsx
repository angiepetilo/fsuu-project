import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// Public pages
import LandingPage from "./pages/public/LandingPage/LandingPage";
import TrackBooking from "./pages/public/TrackBooking";
import VenueBooking from "./pages/public/VenueBooking/VenueBooking";
import EquipmentBorrowing from "./pages/public/EquipmentBorrowing/EquipmentBorrowing";

// Auth pages
import StaffLogin from "./pages/auth/StaffLogin";
import GoogleCallback from "./pages/auth/GoogleCallback";

// Admin pages
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import VenueBookings from "./pages/admin/VenueBookings";
import EquipmentBorrowings from "./pages/admin/EquipmentBorrowings";
import { ManageEquipments, ManageVenues, Reports } from "./pages/admin/UnderConstruction";
import Settings from "./pages/admin/Settings";

import { Toaster } from "@/components/ui/sonner";

function AppContent() {
  const location = useLocation();
  const { user } = useAuth();
  const isAuthPage    = location.pathname.startsWith("/login") || location.pathname.startsWith("/auth");
  const isAdminPage   = location.pathname.startsWith("/admin");
  const hideHeaderFooter = isAuthPage || isAdminPage;

  return (
    <>
      {/* Navigation — only on public pages */}
      {!hideHeaderFooter && (
        <header className="fixed top-0 left-0 w-full z-50 bg-white/85 backdrop-blur-md border-b border-slate-200 transition-all shadow-sm">
          <div className="max-w-[1280px] mx-auto px-8 py-4 flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3.5 text-slate-900 group">
              <img src="/fsuu_logo.png" alt="FSUU Seal" className="h-12 w-auto transition-transform duration-300 group-hover:scale-105" />
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 leading-tight">FSUU</span>
                <span className="text-xs text-slate-500 font-semibold">Reserve and Booking System</span>
              </div>
            </Link>
            <div className="flex gap-6 items-center">
              <Link
                to="/track"
                className="bg-white border border-slate-200 text-slate-900 px-6 py-2.5 rounded-full font-semibold text-sm cursor-pointer transition-all shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-[1px] hover:shadow-md"
              >
                Track Booking
              </Link>
            </div>
          </div>
        </header>
      )}

      <main className={
        isAdminPage
          ? "w-full min-h-screen"
          : isAuthPage
            ? "w-full min-h-screen"
            : "w-full max-w-[1280px] mx-auto px-8 pt-[9rem] pb-[4rem] flex-1 flex flex-col overflow-x-hidden"
      }>
        <Routes>
          {/* Public */}
          <Route path="/"                 element={<LandingPage />} />
          <Route path="/track"            element={<TrackBooking />} />
          <Route path="/book-venue"       element={<VenueBooking />} />
          <Route path="/borrow-equipment" element={<EquipmentBorrowing />} />

          {/* Auth */}
          <Route path="/login"                 element={<StaffLogin />} />
          <Route path="/auth/google/callback"  element={<GoogleCallback />} />

          {/* Admin — nested under AdminLayout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index              element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard"           element={<Dashboard />} />
            <Route path="venue-bookings"      element={<VenueBookings />} />
            <Route path="equipment-borrowing" element={<EquipmentBorrowings />} />
            <Route path="manage-equipments"   element={<ManageEquipments />} />
            <Route path="manage-venues"       element={<ManageVenues />} />
            <Route path="reports"             element={<Reports />} />
            <Route path="settings"            element={<Settings />} />
          </Route>
        </Routes>
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
