import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, CalendarCheck, PackageOpen, Settings,
  ChevronRight, LogOut, Bell, Menu, X, Box, Building2,
  FileBarChart2, User, ChevronDown
} from "lucide-react";

const ALL_NAV_ITEMS = [
  { label: "Dashboard",           icon: LayoutDashboard, path: "/admin/dashboard",          roles: ["admin", "staff"] },
  { label: "Venue Bookings",      icon: Building2,        path: "/admin/venue-bookings",     roles: ["admin", "staff"] },
  { label: "Equipment Borrowing", icon: PackageOpen,      path: "/admin/equipment-borrowing",roles: ["admin", "staff"] },
  { label: "Manage Equipment",    icon: Box,              path: "/admin/manage-equipments",  roles: ["admin"] },
  { label: "Manage Venues",       icon: CalendarCheck,    path: "/admin/manage-venues",      roles: ["admin"] },
  { label: "Reports",             icon: FileBarChart2,    path: "/admin/reports",            roles: ["admin"] },
  { label: "Settings",            icon: Settings,         path: "/admin/settings",           roles: ["admin"] },
];

export default function AdminLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications] = useState(3);

  // Filter nav items by role
  const NAV_ITEMS = ALL_NAV_ITEMS.filter(item => item.roles.includes(user?.role ?? "staff"));

  // Redirect if not authenticated or not admin
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f0f2f8] flex font-sans">

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
              <p className="font-extrabold text-sm tracking-tight leading-tight">FSUU Admin</p>
              <p className="text-[10px] text-white/50 font-medium">Reserve & Booking System</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                title={!sidebarOpen ? label : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                  ${active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                  }
                  ${!sidebarOpen && "justify-center px-2"}
                `}
              >
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && <span>{label}</span>}
                {sidebarOpen && active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop) */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="hidden lg:flex items-center justify-center h-10 mx-3 mb-3 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs gap-1.5"
        >
          {sidebarOpen ? <><ChevronRight size={14} className="rotate-180" /><span>Collapse</span></> : <ChevronRight size={14} />}
        </button>

        {/* User Card */}
        <div className={`border-t border-white/10 p-3 ${!sidebarOpen && "flex justify-center"}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/10 transition-all cursor-pointer" onClick={() => setUserMenuOpen(v => !v)}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name ?? "Admin"}</p>
                <p className="text-[10px] text-white/40 truncate capitalize">{user?.role ?? "admin"}</p>
              </div>
              <ChevronDown size={12} className={`text-white/40 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
            </div>
          )}

          {sidebarOpen && userMenuOpen && (
            <div className="mt-1 mx-1 bg-white/10 rounded-xl overflow-hidden">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/10 transition-all font-semibold"
              >
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main Content ── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-[72px]"}`}>

        {/* Top Nav */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-5 h-14">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-all"
                onClick={() => setMobileOpen(v => !v)}
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>

              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400 font-medium">Admin</span>
                <ChevronRight size={14} className="text-slate-300" />
                <span className="text-slate-900 font-bold">
                  {NAV_ITEMS.find(n => isActive(n.path))?.label ?? "Dashboard"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-all">
                <Bell size={18} className="text-slate-600" />
                {notifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>

              {/* User avatar */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-slate-800">{user?.name ?? "Admin"}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{user?.role ?? "admin"}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 sm:p-7 overflow-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="text-center py-4 text-xs text-slate-400 font-medium border-t border-slate-200 bg-white">
          © {new Date().getFullYear()} Father Saturnino Urios University — Admin Portal
        </footer>
      </div>
    </div>
  );
}
