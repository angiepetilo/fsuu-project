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
import ForgotPassword from "./pages/auth/ForgotPassword";

// System Admin (Sysad) pages
import SysadLayout from "./pages/admin/sysad/SysadLayout";
import SysadDashboard from "./pages/admin/sysad/SysadDashboard";
import SysadUserManagement from "./pages/admin/sysad/SysadUserManagement";
import SysadSettings from "./pages/admin/sysad/SysadSettings";

// AVR Admin pages
import AvrLayout           from "./pages/admin/avr/AvrLayout";
import AvrDashboard        from "./pages/admin/avr/AvrDashboard";
import AvrVenueBookings    from "./pages/admin/avr/AvrVenueBookings";
import AvrEquipmentBorrowing from "./pages/admin/avr/AvrEquipmentBorrowing";
import AvrManageVenue      from "./pages/admin/avr/AvrManageVenue";
import AvrManageEquipment  from "./pages/admin/avr/AvrManageEquipment";
import AvrHistoryLog       from "./pages/admin/avr/AvrHistoryLog";
import AvrReports          from "./pages/admin/avr/AvrReports";
import AvrInventory        from "./pages/admin/avr/AvrInventory";
import AvrSettings         from "./pages/admin/avr/AvrSettings";

import { Toaster } from "@/components/ui/sonner";

function AppContent() {
  const location = useLocation();
  const { user } = useAuth();
  const isAuthPage    = location.pathname.startsWith("/login") || location.pathname.startsWith("/auth");
  const isAdminPage   = location.pathname.startsWith("/sysad") || location.pathname.startsWith("/avr");
  const hideHeaderFooter = isAuthPage || isAdminPage;

  return (
    <>
      {/* Navigation — only on public pages */}
      {!hideHeaderFooter && (
        <header className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-sm">
          <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-3.5 flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3 text-slate-900 group">
              <img src="/fsuu_logo.png" alt="FSUU Seal" className="h-10 w-auto transition-transform duration-300 group-hover:scale-105" />
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tight text-slate-900 leading-tight">FSUU</span>
                <span className="text-[11px] text-slate-500 font-medium">Reserve and Booking System</span>
              </div>
            </Link>
            <div className="flex gap-4 items-center">
              <Link
                to="/track"
                className="bg-white border border-slate-200 text-slate-700 px-5 py-2 rounded-full font-bold text-xs cursor-pointer transition-all shadow-sm hover:bg-slate-50 hover:border-slate-300"
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
          <Route path="/forgot-password"       element={<ForgotPassword />} />
          <Route path="/auth/google/callback"  element={<GoogleCallback />} />

          {/* System Admin (Sysad) — nested under SysadLayout */}
          <Route path="/sysad" element={<SysadLayout />}>
            <Route index          element={<Navigate to="/sysad/dashboard" replace />} />
            <Route path="dashboard"       element={<SysadDashboard />} />
            <Route path="user-management" element={<SysadUserManagement />} />
            <Route path="settings"        element={<SysadSettings />} />
          </Route>

          {/* AVR Admin — nested under AvrLayout */}
          <Route path="/avr" element={<AvrLayout />}>
            <Route index                    element={<Navigate to="/avr/dashboard" replace />} />
            <Route path="dashboard"         element={<AvrDashboard />} />
            <Route path="venue-bookings"    element={<AvrVenueBookings />} />
            <Route path="equipment-borrowing" element={<AvrEquipmentBorrowing />} />
            <Route path="manage-venue"      element={<AvrManageVenue />} />
            <Route path="manage-equipment"  element={<AvrManageEquipment />} />
            <Route path="history-log"       element={<AvrHistoryLog />} />
            <Route path="inventory"         element={<AvrInventory />} />
            <Route path="reports"           element={<AvrReports />} />
            <Route path="settings"          element={<AvrSettings />} />
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
