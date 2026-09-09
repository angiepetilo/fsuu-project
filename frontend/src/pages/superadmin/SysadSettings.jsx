import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import notify from "@/lib/notify";
import api from "@/lib/axios";
import {
  Users, Building2, Package, BookOpen, Clock,
  DollarSign, Key, User, Sliders, Building, GraduationCap,
  Lock, Eye, EyeOff, ShieldAlert, Loader2, X, ChevronRight, ChevronDown,
  Tag, Laptop, Activity, ShieldCheck
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

const SYSAD_CATEGORIES = [
  {
    id: "user_access",
    label: "User & Access Management",
    icon: Users,
    items: [
      { id: "users",             label: "User Management",            desc: "Staff accounts & RBAC permissions", icon: Users },
      { id: "active_sessions",   label: "Active Sessions",            desc: "Monitor and remotely terminate terminals", icon: Laptop },
      { id: "pin",               label: "Verification PIN",            desc: "6-digit emergency overrides",     icon: Key,     protected: true },
    ]
  },
  {
    id: "system_security",
    label: "System & Security Logs",
    icon: ShieldAlert,
    items: [
      { id: "security_alerts",   label: "Security Alerts",            desc: "Rate limits, lockouts & terminations", icon: ShieldAlert },
      { id: "audit_logs",        label: "Activity Audit Trail",       desc: "System transactions & action trail", icon: Activity },
      { id: "communication_logs",label: "SMS and Email Log",           desc: "Brevo & iProg SMS dispatch log",  icon: Building2 },
    ]
  },
  {
    id: "organization",
    label: "Organization Setup",
    icon: Building2,
    items: [
      { id: "brands",            label: "Brands",                     desc: "Equipment manufacturer brands",   icon: Tag },
      { id: "equipment",         label: "Equipment Category",         desc: "Physical item types & groupings", icon: Package },
      { id: "venues",            label: "Venue Creation",             desc: "Campus rooms & capacity setup",   icon: Building },
      { id: "departments",       label: "Departments",                 desc: "Colleges & academic departments", icon: BookOpen },
    ]
  },
  {
    id: "operations",
    label: "Operations & Billing",
    icon: Clock,
    items: [
      { id: "fee_matrix",        label: "Fee Matrix",                  desc: "Facility rental rates & policy",  icon: DollarSign },
      { id: "operating_hours",   label: "Operating Hours",             desc: "Reservation hours & campus cutoff", icon: Clock },
      { id: "academic_terms",    label: "Academic Terms",              desc: "Semester archiving & terms",      icon: GraduationCap },
    ]
  },
  {
    id: "account",
    label: "Account",
    icon: Sliders,
    items: [
      { id: "system_settings",   label: "System Settings",             desc: "Brevo SMTP & portal branding",    icon: Sliders, protected: true },
      { id: "profile",           label: "Profile",                     desc: "Super Admin credentials",         icon: User },
    ]
  }
];

const SYSAD_TABS = SYSAD_CATEGORIES.flatMap((c) => c.items);

const PROTECTED_TAB_NAMES = {
  pin:             "Verification PIN",
  system_settings: "System Settings",
};

export default function SysadSettings() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine tab from URL param or default to "users"
  const getInitialTab = () => {
    const urlTab = searchParams.get("tab");
    if (urlTab && SYSAD_TABS.some((t) => t.id === urlTab)) {
      return urlTab;
    }
    return "users";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [mountedTabs, setMountedTabs] = useState(() => new Set([getInitialTab()]));

  // Find parent category for a tab
  const getCategoryForTab = (tabId) => {
    return SYSAD_CATEGORIES.find((cat) => cat.items.some((it) => it.id === tabId))?.id || SYSAD_CATEGORIES[0].id;
  };

  const [activeParentCategory, setActiveParentCategory] = useState(() => getCategoryForTab(getInitialTab()));

  useEffect(() => {
    const parentId = getCategoryForTab(activeTab);
    setActiveParentCategory(parentId);
  }, [activeTab]);

  // When user navigates from other features to /sysad/settings, always reset to default tab if no ?tab= in URL
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    const targetTab = urlTab && SYSAD_TABS.some((t) => t.id === urlTab) ? urlTab : "users";
    setActiveTab(targetTab);
    setMountedTabs((prev) => new Set([...prev, targetTab]));
  }, [searchParams]);

  // Password modal state
  const [pendingTab, setPendingTab]     = useState(null);
  const [showPwModal, setShowPwModal]   = useState(false);
  const [pwInput, setPwInput]           = useState("");
  const [showPw, setShowPw]             = useState(false);
  const [pwError, setPwError]           = useState("");
  const [verifying, setVerifying]       = useState(false);

  const showMsg = (msg) => {
    const errCheck = typeof msg === "string" && (msg.includes("❌") || msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error"));
    const cleanMsg = (msg || "").replace(/^✅\s*|^❌\s*/, "").trim();
    if (errCheck) {
      notify.error("Action Failed", cleanMsg);
    } else {
      notify.success("Success", cleanMsg);
    }
  };

  // Track which protected tabs have been unlocked this session
  const [unlockedTabs, setUnlockedTabs] = useState(new Set());

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

  const currentCategory = SYSAD_CATEGORIES.find((c) => c.id === activeParentCategory) || SYSAD_CATEGORIES[0];

  return (
    <div className="space-y-3 font-sans">
      {/* ── Top Horizontal Parent Category Navigation ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {SYSAD_CATEGORIES.map((cat) => {
          const isParentActive = activeParentCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveParentCategory(cat.id);
                if (!cat.items.some((it) => it.id === activeTab)) {
                  handleTabClick(cat.items[0].id);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer select-none ${
                isParentActive
                  ? "bg-blue-600 text-white font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── Main Container: Left Sub-Menu + Right Content Canvas ── */}
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col md:flex-row overflow-hidden min-h-[580px]">
        {/* Left Sub-Menu Navigation */}
        <aside className="w-full md:w-56 shrink-0 bg-white border-b md:border-b-0 md:border-r border-slate-100 py-3 px-2">
          <div className="px-2.5 pb-2 mb-1.5 border-b border-slate-100">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
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
                      ? "border-l-2 border-blue-600 bg-blue-50/70 text-blue-600 font-semibold"
                      : "border-l-2 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ItemIcon
                      size={14}
                      className={`shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isProtected && (
                    <Lock size={11} className={isActive ? "text-blue-500" : "text-slate-400"} />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Right Content Canvas: Inlined & Aligned ── */}
        <main className="flex-1 min-w-0 p-5 lg:p-6 bg-white">
        {/* Active Tab Content Render — persistent tab states to prevent reload/unmount */}
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
            <FeeMatrixTab showMsg={showMsg} />
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
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Security Verification</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Accessing {PROTECTED_TAB_NAMES[pendingTab] || "Protected Section"}
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
                Please enter your administrator password to unlock this protected settings module.
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
