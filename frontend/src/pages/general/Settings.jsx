import { useState, useEffect } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import notify from "@/lib/notify";
import api from "@/lib/axios";
import {
  ShieldCheck, Package, Building, DollarSign, BookOpen, Clock,
  GraduationCap, Key, Sliders, User, Mail, ChevronRight, ChevronDown,
  Lock, Eye, EyeOff, ShieldAlert, Loader2, X, Tag, Laptop, Activity,
  Building2, Users
} from "lucide-react";

import {
  UserManagementTab,
  EquipmentCategoriesTab,
  VenuesTab,
  FeeMatrixTab,
  DepartmentsTab,
  OperatingHoursTab,
  AcademicTermsTab,
  VerificationPinTab,
  SystemSettingsTab,
  CommunicationLogsTab,
  ProfileConfigTab,
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

const SETTINGS_CATEGORIES = [
  {
    id: "user_access",
    label: "User & Access Management",
    icon: Users,
    items: [
      { id: "roles", label: "User Management", desc: "Staff accounts & RBAC permissions", icon: ShieldCheck, superAdminOnly: true },
      { id: "active_sessions", label: "Active Sessions", desc: "Monitor & remotely terminate terminals", icon: Laptop, permissionKey: "settings.active_sessions" },
      { id: "pin", label: "Verification PIN", desc: "6-digit emergency overrides", icon: Key, permissionKey: "settings.pin", staffOnly: true, protected: true },
    ]
  },
  {
    id: "system_security",
    label: "System & Security Logs",
    icon: ShieldAlert,
    items: [
      { id: "security_alerts", label: "Security Alerts", desc: "Rate limits, lockouts & terminations", icon: ShieldAlert, permissionKey: "settings.security_alerts" },
      { id: "audit_logs", label: "Activity Audit Trail", desc: "System transactions & action trail", icon: Activity, permissionKey: "settings.audit_logs" },
      { id: "communication_logs", label: "SMS and Email Log", desc: "Brevo & iProg SMS dispatch log", icon: Mail, permissionKey: "settings.communication_logs" },
    ]
  },
  {
    id: "organization",
    label: "Organization Setup",
    icon: Building2,
    items: [
      { id: "brands", label: "Brands", desc: "Equipment manufacturer brands", icon: Tag, permissionKey: "settings.brands" },
      { id: "equipment", label: "Equipment Category", desc: "Equipment item catalog groups", icon: Package, permissionKey: "settings.equipment" },
      { id: "venues", label: "Venue Creation", desc: "Campus rooms & capacity setup", icon: Building, permissionKey: "settings.venues" },
      { id: "departments", label: "Departments", desc: "University academic units", icon: BookOpen, permissionKey: "settings.departments" },
    ]
  },
  {
    id: "operations",
    label: "Operations & Billing",
    icon: Clock,
    items: [
      { id: "fee_matrix", label: "Fee Matrix", desc: "Facility rental fee schedule", icon: DollarSign, permissionKey: "settings.fee_matrix", staffOnly: true },
      { id: "operating_hours", label: "Operating Hours", desc: "Campus hours & reservation cutoffs", icon: Clock, permissionKey: "settings.operating_hours", staffOnly: true },
      { id: "academic_terms", label: "Academic Terms", desc: "Semester terms & archiving", icon: GraduationCap, permissionKey: "settings.academic_terms", staffOnly: true },
    ]
  },
  {
    id: "account",
    label: "Account",
    icon: User,
    items: [
      { id: "profile", label: "Profile", desc: "Account credentials & password", icon: User },
      { id: "system_settings", label: "System Settings", desc: "Branding and portal parameters", icon: Sliders, permissionKey: "settings.system_settings", staffOnly: true, protected: true },
    ]
  }
];

const ALL_SETTINGS_TABS = SETTINGS_CATEGORIES.flatMap((c) => c.items);

export default function Settings() {
  const { user, isSuperAdmin, isStudentAssistant, isStaff, hasPermission } = usePermissions();
  const context = useOutletContext();
  const selectedOffice = context?.selectedOffice ?? "All Offices";

  // Filter visible categories and tabs strictly based on Super Admin configured permissions
  const visibleCategories = SETTINGS_CATEGORIES.map((cat) => {
    const items = cat.items.filter((tab) => {
      if (isSuperAdmin) return true;
      if (tab.superAdminOnly) return false;
      if (tab.id === "profile") return true;

      // Student Assistants only have access to their personal Profile tab
      if (isStudentAssistant) {
        return false;
      }

      if (tab.permissionKey && !hasPermission(tab.permissionKey)) {
        return false;
      }

      return true;
    });
    return { ...cat, items };
  }).filter((cat) => cat.items.length > 0);

  const visibleTabs = visibleCategories.flatMap((c) => c.items);

  const [searchParams, setSearchParams] = useSearchParams();

  // Determine tab from URL param or default to profile
  const getInitialTab = () => {
    const urlTab = searchParams.get("tab");
    if (urlTab && visibleTabs.some((t) => t.id === urlTab)) {
      return urlTab;
    }
    if (visibleTabs.some((t) => t.id === "profile")) {
      return "profile";
    }
    return visibleTabs[0]?.id || "profile";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [mountedTabs, setMountedTabs] = useState(() => new Set([getInitialTab()]));

  // Track expanded accordion categories (default expands category of active tab)
  const [openCategories, setOpenCategories] = useState(() => {
    const initTab = getInitialTab();
    const state = {};
    SETTINGS_CATEGORIES.forEach((cat) => {
      state[cat.id] = cat.items.some((it) => it.id === initTab);
    });
    return state;
  });

  // Automatically expand category when activeTab changes
  useEffect(() => {
    const parentCat = SETTINGS_CATEGORIES.find((cat) =>
      cat.items.some((it) => it.id === activeTab)
    );
    if (parentCat) {
      setOpenCategories((prev) => ({ ...prev, [parentCat.id]: true }));
    }
  }, [activeTab]);

  const toggleCategory = (catId) => {
    setOpenCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Track which protected tabs have been unlocked this session
  const [unlockedTabs, setUnlockedTabs] = useState(new Set());

  // Password confirmation modal state
  const [pendingTab, setPendingTab] = useState(null);
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [verifying, setVerifying] = useState(false);

  // When user navigates from other features to /settings, reset to permitted tab
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    const targetTab = urlTab && visibleTabs.some((t) => t.id === urlTab) ? urlTab : (visibleTabs[0]?.id || "equipment");
    setActiveTab(targetTab);
    setMountedTabs((prev) => new Set([...prev, targetTab]));
  }, [searchParams, isSuperAdmin, isStudentAssistant]);

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setMountedTabs((prev) => new Set([...prev, tabId]));
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tabId);
      return next;
    }, { replace: true });
  };

  const handleTabClick = (tabId) => {
    if (PROTECTED_TABS.includes(tabId) && !unlockedTabs.has(tabId)) {
      setPendingTab(tabId);
      setPwInput("");
      setPwError("");
      setShowPw(false);
      setShowPwModal(true);
      return;
    }
    switchTab(tabId);
  };

  const handleVerifyPassword = async (e) => {
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
  };

  const handleModalClose = () => {
    setShowPwModal(false);
    setPendingTab(null);
    setPwInput("");
    setPwError("");
  };

  const showMsg = (msg) => {
    const errCheck = typeof msg === "string" && (msg.includes("❌") || msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error"));
    const cleanMsg = (msg || "").replace(/^✅\s*|^❌\s*/, "").trim();

    if (errCheck) {
      notify.error("Action Failed", cleanMsg);
    } else {
      notify.success("Success", cleanMsg);
    }
  };

  return (
    <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row overflow-visible font-sans">
      {/* ── Left Sidebar: Integrated Collapsible Accordion Navigation ── */}
      <aside className="w-full lg:w-64 xl:w-72 shrink-0 bg-slate-50/70 dark:bg-slate-900/60 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800 p-3 flex flex-col justify-between">
        <nav className="space-y-2 pr-0.5">
          {visibleCategories.map((category) => {
            const CatIcon = category.icon;
            const isOpen = Boolean(openCategories[category.id]);
            const hasActiveChild = category.items.some((it) => it.id === activeTab);

            return (
              <div key={category.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer group select-none ${
                    hasActiveChild
                      ? "bg-blue-50/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-black"
                      : "hover:bg-slate-100/70 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-extrabold"
                  }`}
                  title={`${isOpen ? "Collapse" : "Expand"} ${category.label}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`p-1 rounded-lg shrink-0 transition-colors ${
                        hasActiveChild
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-slate-300 dark:group-hover:bg-slate-700"
                      }`}
                    >
                      <CatIcon size={13} />
                    </div>
                    <span className="truncate text-[11px] uppercase tracking-wider font-extrabold">
                      {category.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${
                        hasActiveChild
                          ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {category.items.length}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 shrink-0 ${
                        isOpen ? "rotate-0 text-slate-700 dark:text-slate-200" : "-rotate-90 text-slate-400 dark:text-slate-500"
                      }`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="space-y-1 pl-2.5 ml-3 border-l-2 border-slate-200/90 dark:border-slate-800 pt-0.5 pb-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    {category.items.map((tab) => {
                      const IconComp = tab.icon;
                      const active = activeTab === tab.id;
                      const isProtected = PROTECTED_TABS.includes(tab.id) && !unlockedTabs.has(tab.id);

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => handleTabClick(tab.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                            active
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <IconComp
                              size={14}
                              className={`shrink-0 ${active ? "text-white" : "text-slate-400 dark:text-slate-500"}`}
                            />
                            <span className="truncate">{tab.label}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isProtected && (
                              <Lock size={11} className={active ? "text-blue-200" : "text-slate-400 dark:text-slate-500"} />
                            )}
                            <ChevronRight
                              size={12}
                              className={`shrink-0 transition-transform ${
                                active ? "text-white" : "text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100"
                              }`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Right Content Canvas: Inlined & Aligned ── */}
      <main className="flex-1 min-w-0 p-6 lg:p-7 bg-white dark:bg-[#111827]">
        {/* Active Tab Content Render — persistent tab states to prevent reload/unmount */}
        {mountedTabs.has("roles") && (
          <div className={activeTab === "roles" ? "block" : "hidden"}>
            <UserManagementTab />
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
        {mountedTabs.has("pin") && (
          <div className={activeTab === "pin" ? "block" : "hidden"}>
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

      {/* Password Verification Modal */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Authentication Required
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Unlocking {PROTECTED_TAB_NAMES[pendingTab] || "Protected Settings"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleModalClose}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleVerifyPassword} className="mt-4 space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                Please enter your password to unlock this protected settings module.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={pwInput}
                    onChange={(e) => { setPwInput(e.target.value); setPwError(""); }}
                    placeholder="Enter your password"
                    autoFocus
                    className={`w-full pl-3 pr-10 py-2.5 bg-slate-50 border rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none transition-colors ${
                      pwError ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-blue-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
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
