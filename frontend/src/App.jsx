import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { cleanupLocalStorage } from "@/lib/cleanupLocalStorage";
import { PageLoader } from "@/components/ui/page-loader";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";

// Public — landing page loads eagerly (it's the first paint)
import LandingPage from "./pages/public/LandingPage/LandingPage";

// All other pages are lazy-loaded — only parsed when the user navigates to them
const TrackBooking = lazy(() => import("./pages/public/TrackBooking"));
const VenueBooking = lazy(() => import("./pages/public/VenueBooking/VenueBooking"));
const EquipmentBorrowing = lazy(() => import("./pages/public/EquipmentBorrowing/EquipmentBorrowing"));

// Auth pages
const StaffLogin = lazy(() => import("./pages/auth/StaffLogin"));
const GoogleCallback = lazy(() => import("./pages/auth/GoogleCallback"));
const AccountActivation = lazy(() => import("./pages/auth/AccountActivation"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));

// Super Admin pages
const SysadLayout = lazy(() => import("./pages/superadmin/SysadLayout"));
const SysadSettings = lazy(() => import("./pages/superadmin/SysadSettings"));

// General Operations (Staff & Student Assistants) pages
const GeneralLayout = lazy(() => import("./pages/general/GeneralLayout"));
const Dashboard = lazy(() => import("./pages/general/Dashboard"));
const VenueBookings = lazy(() => import("./pages/general/VenueBookings"));
const EquipmentBorrowings = lazy(() => import("./pages/general/EquipmentBorrowings"));
const ManageEquipments = lazy(() => import("./pages/general/ManageEquipments"));
const ManageVenues = lazy(() => import("./pages/general/ManageVenues"));
const Reports = lazy(() => import("./pages/general/Reports"));
const HistoryLog = lazy(() => import("./pages/general/HistoryLog"));
const Settings = lazy(() => import("./pages/general/Settings"));
const PortalInterface = lazy(() => import("./pages/general/PortalInterface"));
const TodayReservations = lazy(() => import("./pages/general/operations/TodayReservations"));
const EquipmentRelease = lazy(() => import("./pages/general/operations/EquipmentRelease"));
const EquipmentReturn = lazy(() => import("./pages/general/operations/EquipmentReturn"));

import { Toaster } from "@/components/ui/sonner";
import { LayoutDashboard, Sun, Moon, Phone } from "lucide-react";
import ContactUsModal from "@/components/ui/ContactUsModal";
import DataPrivacyTermsModal from "@/components/ui/DataPrivacyTermsModal";
import AboutDevelopersModal from "@/components/ui/AboutDevelopersModal";

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
  const { user, token, logout, isValidating } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const userRole = user?.role?.name || user?.role || "staff";

  const [showHomeLogoutConfirm, setShowHomeLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    cleanupLocalStorage();
  }, []);

  // When user is confirmed logged in and tries to navigate to the public landing page "/"
  useEffect(() => {
    // If still validating token with backend on boot, suppress modal to avoid flash/ghost modals
    if (isValidating) {
      setShowHomeLogoutConfirm(false);
      return;
    }

    if (user && token && location.pathname === "/") {
      setShowHomeLogoutConfirm(true);
    } else {
      setShowHomeLogoutConfirm(false);
    }
  }, [location.pathname, user, token, isValidating]);

  const handleConfirmLogoutForHome = async () => {
    setIsLoggingOut(true);
    try {
      await logout("/");
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

  const isAuthPage = location.pathname.startsWith("/login") || location.pathname.startsWith("/auth") || location.pathname.startsWith("/activate") || location.pathname.startsWith("/forgot-password") || location.pathname.startsWith("/reset-password");
  const isGeneralPage = location.pathname.startsWith("/general") || location.pathname.startsWith("/admin");
  const isSysadPage = location.pathname.startsWith("/sysad");
  const hideHeaderFooter = isAuthPage || isGeneralPage || isSysadPage;

  const [showContactModal, setShowContactModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDevelopersModal, setShowDevelopersModal] = useState(false);
  const [privacyModalTab, setPrivacyModalTab] = useState("privacy");

  const [publicSettings, setPublicSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_system_settings");
      if (saved) return JSON.parse(saved);
    } catch { }
    return {
      system_name: "FSUU Facilities & Equipment Booking System",
      organization_name: "Father Saturnino Urios University",
      contact_email: "support.booking@fsuu.edu.ph",
      contact_phone: "(085) 342-1830",
      facebook_url: "https://www.facebook.com/fsuubutuan",
    };
  });

  useEffect(() => {
    const loadSettings = () => {
      api.get("/public/system-settings")
        .then((res) => {
          if (res.data) {
            setPublicSettings((prev) => ({
              ...prev,
              ...res.data,
              facebook_url: res.data.facebook_url || prev.facebook_url || "https://www.facebook.com/fsuubutuan",
            }));
            localStorage.setItem(
              "fsuu_system_settings",
              JSON.stringify({
                ...res.data,
                facebook_url: res.data.facebook_url || "https://www.facebook.com/fsuubutuan",
              })
            );
          }
        })
        .catch(() => {
          try {
            const saved = localStorage.getItem("fsuu_system_settings");
            if (saved) setPublicSettings(JSON.parse(saved));
          } catch { }
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
      } catch { }
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
        <header className="fixed top-0 left-0 w-full z-50 bg-card/90 backdrop-blur-md border-b border-border transition-colors shadow-xs">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-2.5 sm:py-3.5 flex flex-col sm:flex-row justify-between items-center gap-2.5 sm:gap-4">
            <div className="w-full sm:w-auto flex items-center justify-between">
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
                className="flex items-center gap-2.5 sm:gap-3 text-foreground group bg-transparent border-0 p-0 text-left cursor-pointer"
              >
                <img src="/fsuu_logo.png" alt="FSUU Seal" className="h-9 sm:h-10 w-auto transition-transform duration-200 group-hover:scale-105" />
                <div className="flex flex-col">
                  <span className="font-bold text-base sm:text-lg tracking-tight text-foreground leading-tight">
                    {publicSettings.header_brand_text || "Urios"}
                  </span>
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    {publicSettings.system_name || "FSUU Facilities & Equipment Booking System"}
                  </span>
                </div>
              </button>

              {/* Mobile Right Controls: Contact Us, Theme Toggle & Dashboard */}
              <div className="flex items-center gap-1.5 sm:hidden">
                <button
                  type="button"
                  onClick={() => setShowContactModal(true)}
                  aria-label="Contact Us"
                  className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Contact Us"
                >
                  <Phone size={16} />
                </button>

                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  {isDark ? <Sun size={17} /> : <Moon size={17} />}
                </button>

                {(user || token) && (
                  <Link
                    to={userRole === "superadmin" || userRole === "super_admin" ? "/sysad/dashboard" : "/general/dashboard"}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-primary-foreground transition-all shadow-xs min-h-[44px]"
                  >
                    <LayoutDashboard size={14} />
                    <span>Dashboard</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Desktop Right Header Items */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center sm:justify-end">
              {(user || token) && location.pathname.startsWith("/interface") && (
                <div className="flex items-center p-1 bg-muted border border-border rounded-lg w-full sm:w-auto justify-center">
                  <Link
                    to="/interface/venue"
                    className={`flex-1 sm:flex-none text-center px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${location.pathname === "/interface/venue"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Book Venue
                  </Link>
                  <Link
                    to="/interface/equipment"
                    className={`flex-1 sm:flex-none text-center px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${location.pathname === "/interface/equipment"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Borrow Equipment
                  </Link>
                </div>
              )}

              {/* Desktop Contact Us Link */}
              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted cursor-pointer flex items-center gap-1.5 border border-border/60 bg-card/60 shadow-2xs"
                title="Contact University Facilities Office"
              >
                <Phone size={13} className="text-primary" />
                <span>Contact Us</span>
              </button>

              {/* Desktop Theme Switcher */}
              <div className="hidden sm:flex items-center">
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              </div>

              {/* Desktop Dashboard Button */}
              {(user || token) && (
                <div className="hidden sm:block">
                  <Link
                    to={userRole === "superadmin" || userRole === "super_admin" ? "/sysad/dashboard" : "/general/dashboard"}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary hover:opacity-90 text-primary-foreground transition-all shadow-xs"
                  >
                    <LayoutDashboard size={14} />
                    <span>Dashboard</span>
                  </Link>
                </div>
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
            : location.pathname.startsWith("/interface")
              ? "w-full max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 pt-[7.5rem] sm:pt-[7.5rem] md:pt-[8.5rem] pb-[4rem] flex-1 flex flex-col overflow-x-hidden"
              : "w-full max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 pt-[5.5rem] sm:pt-[6.5rem] md:pt-[7.5rem] pb-[4rem] flex-1 flex flex-col overflow-x-hidden"
      }>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/track" element={<TrackBooking />} />
            <Route path="/track-booking" element={<TrackBooking />} />
            <Route path="/book-venue" element={<VenueBooking />} />
            <Route path="/borrow-equipment" element={<EquipmentBorrowing />} />

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
            <Route path="/login" element={<StaffLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ForgotPassword />} />
            <Route path="/auth/google/callback" element={<GoogleCallback />} />
            <Route path="/activate/:token" element={<AccountActivation />} />

            {/* SysAd Portal — dedicated route for Super Administrator */}
            <Route path="/sysad" element={
              <ProtectedInterfaceRoute>
                <SysadLayout />
              </ProtectedInterfaceRoute>
            }>
              <Route index element={<Navigate to="/sysad/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="venue-bookings" element={<VenueBookings />} />
              <Route path="equipment-borrowing" element={<EquipmentBorrowings />} />
              <Route path="equipment-borrowings" element={<EquipmentBorrowings />} />
              <Route path="manage-equipments" element={<ManageEquipments />} />
              <Route path="manage-venues" element={<ManageVenues />} />
              <Route path="reports" element={<Reports />} />
              <Route path="history-log" element={<HistoryLog />} />
              <Route path="today-reservations" element={<TodayReservations />} />
              <Route path="equipment-release" element={<EquipmentRelease />} />
              <Route path="equipment-return" element={<EquipmentReturn />} />
              <Route path="settings" element={<SysadSettings />} />
            </Route>

            {/* General Operations (Staff & Student Assistants) */}
            <Route path="/general" element={
              <ProtectedInterfaceRoute>
                <GeneralLayout />
              </ProtectedInterfaceRoute>
            }>
              <Route index element={<Navigate to="/general/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="today-reservations" element={<TodayReservations />} />
              <Route path="equipment-release" element={<EquipmentRelease />} />
              <Route path="equipment-return" element={<EquipmentReturn />} />
              <Route path="venue-bookings" element={<VenueBookings />} />
              <Route path="equipment-borrowing" element={<EquipmentBorrowings />} />
              <Route path="equipment-borrowings" element={<EquipmentBorrowings />} />
              <Route path="manage-equipments" element={<ManageEquipments />} />
              <Route path="manage-venues" element={<ManageVenues />} />
              <Route path="reports" element={<Reports />} />
              <Route path="history-log" element={<HistoryLog />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* /admin compatibility aliases redirecting to /general */}
            <Route path="/admin" element={
              <ProtectedInterfaceRoute>
                <GeneralLayout />
              </ProtectedInterfaceRoute>
            }>
              <Route index element={<Navigate to="/general/dashboard" replace />} />
              <Route path="dashboard" element={<Navigate to="/general/dashboard" replace />} />
              <Route path="venue-bookings" element={<Navigate to="/general/venue-bookings" replace />} />
              <Route path="equipment-borrowing" element={<Navigate to="/general/equipment-borrowing" replace />} />
              <Route path="equipment-borrowings" element={<Navigate to="/general/equipment-borrowing" replace />} />
              <Route path="manage-equipments" element={<Navigate to="/general/manage-equipments" replace />} />
              <Route path="manage-venues" element={<Navigate to="/general/manage-venues" replace />} />
              <Route path="reports" element={<Navigate to="/general/reports" replace />} />
              <Route path="history-log" element={<Navigate to="/general/history-log" replace />} />
              <Route path="settings" element={<Navigate to="/general/settings" replace />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {!hideHeaderFooter && (
        <footer className="border-t border-border bg-card/80 backdrop-blur-md mt-16 transition-colors">
          <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-5 text-muted-foreground text-xs">
            {/* Left: Brand & System */}
            <div className="flex flex-col items-center sm:items-start gap-0.5 text-center sm:text-left">
              <span className="font-extrabold text-sm text-foreground">
                {publicSettings.organization_name || "Father Saturnino Urios University"}
              </span>
              <span className="text-muted-foreground font-medium text-[11px]">
                {publicSettings.system_name || "Facilities & Equipment Booking System"}
              </span>
            </div>

            {/* Center: Clean Navigation Links */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-muted-foreground">
              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Contact Us
              </button>
              <span className="text-muted-foreground/40">•</span>
              <button
                type="button"
                onClick={() => {
                  setPrivacyModalTab("privacy");
                  setShowPrivacyModal(true);
                }}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <span className="text-muted-foreground/40">•</span>
              <button
                type="button"
                onClick={() => {
                  setPrivacyModalTab("terms");
                  setShowPrivacyModal(true);
                }}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Terms &amp; Conditions
              </button>
            </div>

            {/* Right: Legal Copyright & Developer Attribution */}
            <div className="text-center sm:text-right text-muted-foreground font-medium text-[11.5px] leading-relaxed">
              <div>© {new Date().getFullYear()} {publicSettings.organization_name || "Father Saturnino Urios University"}. All rights reserved.</div>
              <div>
                <button
                  type="button"
                  onClick={() => setShowDevelopersModal(true)}
                  className="text-[10.5px] text-muted-foreground/75 hover:text-primary transition-colors cursor-pointer mt-0.5 font-medium underline underline-offset-2 decoration-muted-foreground/30 hover:decoration-primary"
                  title="Click to view Capstone Development Team credits"
                >
                  Developed by FSUU Capstone Team • BSIT
                </button>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Global Contact Us Modal */}
      <ContactUsModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        contactSettings={publicSettings}
      />

      {/* Global About Developers Modal */}
      <AboutDevelopersModal
        isOpen={showDevelopersModal}
        onClose={() => setShowDevelopersModal(false)}
      />

      {/* Global Data Privacy & Terms Modal */}
      <DataPrivacyTermsModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        initialTab={privacyModalTab}
      />

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
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
