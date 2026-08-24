import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import {
  LayoutDashboard, CalendarCheck, PackageOpen, Settings,
  ChevronRight, LogOut, Bell, Menu, X, Box, Building2,
  FileBarChart2, User, ChevronDown, ShieldCheck, Filter, Globe,
  Loader2
} from "lucide-react";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import IncidentDetailModal from "@/components/notifications/IncidentDetailModal";

const SYSAD_NAV_GROUPS = [
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const adminName = user?.name || "Super Administrator";
  const adminAvatar = user?.avatar || null;

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  const handleLogout = async () => {
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

  useEffect(() => {
    if (!user) return;
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 20000);
    return () => clearInterval(interval);
  }, [user]);

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
    try {
      localStorage.setItem("fsuu_read_sysad_notification_ids", JSON.stringify(Array.from(allIds)));
    } catch {}
    try {
      await api.post("/sysad/notifications/mark-all-read", { notification_ids: Array.from(allIds) });
    } catch {}
  };

  const filteredNotifications = sysadNotifications;

  if (!user) return null;

  const getFeatureDetails = (path) => {
    if (path.includes("/dashboard")) {
      return {
        title: "Dashboard",
        subtitle: "Global facility utilization, reservation analytics & inventory overview."
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
    <div className="min-h-screen bg-[#f8fafc] flex font-sans antialiased text-slate-900 relative">

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
          fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out border-r border-slate-800 overflow-hidden
          ${sidebarOpen ? "w-64" : "w-[68px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800 h-[65px] overflow-hidden whitespace-nowrap">
          <img src="/fsuu_logo.png" alt="FSUU" className="h-9 w-9 flex-shrink-0 object-contain" />
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className="font-bold text-sm text-white tracking-tight leading-tight truncate">
              FSUU
            </span>
            <span className="text-[11px] text-slate-400 font-medium tracking-wide mt-0.5 truncate">
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
                          : "text-slate-300 hover:text-white hover:bg-slate-800"
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
          className="hidden lg:flex items-center h-9 mx-2.5 mb-2 px-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs gap-3 font-medium cursor-pointer overflow-hidden whitespace-nowrap"
        >
          <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
            <ChevronRight size={14} className={`transition-transform duration-200 ${sidebarOpen ? "rotate-180" : ""}`} />
          </div>
          <span className="truncate">Collapse</span>
        </button>

        {/* User Card */}
        <div className="border-t border-slate-800 p-2.5 bg-slate-900 overflow-hidden whitespace-nowrap">
          {sidebarOpen ? (
            <>
              <div
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer overflow-hidden w-full"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center text-xs font-semibold flex-shrink-0 overflow-hidden">
                  {adminAvatar ? (
                    <img src={adminAvatar} alt={adminName} className="w-full h-full object-cover" />
                  ) : (
                    adminName?.charAt(0)?.toUpperCase() ?? "S"
                  )}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-xs font-medium text-slate-200 truncate">{adminName}</p>
                </div>
                <ChevronDown size={13} className={`text-slate-400 flex-shrink-0 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </div>

              {userMenuOpen && (
                <div className="pt-1.5 border-t border-slate-800 mt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
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
                onClick={handleLogout}
                title={`Sign Out (${adminName})`}
                className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 flex items-center justify-center transition-all cursor-pointer shadow-xs"
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
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-[68px]"}`}>

        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between px-6 h-16">

            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                onClick={() => setMobileOpen(v => !v)}
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>

              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2.5">
                  <h1 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                    {currentFeature.title}
                  </h1>
                  <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-md">
                    Super Admin
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-normal mt-0.5 hidden sm:block">
                  {currentFeature.subtitle}
                </p>
              </div>
            </div>

            {/* Right Side: Notification Bell */}
            <div className="flex items-center gap-3">
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
        <main className="flex-1 p-6 sm:p-8 overflow-auto">
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

        {/* Footer */}
        <footer className="text-center py-4 text-xs text-slate-400 font-semibold border-t border-slate-200/80 bg-white flex items-center justify-center gap-2">
          <ShieldCheck size={14} className="text-amber-500" />
          <span>© {new Date().getFullYear()} Father Saturnino Urios University — Super Administrator System Portal</span>
        </footer>
      </div>
    </div>
  );
}
