import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import {
  LayoutDashboard, CalendarCheck, PackageOpen, Settings,
  ChevronRight, LogOut, Bell, Menu, X, Box, Building2,
  FileBarChart2, User, ChevronDown, History, Warehouse,
  AlertTriangle, Clock, CheckCircle, Users
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard",           icon: LayoutDashboard, path: "/avr/dashboard" },
  { label: "Venue Bookings",      icon: Building2,        path: "/avr/venue-bookings" },
  { label: "Equipment Borrowing", icon: PackageOpen,      path: "/avr/equipment-borrowing" },
  { label: "Manage Venue",        icon: CalendarCheck,    path: "/avr/manage-venue" },
  { label: "Manage Equipment",    icon: Box,              path: "/avr/manage-equipment" },
  { label: "History Log",         icon: History,          path: "/avr/history-log" },
  { label: "Inventory",           icon: Warehouse,        path: "/avr/inventory" },
  { label: "Reports",             icon: FileBarChart2,    path: "/avr/reports" },
  { label: "Settings",            icon: Settings,         path: "/avr/settings" },
];

const NOTIF_TYPE_CONFIG = {
  pending_booking:   { icon: Clock,         color: "text-amber-500",  bg: "bg-amber-50" },
  pending_borrowing: { icon: PackageOpen,   color: "text-blue-500",   bg: "bg-blue-50" },
  damage_report:     { icon: AlertTriangle, color: "text-red-500",    bg: "bg-red-50" },
  overdue_return:    { icon: Clock,         color: "text-orange-500", bg: "bg-orange-50" },
};

function Tooltip({ label, children }) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
        </div>
      </div>
    </div>
  );
}

export default function AvrLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount]     = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate("/login", { replace: true }); return; }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/avr/notifications");
      setNotifications(data.data ?? []);
      setNotifCount(data.count ?? 0);
    } catch { /* silent fail */ }
  };

  // Close notification panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => { await logout(); navigate("/login"); };
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  const avatar = user?.avatar
    ? <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
    : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">{user?.name?.charAt(0)?.toUpperCase() ?? "A"}</div>;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex font-sans">

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0f1c3f] text-white transition-all duration-300 ease-in-out
          ${sidebarOpen ? "w-64" : "w-[72px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-5 py-5 border-b border-white/10 ${!sidebarOpen && "justify-center px-0"}`}>
          <img src="/fsuu_logo.png" alt="FSUU" className="h-9 w-9 flex-shrink-0" />
          {sidebarOpen && (
            <div>
              <p className="font-extrabold text-sm tracking-tight leading-tight">AVR Admin</p>
              <p className="text-[10px] text-white/50 font-medium">System Administrator</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
            const active = isActive(path);
            const item = (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
                  ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "text-white/60 hover:text-white hover:bg-white/10"}
                  ${!sidebarOpen && "justify-center px-2"}
                `}
              >
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && <span>{label}</span>}
                {sidebarOpen && active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
            return !sidebarOpen
              ? <Tooltip key={path} label={label}>{item}</Tooltip>
              : item;
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="hidden lg:flex items-center justify-center h-10 mx-3 mb-3 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs gap-1.5"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <><ChevronRight size={14} className="rotate-180" /><span>Collapse</span></> : <ChevronRight size={14} />}
        </button>

        {/* User card */}
        <div className={`border-t border-white/10 p-3 ${!sidebarOpen && "flex justify-center"}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/10 transition-all cursor-pointer" onClick={() => setUserMenuOpen(v => !v)}>
              {avatar}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name ?? "Admin"}</p>
                <p className="text-[10px] text-white/40 truncate">System Administrator</p>
              </div>
              <ChevronDown size={12} className={`text-white/40 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
            </div>
          ) : (
            <div title={user?.name}>{avatar}</div>
          )}
          {sidebarOpen && userMenuOpen && (
            <div className="mt-1 mx-1 bg-white/10 rounded-xl overflow-hidden">
              <Link to="/avr/settings" onClick={() => { setUserMenuOpen(false); setMobileOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition-all font-semibold">
                <User size={13} /> Profile
              </Link>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/10 transition-all font-semibold">
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* ── Main Content ── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-[72px]"}`}>

        {/* Top Nav */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-5 h-14">
            <div className="flex items-center gap-3">
              <button className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-all" onClick={() => setMobileOpen(v => !v)}>
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400 font-medium">AVR Admin</span>
                <ChevronRight size={14} className="text-slate-300" />
                <span className="text-slate-900 font-bold">
                  {NAV_ITEMS.find(n => isActive(n.path))?.label ?? "Dashboard"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3" ref={notifRef}>
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(v => !v)}
                  className="relative p-2 rounded-xl hover:bg-slate-100 transition-all"
                  title="Notifications"
                >
                  <Bell size={18} className="text-slate-600" />
                  {notifCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-white px-0.5">
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                </button>

                {/* Notification Panel */}
                {notifOpen && (
                  <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                      <p className="font-bold text-slate-900 text-sm">Notifications</p>
                      <button onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={14} /></button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-sm">All clear — no alerts</div>
                      ) : notifications.slice(0, 12).map((n) => {
                        const cfg = NOTIF_TYPE_CONFIG[n.type] ?? { icon: Bell, color: "text-slate-500", bg: "bg-slate-50" };
                        const Icon = cfg.icon;
                        return (
                          <Link key={n.id} to={n.link} onClick={() => setNotifOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                              <Icon size={14} className={cfg.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800">{n.title}</p>
                              <p className="text-xs text-slate-500 truncate">{n.message}</p>
                              <p className="text-[10px] text-slate-300 mt-0.5">
                                {n.time ? new Date(n.time).toLocaleString() : ""}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* User */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                {avatar}
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-slate-800">{user?.name ?? "Admin"}</p>
                  <p className="text-[10px] text-slate-400">System Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 sm:p-7 overflow-auto">
          <Outlet />
        </main>

        <footer className="text-center py-4 text-xs text-slate-400 font-medium border-t border-slate-200 bg-white">
          © {new Date().getFullYear()} Father Saturnino Urios University — AVR Admin Portal
        </footer>
      </div>
    </div>
  );
}
