import { useState, useEffect, useMemo, useCallback } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import notify from "@/lib/notify";
import api from "@/lib/axios";
import {
  Users, Building2, Package, BookOpen, Clock,
  DollarSign, Key, User, Sliders, Building, GraduationCap,
  Lock, Eye, EyeOff, ShieldAlert, Loader2, X, Tag, Laptop, Activity
} from "lucide-react";

import {
  EquipmentCategoriesTab,
  VenuesTab,
  UserManagementTab,
  DepartmentsTab,
  OperatingHoursTab,
  FeeMatrixTab,
  VerificationPinTab,
  ProfileConfigTab,
  AcademicTermsTab,
  SystemSettingsTab,
  CommunicationLogsTab,
  AuditLogsTab,
  BrandsTab,
  ActiveSessionsTab,
  SecurityAlertsTab,
} from "@/components/settings-tabs";

// Tabs that require password confirmation before viewing
const PROTECTED_TABS = ["pin", "system_settings"];

const PROTECTED_TAB_NAMES = {
  pin: "Verification PIN",
  system_settings: "System Settings",
};

export const SETTINGS_CATEGORIES = [
  {
    id: "user_access",
    label: "User & Access Management",
    icon: Users,
    items: [
      {
        id: "users",
        label: "User Management",
        desc: "Staff accounts & RBAC permissions",
        icon: Users,
        permissionKey: "settings.users",
      },
      {
        id: "active_sessions",
        label: "Active Sessions",
        desc: "Monitor and remotely terminate terminals",
        icon: Laptop,
        permissionKey: "settings.active_sessions",
      },
      {
        id: "pin",
        label: "Verification PIN",
        desc: "Master security authorization & override rules",
        icon: Key,
        permissionKey: "settings.pin",
        superAdminOnly: true,
        protected: true,
      },
    ]
  },
  {
    id: "system_security",
    label: "System & Security Logs",
    icon: ShieldAlert,
    items: [
      {
        id: "security_alerts",
        label: "Security Alerts",
        desc: "Rate limits, lockouts & terminations",
        icon: ShieldAlert,
        permissionKey: "settings.security_alerts",
      },
      {
        id: "audit_logs",
        label: "Activity Audit Trail",
        desc: "System transactions & action trail",
        icon: Activity,
        permissionKey: "settings.audit_logs",
        altPermissionKeys: ["history_log.view"],
      },
      {
        id: "communication_logs",
        label: "SMS and Email Log",
        desc: "Brevo & iProg SMS dispatch log",
        icon: Building2,
        permissionKey: "settings.communication_logs",
      },
    ]
  },
  {
    id: "organization",
    label: "Organization Setup",
    icon: Building2,
    items: [
      {
        id: "brands",
        label: "Brands",
        desc: "Equipment manufacturer brands",
        icon: Tag,
        permissionKey: "settings.brands",
      },
      {
        id: "equipment",
        label: "Equipment Category",
        desc: "Physical item types & groupings",
        icon: Package,
        permissionKey: "settings.equipment",
      },
      {
        id: "venues",
        label: "Venue Creation",
        desc: "Campus rooms & capacity setup",
        icon: Building,
        permissionKey: "settings.venues",
      },
      {
        id: "departments",
        label: "Departments",
        desc: "Colleges & academic departments",
        icon: BookOpen,
        permissionKey: "settings.departments",
      },
    ]
  },
  {
    id: "operations",
    label: "Operations & Billing",
    icon: Clock,
    items: [
      {
        id: "fee_matrix",
        label: "Fee Matrix",
        desc: "Facility rental rates & policy",
        icon: DollarSign,
        permissionKey: "settings.fee_matrix",
      },
      {
        id: "operating_hours",
        label: "Operating Hours",
        desc: "Reservation hours & campus cutoff",
        icon: Clock,
        permissionKey: "settings.operating_hours",
      },
      {
        id: "academic_terms",
        label: "Academic Terms",
        desc: "Semester archiving & terms",
        icon: GraduationCap,
        permissionKey: "settings.academic_terms",
      },
    ]
  },
  {
    id: "account",
    label: "Account",
    icon: User,
    items: [
      {
        id: "profile",
        label: "Profile",
        desc: "Account credentials & password",
        icon: User,
        permissionKey: "settings.account",
        altPermissionKeys: ["settings.profile", "account.profile", "account"],
      },
      {
        id: "system_settings",
        label: "System Settings",
        desc: "Brevo SMTP & portal branding",
        icon: Sliders,
        permissionKey: "settings.system_settings",
        protected: true,
      },
    ]
  }
];

export default function Settings() {
  const { isSuperAdmin, hasPermission } = usePermissions();
  const context = useOutletContext();
  const selectedOffice = context?.selectedOffice ?? "All Offices";

  // Filter visible categories and tabs strictly based on Super Admin configured permissions
  const visibleCategories = useMemo(() => {
    return SETTINGS_CATEGORIES.map((cat) => {
      const items = cat.items.filter((tab) => {
        if (isSuperAdmin) return true;
        if (tab.superAdminOnly) return false;

        if (tab.permissionKey) {
          const keys = [tab.permissionKey, ...(tab.altPermissionKeys || [])];
          if (!keys.some((k) => hasPermission(k))) {
            return false;
          }
        }

        return true;
      });
      return { ...cat, items };
    }).filter((cat) => cat.items.length > 0);
  }, [isSuperAdmin, hasPermission]);

  const visibleTabs = useMemo(() => visibleCategories.flatMap((c) => c.items), [visibleCategories]);

  const [searchParams, setSearchParams] = useSearchParams();

  const resolveTab = useCallback((urlTab) => {
    if (urlTab && visibleTabs.some((t) => t.id === urlTab)) {
      return urlTab;
    }
    if (isSuperAdmin && visibleTabs.some((t) => t.id === "users")) {
      return "users";
    }
    if (visibleTabs.some((t) => t.id === "profile")) {
      return "profile";
    }
    return visibleTabs[0]?.id || "";
  }, [visibleTabs, isSuperAdmin]);

  const getCategoryForTab = useCallback((tabId) => {
    return visibleCategories.find((cat) => cat.items.some((it) => it.id === tabId))?.id || visibleCategories[0]?.id || "";
  }, [visibleCategories]);

  const [activeTab, setActiveTab] = useState(() => resolveTab(searchParams.get("tab")));
  const [mountedTabs, setMountedTabs] = useState(() => {
    const init = resolveTab(searchParams.get("tab"));
    return new Set(init ? [init] : []);
  });
  const [activeParentCategory, setActiveParentCategory] = useState(() => {
    const init = resolveTab(searchParams.get("tab"));
    return getCategoryForTab(init);
  });

  // Keep state in sync with URL search params and permissions
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    const targetTab = resolveTab(urlTab);
    if (targetTab) {
      setActiveTab(targetTab);
      setMountedTabs((prev) => new Set([...prev, targetTab]));
      setActiveParentCategory(getCategoryForTab(targetTab));
    }
  }, [searchParams, resolveTab, getCategoryForTab]);

  useEffect(() => {
    if (activeTab) {
      const parentId = getCategoryForTab(activeTab);
      if (parentId && parentId !== activeParentCategory) {
        setActiveParentCategory(parentId);
      }
    }
  }, [activeTab, getCategoryForTab, activeParentCategory]);

  // Track which protected tabs have been unlocked this session
  const [unlockedTabs, setUnlockedTabs] = useState(new Set());

  // Password confirmation modal state
  const [pendingTab, setPendingTab] = useState(null);
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const switchTab = useCallback((tabId) => {
    setActiveTab(tabId);
    setMountedTabs((prev) => new Set([...prev, tabId]));
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tabId);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleTabClick = useCallback((tabId) => {
    if (PROTECTED_TABS.includes(tabId) && !unlockedTabs.has(tabId)) {
      setPendingTab(tabId);
      setPwInput("");
      setPwError("");
      setShowPw(false);
      setShowPwModal(true);
      return;
    }
    switchTab(tabId);
  }, [unlockedTabs, switchTab]);

  const handleCategoryClick = useCallback((catId) => {
    setActiveParentCategory(catId);
    const cat = visibleCategories.find((c) => c.id === catId);
    if (cat && cat.items.length > 0) {
      if (!cat.items.some((it) => it.id === activeTab)) {
        handleTabClick(cat.items[0].id);
      }
    }
  }, [visibleCategories, activeTab, handleTabClick]);

  const handleVerifyPassword = useCallback(async (e) => {
    e.preventDefault();
    if (!pwInput.trim()) {
      setPwError("Please enter your password.");
      return;
    }
    setVerifying(true);
    setPwError("");
    try {
      await api.post("/verify-password", { password: pwInput });
      // Unlock the tab for this session
      setUnlockedTabs((prev) => new Set([...prev, pendingTab]));
      switchTab(pendingTab);
      setShowPwModal(false);
      setPendingTab(null);
      setPwInput("");
    } catch (err) {
      const msg = err.response?.data?.message || "Incorrect password. Please try again.";
      setPwError(msg);
    } finally {
      setVerifying(false);
    }
  }, [pwInput, pendingTab, switchTab]);

  const handleModalClose = useCallback(() => {
    setShowPwModal(false);
    setPendingTab(null);
    setPwInput("");
    setPwError("");
  }, []);

  const showMsg = useCallback((msg) => {
    const errCheck = typeof msg === "string" && (msg.includes("❌") || msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error"));
    const cleanMsg = (msg || "").replace(/^✅\s*|^❌\s*/, "").trim();
    if (errCheck) {
      notify.error("Action Failed", cleanMsg);
    } else {
      notify.success("Success", cleanMsg);
    }
  }, []);

  const currentCategory = useMemo(() => {
    return visibleCategories.find((c) => c.id === activeParentCategory) || visibleCategories[0];
  }, [visibleCategories, activeParentCategory]);

  if (visibleCategories.length === 0) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center font-sans">
        <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Settings Access</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          You do not have permission to access any administrative settings modules. Please contact your administrator if you require access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-sans">
      {/* ── Top Horizontal Parent Category Navigation ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {visibleCategories.map((cat) => {
          const isParentActive = activeParentCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer select-none ${
                isParentActive
                  ? "bg-blue-600 text-white font-semibold shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── Main Container: Left Sub-Menu + Right Content Canvas ── */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row overflow-hidden min-h-[580px]">
        {/* Left Sub-Menu Navigation */}
        <aside className="w-full md:w-56 shrink-0 bg-white dark:bg-slate-900/60 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 py-3 px-2">
          {currentCategory && (
            <>
              <div className="px-2.5 pb-2 mb-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {currentCategory.label}
                </span>
              </div>
              <nav className="space-y-0.5">
                {currentCategory.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = activeTab === item.id;
                  const isProtected = item.protected && !unlockedTabs.has(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer select-none ${
                        isActive
                          ? "border-l-2 border-blue-600 bg-blue-50/70 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-semibold"
                          : "border-l-2 border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 font-normal"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ItemIcon
                          size={14}
                          className={`shrink-0 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isProtected && (
                        <Lock size={11} className={isActive ? "text-blue-500" : "text-slate-400 dark:text-slate-500"} />
                      )}
                    </button>
                  );
                })}
              </nav>
            </>
          )}
        </aside>

        {/* ── Right Content Canvas: Inlined & Aligned ── */}
        <main className="flex-1 min-w-0 p-5 lg:p-6 bg-white dark:bg-[#111827]">
          {mountedTabs.has("users") && (
            <div className={activeTab === "users" ? "block" : "hidden"}>
              <UserManagementTab showMsg={showMsg} />
            </div>
          )}
          {mountedTabs.has("active_sessions") && (
            <div className={activeTab === "active_sessions" ? "block" : "hidden"}>
              <ActiveSessionsTab />
            </div>
          )}
          {mountedTabs.has("security_alerts") && (
            <div className={activeTab === "security_alerts" ? "block" : "hidden"}>
              <SecurityAlertsTab />
            </div>
          )}
          {mountedTabs.has("audit_logs") && (
            <div className={activeTab === "audit_logs" ? "block" : "hidden"}>
              <AuditLogsTab />
            </div>
          )}
          {mountedTabs.has("brands") && (
            <div className={activeTab === "brands" ? "block" : "hidden"}>
              <BrandsTab />
            </div>
          )}
          {mountedTabs.has("equipment") && (
            <div className={activeTab === "equipment" ? "block" : "hidden"}>
              <EquipmentCategoriesTab showMsg={showMsg} />
            </div>
          )}
          {mountedTabs.has("venues") && (
            <div className={activeTab === "venues" ? "block" : "hidden"}>
              <VenuesTab showMsg={showMsg} />
            </div>
          )}
          {mountedTabs.has("fee_matrix") && (
            <div className={activeTab === "fee_matrix" ? "block" : "hidden"}>
              <FeeMatrixTab officeScope={selectedOffice} showMsg={showMsg} />
            </div>
          )}
          {mountedTabs.has("departments") && (
            <div className={activeTab === "departments" ? "block" : "hidden"}>
              <DepartmentsTab showMsg={showMsg} />
            </div>
          )}
          {mountedTabs.has("operating_hours") && (
            <div className={activeTab === "operating_hours" ? "block" : "hidden"}>
              <OperatingHoursTab showMsg={showMsg} />
            </div>
          )}
          {mountedTabs.has("academic_terms") && (
            <div className={activeTab === "academic_terms" ? "block" : "hidden"}>
              <AcademicTermsTab showMsg={showMsg} />
            </div>
          )}
          {activeTab === "pin" && (
            <div className="block">
              <VerificationPinTab showMsg={showMsg} />
            </div>
          )}
          {mountedTabs.has("communication_logs") && (
            <div className={activeTab === "communication_logs" ? "block" : "hidden"}>
              <CommunicationLogsTab />
            </div>
          )}
          {mountedTabs.has("system_settings") && (
            <div className={activeTab === "system_settings" ? "block" : "hidden"}>
              <SystemSettingsTab showMsg={showMsg} />
            </div>
          )}
          {mountedTabs.has("profile") && (
            <div className={activeTab === "profile" ? "block" : "hidden"}>
              <ProfileConfigTab showMsg={showMsg} />
            </div>
          )}
        </main>
      </div>

      {/* Password Verification Modal */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Security Verification</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Accessing {PROTECTED_TAB_NAMES[pendingTab] || "Protected Section"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleModalClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleVerifyPassword} className="mt-4 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Please enter your password to unlock this protected settings module.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={pwInput}
                    onChange={(e) => { setPwInput(e.target.value); setPwError(""); }}
                    placeholder="Enter your password"
                    autoFocus
                    className={`w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors ${
                      pwError ? "border-red-400 focus:border-red-500" : "border-slate-200 dark:border-slate-700 focus:border-blue-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {pwError && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1.5 flex items-center gap-1">
                    <span>⚠</span> {pwError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-xs"
                >
                  {verifying ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    "Confirm & Access"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
