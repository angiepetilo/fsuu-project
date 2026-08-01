import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import {
  LayoutDashboard, CalendarCheck, PackageOpen, Settings,
  ChevronRight, LogOut, Bell, Menu, X, Box, Building2,
  FileBarChart2, User, ChevronDown, ShieldCheck, Filter, Globe
} from "lucide-react";
import SysadNotifDropdown from "./components/SysadNotifDropdown";

const SYSAD_NAV_GROUPS = [
  {
    title: "GLOBAL OVERVIEW",
    items: [
      { label: "SysAd Dashboard", icon: LayoutDashboard, path: "/sysad/dashboard" },
      { label: "Venue Bookings", icon: Building2, path: "/sysad/venue-bookings" },
      { label: "Equipment Borrowing", icon: PackageOpen, path: "/sysad/equipment-borrowing" },
    ],
  },
  {
    title: "RECORDS & INVENTORY",
    items: [
      { label: "Manage Equipment", icon: Box, path: "/sysad/manage-equipments" },
      { label: "Manage Venues", icon: CalendarCheck, path: "/sysad/manage-venues" },
      { label: "Global Reports", icon: FileBarChart2, path: "/sysad/reports" },
      { label: "Audit History Log", icon: FileBarChart2, path: "/sysad/history-log" },
    ],
  },
  {
    title: "SYSTEM CONTROL",
    items: [
      { label: "SysAd Settings", icon: Settings, path: "/sysad/settings" },
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
  const [selectedOffice, setSelectedOffice] = useState("All Offices");
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

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
    await logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  // System Admin Global Notifications — loaded from API, never hardcoded
  const [sysadNotifications, setSysadNotifications] = useState([]);

  useEffect(() => {
    api.get("/sysad/notifications")
      .then(res => setSysadNotifications(res.data || []))
      .catch(() => setSysadNotifications([]));
  }, []);

  const filteredNotifications = selectedOffice === "All Offices"
    ? sysadNotifications
    : sysadNotifications.filter(n => n.office === selectedOffice);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans antialiased text-slate-900">

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col bg-[#070b19] text-white transition-all duration-300 ease-in-out border-r border-indigo-900/40
          ${sidebarOpen ? "w-64" : "w-[76px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Brand Header with SuperAdmin Gold Badge */}
        <div className={`flex items-center gap-3.5 px-5 py-5 border-b border-indigo-900/40 ${!sidebarOpen && "justify-center px-0"}`}>
          <img src="/fsuu_logo.png" alt="FSUU" className="h-10 w-10 flex-shrink-0 object-contain" />
          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-sm tracking-tight leading-tight text-white flex items-center gap-1.5">
                FSUU
              </span>
              <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                PMO
              </span>
            </div>
          )}
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6 scrollbar-none">
          {SYSAD_NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1.5">
              {sidebarOpen && (
                <p className="px-3 text-[10px] font-bold tracking-wider text-indigo-300/60 uppercase">
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
                      flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all duration-150 group relative
                      ${active
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }
                      ${!sidebarOpen && "justify-center px-0"}
                    `}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <Icon size={18} className={`flex-shrink-0 transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-110"}`} />
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
          className="hidden lg:flex items-center justify-center h-10 mx-3 mb-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all text-xs gap-1.5 font-bold"
        >
          {sidebarOpen ? <><ChevronRight size={14} className="rotate-180" /><span>Collapse</span></> : <ChevronRight size={14} />}
        </button>

        {/* User Card */}
        <div className={`border-t border-indigo-900/40 p-3 bg-[#040711] ${!sidebarOpen && "flex justify-center"}`}>
          {sidebarOpen ? (
            <div className="space-y-2">
              <div
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-xs overflow-hidden border border-amber-400/40">
                  {adminAvatar ? (
                    <img src={adminAvatar} alt={adminName} className="w-full h-full object-cover" />
                  ) : (
                    adminName?.charAt(0)?.toUpperCase() ?? "S"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{adminName}</p>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </div>

              {userMenuOpen && (
                <div className="pt-1 border-t border-slate-800">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={handleLogout}
              title="Sign Out"
              className="w-9 h-9 rounded-full bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 flex items-center justify-center cursor-pointer transition-all"
            >
              <LogOut size={16} />
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main Content Canvas ── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-[76px]"}`}>

        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between px-6 h-16">

            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
                onClick={() => setMobileOpen(v => !v)}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <div className="flex flex-col justify-center">
                <h1 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight flex items-center gap-2">
                  <span>Super Admin System Portal</span>
                </h1>
                <p className="text-xs text-slate-400 font-medium mt-0.5 hidden sm:block">
                  Global management, combined analytics, office reports & inventory filter
                </p>
              </div>
            </div>

            {/* Right Side: Notification Bell Dropdown Sub-Component */}
            <div className="flex items-center gap-3">
              <SysadNotifDropdown
                showNotifDropdown={showNotifDropdown}
                setShowNotifDropdown={setShowNotifDropdown}
                filteredNotifications={filteredNotifications}
                selectedOffice={selectedOffice}
              />
            </div>
          </div>
        </header>

        {/* Page Main Canvas */}
        <main className="flex-1 p-6 sm:p-8 overflow-auto">
          <Outlet context={{ selectedOffice, setSelectedOffice, isSuperAdmin: true, adminOffice: selectedOffice }} />
        </main>

        {/* Footer */}
        <footer className="text-center py-4 text-xs text-slate-400 font-semibold border-t border-slate-200/80 bg-white flex items-center justify-center gap-2">
          <ShieldCheck size={14} className="text-amber-500" />
          <span>© {new Date().getFullYear()} Father Saturnino Urios University — Super Administrator System Portal</span>
        </footer>
      </div>
    </div>
  );
}
