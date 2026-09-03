import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { cleanupLocalStorage } from "@/lib/cleanupLocalStorage";
import { PageLoader } from "@/components/ui/page-loader";
import ConfirmModal from "@/components/ui/ConfirmModal";

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

// Super Admin pages
const SysadLayout        = lazy(() => import("./pages/superadmin/SysadLayout"));
const SysadSettings      = lazy(() => import("./pages/superadmin/SysadSettings"));

// General Operations (Staff & Student Assistants) pages
const GeneralLayout      = lazy(() => import("./pages/general/GeneralLayout"));
const Dashboard          = lazy(() => import("./pages/general/Dashboard"));
const VenueBookings      = lazy(() => import("./pages/general/VenueBookings"));
const EquipmentBorrowings = lazy(() => import("./pages/general/EquipmentBorrowings"));
const ManageEquipments   = lazy(() => import("./pages/general/ManageEquipments"));
const ManageVenues       = lazy(() => import("./pages/general/ManageVenues"));
const Reports            = lazy(() => import("./pages/general/Reports"));
const HistoryLog         = lazy(() => import("./pages/general/HistoryLog"));
const Settings           = lazy(() => import("./pages/general/Settings"));
const PortalInterface    = lazy(() => import("./pages/general/PortalInterface"));

import { Toaster } from "@/components/ui/sonner";

import { LayoutDashboard } from "lucide-react";

function ProtectedInterfaceRoute({ children }) {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!user && !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const userRole = user?.role?.name || user?.role || "staff";

  const [showHomeLogoutConfirm, setShowHomeLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    cleanupLocalStorage();
  }, []);

  // When user is logged in and tries to navigate to the public landing page "/"
  useEffect(() => {
    if ((user || token) && location.pathname === "/") {
      setShowHomeLogoutConfirm(true);
    } else {
      setShowHomeLogoutConfirm(false);
    }
  }, [location.pathname, user, token]);

  const handleConfirmLogoutForHome = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowHomeLogoutConfirm(false);
    } catch {
      setShowHomeLogoutConfirm(false);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCancelLogoutForHome = () => {
    setShowHomeLogoutConfirm(false);
    if (userRole === "superadmin" || userRole === "super_admin") {
      navigate("/sysad/dashboard");
    } else {
      navigate("/general/dashboard");
    }
  };

  const isAuthPage     = location.pathname.startsWith("/login") || location.pathname.startsWith("/auth") || location.pathname.startsWith("/activate");
  const isGeneralPage  = location.pathname.startsWith("/general") || location.pathname.startsWith("/admin");
  const isSysadPage    = location.pathname.startsWith("/sysad");
  const hideHeaderFooter = isAuthPage || isGeneralPage || isSysadPage;

  const [publicSettings, setPublicSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_system_settings");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      system_name: "FSUU Facilities & Equipment Booking System",
      organization_name: "Father Saturnino Urios University",
      contact_email: "support.booking@fsuu.edu.ph",
      contact_phone: "(085) 342-1830",
    };
  });

  useEffect(() => {
    const loadSettings = () => {
      api.get("/public/system-settings")
        .then((res) => {
          if (res.data) {
            setPublicSettings((prev) => ({ ...prev, ...res.data }));
            localStorage.setItem("fsuu_system_settings", JSON.stringify(res.data));
          }
        })
        .catch(() => {
          try {
            const saved = localStorage.getItem("fsuu_system_settings");
            if (saved) setPublicSettings(JSON.parse(saved));
          } catch {}
        });
    };

    loadSettings();

    const handleSettingsUpdated = (e) => {
      // If triggered by a cross-tab storage event, ONLY react if the affected key is fsuu_system_settings
      if (e?.key && e.key !== "fsuu_system_settings") return;

      try {
        const saved = localStorage.getItem("fsuu_system_settings");
        if (saved) {
          setPublicSettings(JSON.parse(saved));
        }
      } catch {}
    };

    window.addEventListener("fsuu_system_settings_updated", handleSettingsUpdated);
    window.addEventListener("storage", handleSettingsUpdated);

    return () => {
      window.removeEventListener("fsuu_system_settings_updated", handleSettingsUpdated);
      window.removeEventListener("storage", handleSettingsUpdated);
    };
  }, []);

  return (
    <>
      {/* Navigation — public and interface pages */}
      {!hideHeaderFooter && (
        <header className="fixed top-0 left-0 w-full z-50 bg-white/85 backdrop-blur-md border-b border-slate-200 transition-all shadow-xs">
          <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-3.5 flex justify-between items-center">
            {/* Logo on Left */}
            <button
              type="button"
              onClick={() => {
                if (user || token) {
                  setShowHomeLogoutConfirm(true);
                } else {
                  navigate("/");
                }
              }}
              className="flex items-center gap-3.5 text-slate-900 group bg-transparent border-0 p-0 text-left cursor-pointer"
            >
              <img src="/fsuu_logo.png" alt="FSUU Seal" className="h-11 w-auto transition-transform duration-300 group-hover:scale-105" />
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 leading-tight">
                  {publicSettings.header_brand_text || publicSettings.header_branding_text || "Urios"}
                </span>
                <span className="text-xs text-slate-500 font-semibold">{publicSettings.system_name || "Reserve and Booking System"}</span>
              </div>
            </button>

            {/* Right Side Header Items */}
            <div className="flex items-center gap-3">
              {(user || token) && location.pathname.startsWith("/interface") && (
                <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-full">
                  <Link
                    to="/interface/venue"
                    className={`px-3.5 py-1 rounded-full text-xs font-extrabold transition-all ${
                      location.pathname === "/interface/venue"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Book Venue
                  </Link>
                  <Link
                    to="/interface/equipment"
                    className={`px-3.5 py-1 rounded-full text-xs font-extrabold transition-all ${
                      location.pathname === "/interface/equipment"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Borrow Equipment
                  </Link>
                </div>
              )}

              {(user || token) && (
                <Link
                  to={userRole === "superadmin" || userRole === "super_admin" ? "/sysad/dashboard" : "/general/dashboard"}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs"
                >
                  <LayoutDashboard size={14} />
                  <span>Dashboard</span>
                </Link>
              )}
            </div>
          </div>
        </header>
      )}

      <main className={
        (isGeneralPage || isSysadPage)
          ? "w-full min-h-screen"
          : isAuthPage
            ? "w-full min-h-screen"
            : "w-full max-w-[1280px] mx-auto px-8 pt-[9rem] pb-[4rem] flex-1 flex flex-col overflow-x-hidden"
      }>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/"                     element={<LandingPage />} />
            <Route path="/track"                element={<TrackBooking />} />
            <Route path="/track-booking"        element={<TrackBooking />} />
            <Route path="/book-venue"           element={<VenueBooking />} />
            <Route path="/borrow-equipment"     element={<EquipmentBorrowing />} />

            {/* Interface (Strictly Protected: Unauthenticated users CANNOT locate or access) */}
            <Route path="/interface" element={
              <ProtectedInterfaceRoute>
                <Navigate to="/interface/venue" replace />
              </ProtectedInterfaceRoute>
            } />
            <Route path="/interface/venue" element={
              <ProtectedInterfaceRoute>
                <VenueBooking isPortal={true} />
              </ProtectedInterfaceRoute>
            } />
            <Route path="/interface/equipment" element={
              <ProtectedInterfaceRoute>
                <EquipmentBorrowing isPortal={true} />
              </ProtectedInterfaceRoute>
            } />

            {/* Auth */}
            <Route path="/login"                 element={<StaffLogin />} />
            <Route path="/auth/google/callback"  element={<GoogleCallback />} />
            <Route path="/activate/:token"       element={<AccountActivation />} />

            {/* SysAd Portal — dedicated route for Super Administrator */}
            <Route path="/sysad" element={
              <ProtectedInterfaceRoute>
                <SysadLayout />
              </ProtectedInterfaceRoute>
            }>
              <Route index              element={<Navigate to="/sysad/dashboard" replace />} />
              <Route path="dashboard"           element={<Dashboard />} />
              <Route path="venue-bookings"      element={<VenueBookings />} />
              <Route path="equipment-borrowing" element={<EquipmentBorrowings />} />
              <Route path="equipment-borrowings" element={<EquipmentBorrowings />} />
              <Route path="manage-equipments"   element={<ManageEquipments />} />
              <Route path="manage-venues"       element={<ManageVenues />} />
              <Route path="reports"             element={<Reports />} />
              <Route path="history-log"         element={<HistoryLog />} />
              <Route path="settings"            element={<SysadSettings />} />
            </Route>

            {/* General Operations (Staff & Student Assistants) */}
            <Route path="/general" element={
              <ProtectedInterfaceRoute>
                <GeneralLayout />
              </ProtectedInterfaceRoute>
            }>
              <Route index                      element={<Navigate to="/general/dashboard" replace />} />
              <Route path="dashboard"           element={<Dashboard />} />
              <Route path="venue-bookings"      element={<VenueBookings />} />
              <Route path="equipment-borrowing" element={<EquipmentBorrowings />} />
              <Route path="equipment-borrowings" element={<EquipmentBorrowings />} />
              <Route path="manage-equipments"   element={<ManageEquipments />} />
              <Route path="manage-venues"       element={<ManageVenues />} />
              <Route path="reports"             element={<Reports />} />
              <Route path="history-log"         element={<HistoryLog />} />
              <Route path="settings"            element={<Settings />} />
            </Route>

            {/* /admin compatibility aliases redirecting to /general */}
            <Route path="/admin" element={
              <ProtectedInterfaceRoute>
                <GeneralLayout />
              </ProtectedInterfaceRoute>
            }>
              <Route index                      element={<Navigate to="/general/dashboard" replace />} />
              <Route path="dashboard"           element={<Navigate to="/general/dashboard" replace />} />
              <Route path="venue-bookings"      element={<Navigate to="/general/venue-bookings" replace />} />
              <Route path="equipment-borrowing" element={<Navigate to="/general/equipment-borrowing" replace />} />
              <Route path="equipment-borrowings" element={<Navigate to="/general/equipment-borrowing" replace />} />
              <Route path="manage-equipments"   element={<Navigate to="/general/manage-equipments" replace />} />
              <Route path="manage-venues"       element={<Navigate to="/general/manage-venues" replace />} />
              <Route path="reports"             element={<Navigate to="/general/reports" replace />} />
              <Route path="history-log"         element={<Navigate to="/general/history-log" replace />} />
              <Route path="settings"            element={<Navigate to="/general/settings" replace />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {!hideHeaderFooter && (
        <footer className="border-t border-slate-200 bg-white/60 backdrop-blur-xs mt-20">
          <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-slate-500 text-xs">
            <div className="flex flex-col items-center sm:items-start gap-1">
              <span className="font-extrabold text-sm text-slate-900">
                {publicSettings.organization_name || "Father Saturnino Urios University"}
              </span>
              <span className="text-slate-500 font-medium">
                {publicSettings.system_name || "Facilities & Equipment Booking System"}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 font-semibold text-slate-600">
              {publicSettings.contact_phone && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Tel:</span>
                  <a href={`tel:${publicSettings.contact_phone}`} className="hover:text-blue-600 transition-colors">
                    {publicSettings.contact_phone}
                  </a>
                </div>
              )}
              {publicSettings.contact_email && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Email:</span>
                  <a href={`mailto:${publicSettings.contact_email}`} className="hover:text-blue-600 transition-colors">
                    {publicSettings.contact_email}
                  </a>
                </div>
              )}
            </div>

            <div className="text-center sm:text-right text-slate-400 font-medium">
              © {new Date().getFullYear()} All rights reserved.
            </div>
          </div>
        </footer>
      )}

      {/* Logout Confirmation when visiting homepage while logged in */}
      <ConfirmModal
        open={showHomeLogoutConfirm}
        onClose={handleCancelLogoutForHome}
        onConfirm={handleConfirmLogoutForHome}
        variant="logout"
        title="Sign Out to View Public Homepage?"
        message={`You are currently signed in as ${user?.name || user?.email || "Staff"}. To view the public landing page as a guest visitor, you need to sign out of your account.`}
        confirmLabel="Sign Out & Continue"
        cancelLabel="Return to Dashboard"
        loading={isLoggingOut}
      />

      <Toaster position="top-right" expand={false} />
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
