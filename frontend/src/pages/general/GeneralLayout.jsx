import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useTheme } from "@/context/ThemeContext";
import api from "@/lib/axios";
import echoInstance from "@/lib/echo";
import { notify } from "@/lib/notify";
import {
  LayoutDashboard, Building2, PackageOpen, Box, CalendarCheck,
  FileBarChart2, Settings, ShieldCheck, ChevronRight,
  ChevronDown, Menu, X, LogOut, Globe, Monitor, Loader2, Sun, Moon
} from "lucide-react";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import IncidentDetailModal from "@/components/notifications/IncidentDetailModal";
import PendingTasksIndicator from "@/components/notifications/PendingTasksIndicator";
import ConfirmModal from "@/components/ui/ConfirmModal";

const NAV_GROUPS = [
  {
    title: "INTERFACE",
    items: [
      { label: "Interface",           icon: Monitor,          path: "/interface/venue",            roles: ["super_admin", "admin", "staff"], permissionKey: "interface" },
    ],
  },
  {
    title: "GLOBAL OVERVIEW",
    items: [
      { label: "Dashboard",           icon: LayoutDashboard, path: "/general/dashboard",          roles: ["super_admin", "admin", "staff"], permissionKey: "dashboard" },
      { label: "Venue Booking",       icon: Building2,        path: "/general/venue-bookings",     roles: ["super_admin", "admin", "staff"], permissionKey: "venue_bookings" },
      { label: "Equipment Borrowing", icon: PackageOpen,      path: "/general/equipment-borrowing",roles: ["super_admin", "admin", "staff"], permissionKey: "equipment_borrowing" },
    ],
  },
  {
    title: "RECORDS & INVENTORY",
    items: [
      { label: "Manage Equipment",    icon: Box,              path: "/general/manage-equipments",  roles: ["super_admin", "admin", "staff"], permissionKey: "manage_equipments" },
      { label: "Manage Venue",        icon: CalendarCheck,    path: "/general/manage-venues",      roles: ["super_admin", "admin", "staff"], permissionKey: "manage_venues" },
      { label: "Report",              icon: FileBarChart2,    path: "/general/reports",            roles: ["super_admin", "admin", "staff"], permissionKey: "reports" },
      { label: "History Log",         icon: FileBarChart2,    path: "/general/history-log",        roles: ["super_admin", "admin", "staff"], permissionKey: "history_log" },
    ],
  },
  {
    title: "SYSTEM CONTROL",
    items: [
      { label: "Settings",            icon: Settings,         path: "/general/settings",           roles: ["super_admin", "admin", "staff"], permissionKey: "settings" },
    ],
  },
];

export default function GeneralLayout() {
  const { logout } = useAuth();
  const { user, isSuperAdmin, isStudentAssistant, hasPermission } = usePermissions();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState("All Offices");
  const [selectedIncident, setSelectedIncident] = useState(null);

  const userRole = user?.role?.name || user?.role || "staff";

  const adminName = user?.name || user?.email || "General User";
  const adminAvatar = user?.avatar || null;
  const officeName = user?.office?.name || (isSuperAdmin ? "Super Admin" : "AVR Operations");
  const adminOffice = user?.office?.name || selectedOffice || "All Offices";
  const adminOfficeId = user?.office_id || user?.office?.id || null;

  // Real Database Notifications with Persistent Read State
  const [notifications, setNotifications] = useState([]);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("fsuu_read_notification_ids") || "[]");
      return Array.isArray(saved) ? new Set(saved) : new Set();
    } catch {
      return new Set();
    }
  });

  const fetchNotifs = async () => {
    try {
      const res = await api.get("/general/notifications");
      if (Array.isArray(res.data)) {
        setNotifications(res.data);
        const serverReadIds = res.data.filter(n => n.is_read).map(n => n.id);
        if (serverReadIds.length > 0) {
          setReadNotifIds(prev => {
            const merged = new Set([...prev, ...serverReadIds]);
            try {
              localStorage.setItem("fsuu_read_notification_ids", JSON.stringify(Array.from(merged)));
            } catch {}
            return merged;
          });
        }
      }
    } catch {}
  };

  useRealtimeSync(fetchNotifs, { interval: 30000, enabled: !!user });

  useEffect(() => {
    if (!user) return;

    // Listen on real-time Pusher WebSockets
    const notifChannel = echoInstance?.channel("general-notifications") || echoInstance?.channel("admin-notifications");
    if (notifChannel?.listen) {
      notifChannel.listen(".booking.created", (data) => {
        const title = data.type === "venue_booking" ? "New Venue Reservation" : "New Equipment Borrow";
        notify.info(
          `${title} • ${data.reference_code || ''}`,
          `${data.filer_name || 'Applicant'} (${data.program_office || 'Department'}) - ${data.place_of_use || 'Campus'}`
        );
        fetchNotifs();
        window.dispatchEvent(new Event("equipment_inventory_updated"));
      });

      notifChannel.listen(".booking.status_updated", () => {
        fetchNotifs();
        window.dispatchEvent(new Event("equipment_inventory_updated"));
      });
    }

    const eqChannel = echoInstance?.channel("equipment-inventory");
    if (eqChannel?.listen) {
      eqChannel.listen(".inventory.updated", () => {
        window.dispatchEvent(new Event("equipment_inventory_updated"));
      });
    }

    return () => {
      echoInstance?.leave("general-notifications");
      echoInstance?.leave("admin-notifications");
      echoInstance?.leave("equipment-inventory");
    };
  }, [user]);

  const markAsRead = async (notifId) => {
    setReadNotifIds(prev => {
      const next = new Set(prev);
      next.add(notifId);
      try {
        localStorage.setItem("fsuu_read_notification_ids", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
    try {
      await api.post("/general/notifications/mark-as-read", { notification_id: notifId });
    } catch {}
  };

  const markAllAsRead = async () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadNotifIds(allIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      localStorage.setItem("fsuu_read_notification_ids", JSON.stringify(Array.from(allIds)));
    } catch {}
    try {
      await api.post("/general/notifications/mark-all-read", { notification_ids: Array.from(allIds) });
    } catch {}
  };

  const handleNotificationClick = async (n) => {
    await markAsRead(n.id);
    setShowNotifDropdown(false);
    if (n.url) {
      navigate(n.url, { state: { selectedId: n.target_id, targetType: n.target_type, trk: n.ref } });
    }
  };

  // Restrict Notifications by assigned office (if specific campus restriction applies)
  const filteredNotifications = notifications.filter(n => {
    if (isSuperAdmin || !n.office) return true;
    const lowerOffice = (adminOffice || "").toLowerCase();
    if (lowerOffice === "all offices" || lowerOffice.includes("avr") || lowerOffice.includes("operations") || !lowerOffice) {
      return true;
    }
    if (lowerOffice.includes("morelos")) {
      return (n.office || "").toLowerCase().includes("morelos");
    }
    return !(n.office || "").toLowerCase().includes("morelos");
  });

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

  if (!user) return <Navigate to="/login" replace />;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getFeatureDetails = (path) => {
    if (path.includes("/dashboard")) {
      return {
        title: "Dashboard",
        subtitle: `${getGreeting()}, ${adminName} • Live facility utilization & inventory overview.`
      };
    }
    if (path.includes("/interface")) {
      return {
        title: "Interface",
        subtitle: "Staff & general operations desk reservation interface with PIN verification overrides."
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
        title: "Settings",
        subtitle: "Campus venue catalog, equipment categories, departments, communication logs, and profile."
      };
    }
    return {
      title: "General Operations",
      subtitle: `${getGreeting()}, ${adminName} • Audio-Visual Resource Center Management.`
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
        message="You will be logged out of your session. Any unsaved changes will be lost."
        confirmLabel="Sign Out"
        loading={isLoggingOut}
      />

      {/* ── Logout Loading Overlay ── */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
          <div className="bg-[#0B1F3A] p-7 rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col items-center gap-3 text-center max-w-xs mx-4">
            <Loader2 size={36} className="animate-spin text-blue-500" />
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
              {officeName || "General Operations"}
            </span>
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav className={`flex-1 overflow-y-auto py-5 px-3 space-y-6 scrollbar-none overflow-x-hidden`}>
          {NAV_GROUPS.map((group) => {
            const filteredItems = group.items.filter(item => {
              if (item.label === "Interface" && isStudentAssistant) {
                return false;
              }
              if (isSuperAdmin) return true;
              if (item.permissionKey) {
                return hasPermission(item.permissionKey);
              }
              return true;
            });
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1.5 overflow-hidden">
                <div className="px-3 pb-1 pt-1 overflow-hidden">
                  <p className={`text-[10px] font-bold tracking-widest uppercase truncate leading-none overflow-hidden whitespace-nowrap ${isDark ? "text-slate-400" : "text-slate-400"}`}>
                    {sidebarOpen ? group.title : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  {filteredItems.map(({ label, icon: Icon, path }) => {
                    const active = isActive(path);
                    return (
                      <Link
                        key={path}
                        to={path}
                        onClick={() => setMobileOpen(false)}
                        title={!sidebarOpen ? label : undefined}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs transition-colors duration-150 relative overflow-hidden whitespace-nowrap w-full
                          ${active
                            ? "bg-blue-600 text-white"
                            : isDark
                              ? "text-slate-300 hover:text-white hover:bg-slate-800"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          }
                        `}
                      >
                        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                          <Icon size={16} />
                        </div>
                        <span className="truncate">{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
                    adminName?.charAt(0)?.toUpperCase() ?? "U"
                  )}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className={`text-xs font-medium truncate ${isDark ? "text-slate-200" : "text-slate-800"}`}>{adminName}</p>
                  <p className={`text-[10.5px] truncate capitalize ${isDark ? "text-slate-400" : "text-slate-500"}`}>{userRole.replace("_", " ")}</p>
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

      {/* ── Main Content Container ── */}
      <div className={`flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-[68px]"}`}>

        {/* Top Header */}
        <header className={`sticky top-0 z-20 border-b shadow-2xs ${isDark ? "bg-[#0b132b] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
          <div className="flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                className={`lg:hidden p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 ${isDark ? "text-slate-300 hover:text-white hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
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
              <PendingTasksIndicator basePath="/general" isSysad={isSuperAdmin} />

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${isDark ? "text-slate-300 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* Notification Bell Dropdown */}
              <NotificationDropdown
                notifications={filteredNotifications}
                readNotifIds={readNotifIds}
                markAsRead={markAsRead}
                markAllAsRead={markAllAsRead}
                onSelectIncident={(incident) => setSelectedIncident(incident)}
                isSuperAdmin={isSuperAdmin}
              />
            </div>
          </div>
        </header>

        {/* Page Main Canvas */}
        <main className="flex-1 p-3 sm:p-5 lg:p-8 overflow-auto overflow-x-hidden">
          <Outlet context={{ 
            selectedOffice: adminOffice, 
            selectedOfficeId: adminOfficeId,
            adminOffice, 
            adminOfficeId,
            isSuperAdmin 
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
