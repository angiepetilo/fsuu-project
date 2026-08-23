import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import echoInstance from "@/lib/echo";
import { toast } from "sonner";
import {
  LayoutDashboard, CalendarCheck, PackageOpen, Settings,
  ChevronRight, LogOut, Bell, Menu, X, Box, Building2,
  FileBarChart2, User, ChevronDown, ShieldCheck, Building,
  Loader2
} from "lucide-react";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import IncidentDetailModal from "@/components/notifications/IncidentDetailModal";

const NAV_GROUPS = [
  {
    title: "GLOBAL OVERVIEW",
    items: [
      { label: "Dashboard",           icon: LayoutDashboard, path: "/admin/dashboard",          roles: ["super_admin", "admin", "staff"] },
      { label: "Venue Booking",       icon: Building2,        path: "/admin/venue-bookings",     roles: ["super_admin", "admin", "staff"], permissionKey: "venue_bookings" },
      { label: "Equipment Borrowing", icon: PackageOpen,      path: "/admin/equipment-borrowing",roles: ["super_admin", "admin", "staff"], permissionKey: "equipment_borrowing" },
    ],
  },
  {
    title: "RECORDS & INVENTORY",
    items: [
      { label: "Manage Equipment",    icon: Box,              path: "/admin/manage-equipments",  roles: ["super_admin", "admin", "staff"], permissionKey: "manage_equipments" },
      { label: "Manage Venue",        icon: CalendarCheck,    path: "/admin/manage-venues",      roles: ["super_admin", "admin", "staff"], permissionKey: "manage_venues" },
      { label: "Report",              icon: FileBarChart2,    path: "/admin/reports",            roles: ["super_admin", "admin", "staff"], permissionKey: "reports" },
      { label: "History Log",         icon: FileBarChart2,    path: "/admin/history-log",        roles: ["super_admin", "admin", "staff"], permissionKey: "history_log" },
    ],
  },
  {
    title: "SYSTEM CONTROL",
    items: [
      { label: "Settings",            icon: Settings,         path: "/admin/settings",           roles: ["super_admin", "admin"] },
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
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState("All Offices");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const userRole = user?.role?.name || user?.role || "admin";
  const isSuperAdmin = userRole === "superadmin" || userRole === "super_admin";

  const adminName = user?.name || user?.email || "Admin User";
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
      const res = await api.get("/admin/notifications");
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

  useEffect(() => {
    if (!user) return;
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);

    // Listen on real-time Pusher WebSockets
    const notifChannel = echoInstance?.channel("admin-notifications");
    if (notifChannel?.listen) {
      notifChannel.listen(".booking.created", (data) => {
        const title = data.type === "venue_booking" ? "New Venue Reservation" : "New Equipment Borrow";
        toast.info(`${title} • ${data.reference_code || ''}`, {
          description: `${data.filer_name || 'Applicant'} (${data.program_office || 'Department'}) - ${data.place_of_use || 'Campus'}`,
        });
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
      clearInterval(interval);
      echoInstance?.leave("admin-notifications");
      echoInstance?.leave("equipment-inventory");
    };
  }, []);

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
      await api.post("/admin/notifications/mark-as-read", { notification_id: notifId });
    } catch {}
  };

  const markAllAsRead = async () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadNotifIds(allIds);
    try {
      localStorage.setItem("fsuu_read_notification_ids", JSON.stringify(Array.from(allIds)));
    } catch {}
    try {
      await api.post("/admin/notifications/mark-all-read", { notification_ids: Array.from(allIds) });
    } catch {}
  };

  const handleNotificationClick = async (n) => {
    await markAsRead(n.id);
    setShowNotifDropdown(false);
    if (n.url) {
      navigate(n.url, { state: { selectedId: n.target_id, targetType: n.target_type, trk: n.ref } });
    }
  };

  // Restrict Notifications strictly by assigned admin office
  const filteredNotifications = notifications.filter(n => {
    if (isSuperAdmin) return true;
    if (adminOffice.toLowerCase().includes("morelos")) {
      return (n.office || "").toLowerCase().includes("morelos");
    }
    return (n.office || "").toLowerCase().includes("main") || !(n.office || "").toLowerCase().includes("morelos");
  });

  // Badge count weights towards UNREAD High + Medium priority notifications
  const unreadActionableNotifs = filteredNotifications.filter(n => 
    !readNotifIds.has(n.id) && (n.priority === 'high' || n.priority === 'medium' || n.priority === 'overdue' || n.type === 'pending' || n.type === 'new' || n.type === 'equipment_damaged')
  );
  const actionBadgeCount = unreadActionableNotifs.length;

  const needsActionNotifs = filteredNotifications.filter(n => n.priority === 'high' || n.type === 'overdue' || n.type === 'pending' || n.type === 'equipment_damaged' || n.type === 'stock_alert');
  const updatesNotifs = filteredNotifications.filter(n => n.priority === 'medium' || n.priority === 'low' || (!needsActionNotifs.some(a => a.id === n.id)));

  const officeFilterName = isSuperAdmin ? "All Offices" : (user?.office?.name || adminOffice || "Assigned Office");

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

  if (!user) return null;

  const portalTitle = isSuperAdmin 
    ? "FSUU Super Admin Portal" 
    : userRole === "staff" 
      ? "FSUU Staff Portal" 
      : "FSUU Admin Portal";

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
        title: "Office Manager Settings",
        subtitle: "Staff accounts for your office, local venue settings, equipment catalog categories, and profile."
      };
    }
    return {
      title: "AVR Operations",
      subtitle: `${getGreeting()}, ${adminName} • Audio-Visual Resource Center Management.`
    };
  };

  const currentFeature = getFeatureDetails(location.pathname);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans antialiased text-slate-900 relative">

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
              {officeName || "AVR Operations"}
            </span>
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6 scrollbar-none overflow-x-hidden">
          {NAV_GROUPS.map((group) => {
            const filteredItems = group.items.filter(item => {
              if (!item.roles.includes(userRole)) return false;
              if (userRole === "staff" && item.permissionKey) {
                const userPerms = user?.permissions ?? [];
                return Array.isArray(userPerms) && userPerms.includes(item.permissionKey);
              }
              return true;
            });
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1.5 overflow-hidden">
                <div className="px-3 pb-1 pt-1 overflow-hidden">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase truncate leading-none overflow-hidden whitespace-nowrap">
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
                            : "text-slate-300 hover:text-white hover:bg-slate-800"
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
          className="hidden lg:flex items-center h-9 mx-2.5 mb-2 px-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs gap-3 font-medium cursor-pointer overflow-hidden whitespace-nowrap"
        >
          <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
            <ChevronRight size={14} className={`transition-transform duration-200 ${sidebarOpen ? "rotate-180" : ""}`} />
          </div>
          <span className="truncate">Collapse</span>
        </button>

        {/* User Card */}
        <div className="border-t border-slate-800 p-2.5 bg-slate-900 overflow-hidden whitespace-nowrap">
          <div
            onClick={() => {
              if (sidebarOpen) {
                setUserMenuOpen(v => !v);
              } else {
                handleLogout();
              }
            }}
            title={!sidebarOpen ? "Sign Out" : undefined}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer overflow-hidden w-full"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center text-xs font-semibold flex-shrink-0 overflow-hidden">
              {adminAvatar ? (
                <img src={adminAvatar} alt={adminName} className="w-full h-full object-cover" />
              ) : (
                adminName?.charAt(0)?.toUpperCase() ?? "U"
              )}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-xs font-medium text-slate-200 truncate">{adminName}</p>
              <p className="text-[10.5px] text-slate-400 truncate capitalize">{userRole.replace("_", " ")}</p>
            </div>
            {sidebarOpen && (
              <ChevronDown size={13} className={`text-slate-400 flex-shrink-0 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
            )}
          </div>

          {sidebarOpen && userMenuOpen && (
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
                    {userRole === "staff" ? "Staff Portal" : "Admin Portal"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-normal mt-0.5 hidden sm:block">
                  {currentFeature.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
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
        <main className="flex-1 p-6 sm:p-8 overflow-auto">
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

        {/* Footer */}
        <footer className="text-center py-4 text-xs text-slate-400 font-semibold border-t border-slate-200/80 bg-white">
          © {new Date().getFullYear()} Father Saturnino Urios University — {portalTitle}
        </footer>
      </div>
    </div>
  );
}
