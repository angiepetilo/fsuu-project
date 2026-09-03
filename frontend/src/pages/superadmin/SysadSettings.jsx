import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import notify from "@/lib/notify";
import api from "@/lib/axios";
import {
  Users, Building2, Package, BookOpen, Clock,
  DollarSign, Key, User, Sliders, Building, GraduationCap,
  Lock, Eye, EyeOff, ShieldAlert, Loader2, X, ChevronRight
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
} from "@/components/settings-tabs";

// Tabs that require password confirmation before viewing
const PROTECTED_TABS = ["pin", "system_settings"];

const SYSAD_TABS = [
  { id: "users",             label: "User Management",            desc: "Staff accounts & RBAC permissions", icon: Users },
  { id: "audit_logs",        label: "Audit Logs",                 desc: "System transactions & security log", icon: ShieldAlert },
  { id: "equipment",         label: "Equipment Category",         desc: "Physical item types & groupings", icon: Package },
  { id: "venues",            label: "Venue Creation",             desc: "Campus rooms & capacity setup",   icon: Building },
  { id: "fee_matrix",        label: "Fee Matrix",                  desc: "Facility rental rates & policy",  icon: DollarSign },
  { id: "departments",       label: "Departments",                 desc: "Colleges & academic departments", icon: BookOpen },
  { id: "operating_hours",   label: "Operating Hours",             desc: "Reservation hours & campus cutoff", icon: Clock },
  { id: "academic_terms",    label: "Academic Terms",              desc: "Semester archiving & terms",      icon: GraduationCap },
  { id: "pin",               label: "Verification PIN",            desc: "6-digit emergency overrides",     icon: Key,     protected: true },
  { id: "communication_logs",label: "SMS and Email Log",           desc: "Brevo & iProg SMS dispatch log",  icon: Building2 },
  { id: "system_settings",   label: "System Settings",             desc: "Brevo SMTP & portal branding",    icon: Sliders, protected: true },
  { id: "profile",           label: "Profile",                     desc: "Super Admin credentials",         icon: User },
];

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

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row overflow-visible font-sans">
      {/* ── Left Sidebar: Integrated Vertical Navigation ── */}
      <aside className="w-full lg:w-60 xl:w-64 shrink-0 bg-slate-50/70 border-b lg:border-b-0 lg:border-r border-slate-200/80 p-3 flex flex-col justify-between">
        <nav className="space-y-1 pr-0.5">
          {SYSAD_TABS.map((tab) => {
            const IconComp = tab.icon;
            const active = activeTab === tab.id;
            const isProtected = tab.protected && !unlockedTabs.has(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <IconComp size={15} className={`shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                  <span className="truncate">{tab.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isProtected && (
                    <Lock size={12} className={active ? "text-blue-200" : "text-slate-400"} />
                  )}
                  <ChevronRight size={13} className={`shrink-0 transition-transform ${active ? "text-white" : "text-slate-300 opacity-0 group-hover:opacity-100"}`} />
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Right Content Canvas: Inlined & Aligned ── */}
      <main className="flex-1 min-w-0 p-6 lg:p-7 bg-white">
        {/* Active Tab Content Render — persistent tab states to prevent reload/unmount */}
        {mountedTabs.has("users") && (
          <div className={activeTab === "users" ? "block" : "hidden"}>
            <UserManagementTab showMsg={showMsg} />
          </div>
        )}
        {mountedTabs.has("audit_logs") && (
          <div className={activeTab === "audit_logs" ? "block" : "hidden"}>
            <AuditLogsTab />
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
