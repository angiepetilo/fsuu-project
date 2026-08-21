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
  const [selectedOfficeId, setSelectedOfficeId] = useState(() => {
    return localStorage.getItem("fsuu_sysad_selected_office_id") || "all";
  });
  const [selectedOffice, setSelectedOffice] = useState(() => {
    return localStorage.getItem("fsuu_sysad_selected_office_name") || "All Offices";
  });
  const [offices, setOffices] = useState([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Fetch registered offices from backend
  useEffect(() => {
    api.get("/admin/offices")
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setOffices(list);
      })
      .catch(() => {
        setOffices([
          { id: 1, name: "AVR Office I", location: "Main Campus" },
          { id: 2, name: "AVR Office II", location: "Morelos Campus" },
        ]);
      });
  }, []);

  const handleOfficeChange = (newId) => {
    setSelectedOfficeId(newId);
    localStorage.setItem("fsuu_sysad_selected_office_id", newId);
    if (newId === "all") {
      setSelectedOffice("All Offices");
      localStorage.setItem("fsuu_sysad_selected_office_name", "All Offices");
    } else {
      const match = offices.find(o => String(o.id) === String(newId));
      const name = match ? match.name : `Office #${newId}`;
      setSelectedOffice(name);
      localStorage.setItem("fsuu_sysad_selected_office_name", name);
    }
  };

  // Dynamic Profile Sync from System Settings
  const [profileState, setProfileState] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_sysad_profile");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  useEffect(() => {
    const handleProfileUpdate = () => {
      try {
        const saved = localStorage.getItem("fsuu_sysad_profile");
        if (saved) setProfileState(JSON.parse(saved));
      } catch { }
    };

    window.addEventListener("sysad_profile_updated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);
    return () => {
      window.removeEventListener("sysad_profile_updated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  const adminName = profileState?.name || user?.name || "Super Administrator";
  const adminAvatar = profileState?.avatar || user?.avatar || null;

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

  const filteredNotifications = selectedOffice === "All Offices"
    ? sysadNotifications
    : sysadNotifications.filter(n => n.office === selectedOffice);

  if (!user) return null;

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
          fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out border-r border-slate-800
          ${sidebarOpen ? "w-64" : "w-[76px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Brand Header */}
        <div className={`flex items-center gap-3 px-5 py-4 border-b border-slate-800 ${!sidebarOpen && "justify-center px-0"}`}>
          <img src="/fsuu_logo.png" alt="FSUU" className="h-9 w-9 flex-shrink-0 object-contain" />
          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-white tracking-tight leading-tight">
                FSUU
              </span>
              <span className="text-[11px] text-slate-400 font-medium tracking-wide mt-0.5">
                PMO Office
              </span>
            </div>
          )}
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-none">
          {SYSAD_NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              {sidebarOpen && (
                <p className="px-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs transition-colors duration-150 relative
                      ${active
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                      }
                      ${!sidebarOpen && "justify-center px-0"}
                    `}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Collapse toggle (desktop) */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="hidden lg:flex items-center justify-center h-9 mx-3 mb-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs gap-1.5 font-medium cursor-pointer"
        >
          {sidebarOpen ? <><ChevronRight size={14} className="rotate-180" /><span>Collapse</span></> : <ChevronRight size={14} />}
        </button>

        {/* User Card */}
        <div className={`border-t border-slate-800 p-3 bg-slate-900 ${!sidebarOpen && "flex justify-center"}`}>
          {sidebarOpen ? (
            <div className="space-y-1.5">
              <div
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center text-xs font-semibold flex-shrink-0 overflow-hidden">
                  {adminAvatar ? (
                    <img src={adminAvatar} alt={adminName} className="w-full h-full object-cover" />
                  ) : (
                    adminName?.charAt(0)?.toUpperCase() ?? "S"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{adminName}</p>
                </div>
                <ChevronDown size={13} className={`text-slate-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </div>

              {userMenuOpen && (
                <div className="pt-1 border-t border-slate-800">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut size={13} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={handleLogout}
              title="Sign Out"
              className="w-8 h-8 rounded-full bg-slate-800 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center cursor-pointer transition-colors"
            >
              <LogOut size={14} />
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
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-[76px]"}`}>

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
                  <h1 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                    Super Admin System Portal
                  </h1>
                  <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-md">
                    Super Admin
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-normal mt-0.5 hidden sm:block">
                  Global system administration, user accounts, system configuration &amp; audit controls
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
            selectedOffice, 
            selectedOfficeId, 
            setSelectedOffice, 
            setSelectedOfficeId, 
            handleOfficeChange,
            offices,
            isSuperAdmin: true, 
            adminOffice: selectedOffice 
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
