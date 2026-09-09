import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useTheme } from "@/context/ThemeContext";
import api from "@/lib/axios";
import {
  LayoutDashboard, CalendarCheck, PackageOpen, Settings,
  ChevronRight, LogOut, Bell, Menu, X, Box, Building2,
  FileBarChart2, User, ChevronDown, ShieldCheck, Filter, Globe,
  Loader2, Monitor, Sun, Moon
} from "lucide-react";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import IncidentDetailModal from "@/components/notifications/IncidentDetailModal";
import PendingTasksIndicator from "@/components/notifications/PendingTasksIndicator";
import ConfirmModal from "@/components/ui/ConfirmModal";

const SYSAD_NAV_GROUPS = [
  {
    title: "INTERFACE",
    items: [
      { label: "Interface", icon: Monitor, path: "/interface/venue" },
    ],
  },
  {
    title: "GLOBAL OVERVIEW",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/sysad/dashboard" },
      { label: "Venue Booking", icon: Building2, path: "/sysad/venue-bookings" },
      { label: "Equipment Borrowing", icon: PackageOpen, path: "/sysad/equipment-borrowing" },
    ],
  },
  {
    title: "RECORDS & INVENTORY",
    items: [
      { label: "Manage Equipment", icon: Box, path: "/sysad/manage-equipments" },
      { label: "Manage Venue", icon: CalendarCheck, path: "/sysad/manage-venues" },
      { label: "Report", icon: FileBarChart2, path: "/sysad/reports" },
      { label: "History Log", icon: FileBarChart2, path: "/sysad/history-log" },
    ],
  },
  {
    title: "SYSTEM CONTROL",
    items: [
      { label: "Settings", icon: Settings, path: "/sysad/settings" },
    ],
  },
];

export default function SysadLayout() {
  const { logout } = useAuth();
  const { user } = usePermissions();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const adminName = user?.name || "Super Administrator";
  const adminAvatar = user?.avatar || null;

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const doLogout = async () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  // System Admin Global Notifications — loaded from API with database read persistence
  const [sysadNotifications, setSysadNotifications] = useState([]);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("fsuu_read_sysad_notification_ids") || "[]");
      return Array.isArray(saved) ? new Set(saved) : new Set();
    } catch {
      return new Set();
    }
  });

  const fetchNotifs = () => {
    api.get("/sysad/notifications")
      .then(res => {
        const list = res.data || [];
        setSysadNotifications(list);
        const serverReadIds = list.filter(n => n.is_read).map(n => n.id);
        if (serverReadIds.length > 0) {
          setReadNotifIds(prev => {
            const merged = new Set([...prev, ...serverReadIds]);
            try {
              localStorage.setItem("fsuu_read_sysad_notification_ids", JSON.stringify(Array.from(merged)));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => setSysadNotifications([]));
  };

  useRealtimeSync(fetchNotifs, { interval: 30000, enabled: !!user });

  const markAsRead = async (notifId) => {
    setReadNotifIds(prev => {
      const next = new Set(prev);
      next.add(notifId);
      try {
        localStorage.setItem("fsuu_read_sysad_notification_ids", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
    try {
      await api.post("/sysad/notifications/mark-as-read", { notification_id: notifId });
    } catch {}
  };

  const markAllAsRead = async () => {
    const allIds = new Set(sysadNotifications.map(n => n.id));
    setReadNotifIds(allIds);
    setSysadNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      localStorage.setItem("fsuu_read_sysad_notification_ids", JSON.stringify(Array.from(allIds)));
    } catch {}
    try {
      await api.post("/sysad/notifications/mark-all-read", { notification_ids: Array.from(allIds) });
    } catch {}
  };

  const filteredNotifications = sysadNotifications;

  if (!user) return <Navigate to="/login" replace />;

  const getFeatureDetails = (path) => {
    if (path.includes("/dashboard")) {
      return {
        title: "Dashboard",
        subtitle: "Global facility utilization, reservation analytics & inventory overview."
      };
    }
    if (path.includes("/interface")) {
      return {
        title: "Interface",
        subtitle: "Super admin & staff reservation interface with PIN verification overrides."
      };
    }
    if (path.includes("/venue-booking")) {
      return {
        title: "Venue Booking",
        subtitle: "Review, approve, and manage campus venue reservation schedules."
      };
    }
    if (path.includes("/equipment-borrowing")) {
      return {
        title: "Equipment Borrowing",
        subtitle: "Walk-in & advance equipment requisitions, custodial dispatch, and return tracking."
      };
    }
    if (path.includes("/manage-equipment")) {
      return {
        title: "Manage Equipment",
        subtitle: "Physical unit inventory, barcode registry, and equipment categories."
      };
    }
    if (path.includes("/manage-venue")) {
      return {
        title: "Manage Venue",
        subtitle: "Campus facility catalog, capacity configurations, and operating availability."
      };
    }
    if (path.includes("/report")) {
      return {
        title: "Reports & Analytics",
        subtitle: "Utilization metrics, statistical summaries, and official export logs."
      };
    }
    if (path.includes("/history-log")) {
      return {
        title: "History Log",
        subtitle: "Comprehensive audit trail and transaction history records."
      };
    }
    if (path.includes("/settings")) {
      return {
        title: "System Settings",
        subtitle: "Global user accounts, system configuration, verification PIN & audit controls."
      };
    }
    return {
      title: "Super Admin Portal",
      subtitle: "Global system administration, user accounts, and system configuration."
    };
  };

  const currentFeature = getFeatureDetails(location.pathname);

  return (
    <div className={`min-h-screen flex font-sans antialiased relative ${isDark ? "bg-[#0b132b] text-slate-100" : "bg-[#f8fafc] text-slate-900"}`}>

      {/* ── Logout Confirm Modal ── */}
      <ConfirmModal
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={doLogout}
        variant="logout"
        title="Sign Out?"
        message="You will be logged out of your Super Admin session. Any unsaved changes will be lost."
        confirmLabel="Sign Out"
        loading={isLoggingOut}
      />

      {/* ── Logout Loading Overlay ── */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
          <div className="bg-[#070b19] p-7 rounded-3xl border border-indigo-900/60 shadow-2xl flex flex-col items-center gap-3 text-center max-w-xs mx-4">
            <Loader2 size={36} className="animate-spin text-amber-500" />
            <p className="text-sm font-extrabold text-white tracking-tight">Signing out...</p>
            <p className="text-xs text-slate-400 font-medium">Securing and clearing your session</p>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out overflow-hidden
          ${isDark
            ? "bg-slate-900 text-white border-r border-slate-800"
            : "bg-white text-slate-900 border-r border-slate-200 shadow-sm"
          }
          ${sidebarOpen ? "w-64" : "w-[68px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Brand Header */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b h-[65px] overflow-hidden whitespace-nowrap ${isDark ? "border-slate-800" : "border-slate-100"}`}>
          <img src="/fsuu_logo.png" alt="FSUU" className="h-9 w-9 flex-shrink-0 object-contain" />
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className={`font-bold text-sm tracking-tight leading-tight truncate ${isDark ? "text-white" : "text-slate-900"}`}>
              FSUU
            </span>
            <span className={`text-[11px] font-medium tracking-wide mt-0.5 truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              PMO Office
            </span>
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6 scrollbar-none overflow-x-hidden">
          {SYSAD_NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1.5 overflow-hidden">
              <div className="px-3 pb-1 pt-1 overflow-hidden">
                <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase truncate leading-none overflow-hidden whitespace-nowrap">
                  {sidebarOpen ? group.title : "—"}
                </p>
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs transition-colors duration-150 relative overflow-hidden whitespace-nowrap w-full
                        ${active
                          ? "bg-blue-600 text-white"
                          : isDark
                            ? "text-slate-300 hover:text-white hover:bg-slate-800"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        }
                      `}
                      title={!sidebarOpen ? item.label : undefined}
                    >
                      <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                        <Icon size={16} />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle (desktop) */}
        <button
          type="button"
          onClick={() => setSidebarOpen(v => !v)}
          className={`hidden lg:flex items-center h-9 mx-2.5 mb-2 px-2.5 rounded-lg transition-colors text-xs gap-3 font-medium cursor-pointer overflow-hidden whitespace-nowrap ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}
        >
          <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
            <ChevronRight size={14} className={`transition-transform duration-200 ${sidebarOpen ? "rotate-180" : ""}`} />
          </div>
          <span className="truncate">Collapse</span>
        </button>

        {/* User Card */}
        <div className={`border-t p-2.5 overflow-hidden whitespace-nowrap ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white"}`}>
          {sidebarOpen ? (
            <>
              <div
                onClick={() => setUserMenuOpen(v => !v)}
                className={`flex items-center gap-2.5 p-1.5 rounded-lg transition-colors cursor-pointer overflow-hidden w-full ${isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
              >
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-semibold flex-shrink-0 overflow-hidden ${isDark ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                  {adminAvatar ? (
                    <img src={adminAvatar} alt={adminName} className="w-full h-full object-cover" />
                  ) : (
                    adminName?.charAt(0)?.toUpperCase() ?? "S"
                  )}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className={`text-xs font-medium truncate ${isDark ? "text-slate-200" : "text-slate-800"}`}>{adminName}</p>
                </div>
                <ChevronDown size={13} className={`flex-shrink-0 transition-transform ${userMenuOpen ? "rotate-180" : ""} ${isDark ? "text-slate-400" : "text-slate-400"}`} />
              </div>

              {userMenuOpen && (
                <div className={`pt-1.5 border-t mt-1 ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut size={13} /> Sign Out
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-0.5">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                title={`Sign Out (${adminName})`}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-xs hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40 ${isDark ? "bg-slate-800/80 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200"}`}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/40 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main Content Canvas ── */}
      <div className={`flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-[68px]"}`}>

        {/* Top Header */}
        <header className={`sticky top-0 z-20 border-b shadow-2xs ${isDark ? "bg-[#0b132b] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
          <div className="flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">

            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                className={`lg:hidden p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 ${isDark ? "text-slate-300 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"}`}
                onClick={() => setMobileOpen(v => !v)}
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>

              <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className={`font-extrabold text-sm sm:text-base lg:text-lg tracking-tight truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                    {currentFeature.title}
                  </h1>
                </div>
                <p className={`text-xs font-normal mt-0.5 hidden sm:block truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {currentFeature.subtitle}
                </p>
              </div>
            </div>

            {/* Right Side: Tasks, Theme Toggle & Notification Bell */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Tasks Counter Indicator */}
              <PendingTasksIndicator isSysad={true} />

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${isDark ? "text-slate-300 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* Notification Bell */}
              <NotificationDropdown
                notifications={filteredNotifications}
                readNotifIds={readNotifIds}
                markAsRead={markAsRead}
                markAllAsRead={markAllAsRead}
                onSelectIncident={(incident) => setSelectedIncident(incident)}
                isSuperAdmin={true}
              />
            </div>
          </div>
        </header>

        {/* Page Main Canvas */}
        <main className="flex-1 p-3 sm:p-5 lg:p-8 overflow-auto overflow-x-hidden">
          <Outlet context={{ 
            isSuperAdmin: true, 
            adminOffice: "Main Campus" 
          }} />
        </main>

        {/* Incident Detail Modal for Damaged, Lost & Policy Violations */}
        {selectedIncident && (
          <IncidentDetailModal
            incident={selectedIncident}
            onClose={() => setSelectedIncident(null)}
          />
        )}
      </div>
    </div>
  );
}
