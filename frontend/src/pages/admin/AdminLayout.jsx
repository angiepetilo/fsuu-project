import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, CalendarCheck, PackageOpen, Settings,
  ChevronRight, LogOut, Bell, Menu, X, Box, Building2,
  FileBarChart2, User, ChevronDown, ShieldCheck, Building
} from "lucide-react";

const NAV_GROUPS = [
  {
    title: "MAIN",
    items: [
      { label: "Dashboard",           icon: LayoutDashboard, path: "/admin/dashboard",          roles: ["super_admin", "admin", "staff"] },
      { label: "Venue Bookings",      icon: Building2,        path: "/admin/venue-bookings",     roles: ["super_admin", "admin", "staff"] },
      { label: "Equipment Borrowing", icon: PackageOpen,      path: "/admin/equipment-borrowing",roles: ["super_admin", "admin", "staff"] },
    ],
  },
  {
    title: "RECORDS",
    items: [
      { label: "Manage Equipment",    icon: Box,              path: "/admin/manage-equipments",  roles: ["super_admin", "admin"] },
      { label: "Manage Venues",       icon: CalendarCheck,    path: "/admin/manage-venues",      roles: ["super_admin", "admin"] },
      { label: "Reports",             icon: FileBarChart2,    path: "/admin/reports",            roles: ["super_admin", "admin"] },
    ],
  },
  {
    title: "CONFIG",
    items: [
      { label: "System Settings",     icon: Settings,         path: "/admin/settings",           roles: ["super_admin", "admin"] },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState("All Offices");
  const [notifications] = useState(3);

  const userRole = user?.role?.name || user?.role || "admin";
  const officeName = user?.office?.name || (userRole === "super_admin" ? "Global Scope" : "FSUU Branch");

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
    <div className="min-h-screen bg-[#f8fafc] flex font-sans antialiased text-slate-900">

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0b132b] text-white transition-all duration-300 ease-in-out border-r border-slate-800/50
          ${sidebarOpen ? "w-64" : "w-[76px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Brand Header */}
        <div className={`flex items-center gap-3.5 px-5 py-5 border-b border-slate-800/60 ${!sidebarOpen && "justify-center px-0"}`}>
          <img src="/fsuu_logo.png" alt="FSUU" className="h-10 w-10 flex-shrink-0 object-contain" />
          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-sm tracking-tight leading-tight text-white">FSUU Admin Portal</span>
              <span className="text-[11px] text-slate-400 font-semibold truncate">{officeName}</span>
            </div>
          )}
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6 scrollbar-none">
          {NAV_GROUPS.map((group) => {
            const filteredItems = group.items.filter(item => item.roles.includes(userRole));
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1.5">
                {sidebarOpen && (
                  <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    {group.title}
                  </p>
                )}
                {filteredItems.map(({ label, icon: Icon, path }) => {
                  const active = isActive(path);
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setMobileOpen(false)}
                      title={!sidebarOpen ? label : undefined}
                      className={`
                        flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200
                        ${active
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                        }
                        ${!sidebarOpen && "justify-center px-2.5"}
                      `}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      {sidebarOpen && <span>{label}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop) */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="hidden lg:flex items-center justify-center h-10 mx-3 mb-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all text-xs gap-1.5 font-bold"
        >
          {sidebarOpen ? <><ChevronRight size={14} className="rotate-180" /><span>Collapse</span></> : <ChevronRight size={14} />}
        </button>

        {/* User Card */}
        <div className={`border-t border-slate-800/60 p-3 bg-[#080d1e] ${!sidebarOpen && "flex justify-center"}`}>
          {sidebarOpen ? (
            <div className="space-y-2">
              <div
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-xs">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{user?.name ?? "User"}</p>
                  <p className="text-[10px] text-slate-400 truncate capitalize">{userRole.replace("_", " ")}</p>
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

      {/* ── Main Content Container ── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-[76px]"}`}>

        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between px-6 h-16">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
                onClick={() => setMobileOpen(v => !v)}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <div className="flex flex-col justify-center">
                <h1 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                  Good morning, {user?.name || "User"}
                </h1>
                <p className="text-xs text-slate-400 font-medium mt-0.5 hidden sm:block">
                  You're signed in as <span className="font-semibold text-slate-600 capitalize">{userRole.replace("_", " ")}</span>. Here's your booking system at a glance.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Office Filter Dropdown */}
              <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs">
                <select
                  value={selectedOffice}
                  onChange={(e) => setSelectedOffice(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="All Offices">All Offices</option>
                  <option value="FSUU Main (AVR Center)">FSUU Main (AVR Center)</option>
                  <option value="FSUU Morelos (SCO Center)">FSUU Morelos (SCO Center)</option>
                  <option value="Property & Inventory Office">Property & Inventory Office</option>
                  <option value="IT & Technology Services">IT & Technology Services</option>
                </select>
              </div>

              {/* Notification Bell */}
              <button className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all" title="Notifications">
                <Bell size={18} />
                {notifications > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                    {notifications}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page Main Canvas */}
        <main className="flex-1 p-6 sm:p-8 overflow-auto">
          <Outlet context={{ selectedOffice, setSelectedOffice }} />
        </main>

        {/* Footer */}
        <footer className="text-center py-4 text-xs text-slate-400 font-semibold border-t border-slate-200/80 bg-white">
          © {new Date().getFullYear()} Father Saturnino Urios University — Admin Portal
        </footer>
      </div>
    </div>
  );
}
