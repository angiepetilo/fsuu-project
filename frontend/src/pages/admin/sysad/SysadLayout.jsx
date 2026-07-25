import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Users, Settings, ChevronRight, LogOut, User, ChevronDown, Menu } from "lucide-react";
import { NotificationBell } from "@/components/ui/notification-bell";

const NAV_ITEMS = [
  { label: "User Management", icon: Users,    path: "/sysad/user-management", subtitle: "Manage administrative user accounts, roles, and office permissions." },
  { label: "Settings",        icon: Settings, path: "/sysad/settings",        subtitle: "Configure system-wide settings, operational defaults, and profile." },
];

export default function SysadLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login", { replace: true }); }
  }, [user, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");
  const currentNav = NAV_ITEMS.find(n => isActive(n.path)) ?? NAV_ITEMS[0];

  const avatar = user?.avatar
    ? <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
    : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold">{user?.name?.charAt(0)?.toUpperCase() ?? "S"}</div>;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f3f6fa] flex font-sans overflow-x-hidden">
      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0b1329] text-white transition-all duration-300 ${sidebarOpen ? "w-64" : "w-[72px]"}`}>
        {/* Logo Header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <img src="/fsuu_logo.png" alt="FSUU" className="h-9 w-9 flex-shrink-0" />
          {sidebarOpen && (
            <div>
              <p className="font-black text-sm tracking-tight leading-tight">FSUU Reserve</p>
              <p className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider">System Administration</p>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-150
                  ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold" : "text-white/60 hover:text-white hover:bg-white/10"}
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

        {/* User Card & Menu */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/10 transition-all cursor-pointer" onClick={() => setUserMenuOpen(v => !v)}>
            {avatar}
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name ?? "Admin"}</p>
                <p className="text-[10px] text-blue-300 truncate font-medium">System Administrator</p>
              </div>
            )}
            {sidebarOpen && <ChevronDown size={12} className={`text-white/40 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />}
          </div>

          {userMenuOpen && (
            <div className="mt-1 mx-1 bg-white/10 rounded-xl overflow-hidden animate-in fade-in duration-150">
              <Link
                to="/sysad/settings?tab=profile"
                onClick={() => setUserMenuOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/90 hover:bg-white/10 transition-all font-semibold"
              >
                <User size={13} /> Profile
              </Link>
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/10 transition-all font-semibold">
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-[72px]"}`}>
        
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm py-2">
          <div className="flex items-center justify-between px-6 min-h-[56px]">
            
            {/* Left: Collapsed Toggle Button beside Page Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(v => !v)}
                className="p-2 rounded-xl hover:bg-slate-100 transition-all text-slate-600 hover:text-slate-900 shrink-0"
                title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                <Menu size={18} />
              </button>

              <div>
                <h1 className="text-slate-900 font-extrabold text-base tracking-tight leading-tight">
                  {currentNav.label}
                </h1>
                <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                  {currentNav.subtitle}
                </p>
              </div>
            </div>

            {/* Right: Only Notification Bell */}
            <div className="flex items-center gap-2">
              <NotificationBell />
            </div>

          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-6 sm:p-8 overflow-auto">
          <Outlet />
        </main>

        <footer className="text-center py-4 text-xs text-slate-400 font-medium border-t border-slate-200 bg-white">
          © {new Date().getFullYear()} Father Saturnino Urios University — System Administration Portal
        </footer>
      </div>
    </div>
  );
}
