import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import notify from "@/lib/notify";
import api from "@/lib/axios";
import {
  Users, Building2, Package, BookOpen, Clock,
  DollarSign, Key, User, Sliders, Building, GraduationCap,
  Lock, Eye, EyeOff, ShieldAlert, Loader2, X
} from "lucide-react";

import EquipmentCategoriesTab from "../admin/tabs/EquipmentCategoriesTab";
import VenuesTab from "./tabs/VenuesTab";
import UserManagementTab from "./tabs/UserManagementTab";
import DepartmentsTab from "./tabs/DepartmentsTab";
import OperatingHoursTab from "./tabs/OperatingHoursTab";
import FeeMatrixTab from "../admin/tabs/FeeMatrixTab";
import VerificationPinTab from "./tabs/VerificationPinTab";
import ProfileConfigTab from "./tabs/ProfileConfigTab";
import AcademicTermsTab from "./tabs/AcademicTermsTab";
import SystemSettingsTab from "./tabs/SystemSettingsTab";
import CommunicationLogsTab from "./tabs/CommunicationLogsTab";
import AuditLogsTab from "./tabs/AuditLogsTab";

// Tabs that require password confirmation before viewing
const PROTECTED_TABS = ["pin", "system_settings"];

const SYSAD_TABS = [
  { id: "users",             label: "User Management",            icon: Users },
  { id: "audit_logs",        label: "Audit Logs",                 icon: ShieldAlert },
  { id: "equipment",         label: "Equipment Category",         icon: Package },
  { id: "venues",            label: "Venue Creation",             icon: Building },
  { id: "fee_matrix",        label: "Fee Matrix",                  icon: DollarSign },
  { id: "departments",       label: "Departments",                 icon: BookOpen },
  { id: "operating_hours",   label: "Operating Hours",             icon: Clock },
  { id: "academic_terms",    label: "Academic Terms",              icon: GraduationCap },
  { id: "pin",               label: "Verification PIN",            icon: Key,     protected: true },
  { id: "communication_logs",label: "SMS and Email Log",           icon: Building2 },
  { id: "system_settings",   label: "System Settings",             icon: Sliders, protected: true },
  { id: "profile",           label: "Profile",                     icon: User },
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

  // Verification PIN state
  const [pinConfig, setPinConfig] = useState({ pin: "", enabled: false });
  const [pinSavedFeedback, setPinSavedFeedback] = useState(null);
  const handleSavePinConfig = () => {
    showMsg("Verification PIN saved successfully!");
  };

  // Track which protected tabs have been unlocked this session
  const [unlockedTabs, setUnlockedTabs] = useState(new Set());

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setMountedTabs((prev) => new Set([...prev, tabId]));
    try {
      localStorage.setItem("fsuu_sysad_active_tab", tabId);
    } catch {}
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
    } else {
      switchTab(tabId);
    }
  };

  const handlePasswordSubmit = async (e) => {
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
    <div className="space-y-6">
      {/* Direct High-Visibility Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
        {SYSAD_TABS.map((tab) => {
          const IconComp = tab.icon;
          const active = activeTab === tab.id;
          const isProtected = tab.protected && !unlockedTabs.has(tab.id);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${
                active
                  ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                  : "border-transparent text-slate-600 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              <IconComp size={14} />
              <span>{tab.label}</span>
              {isProtected && (
                <Lock size={11} className={active ? "text-blue-200" : "text-slate-400"} />
              )}
            </button>
          );
        })}
      </div>

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
          <FeeMatrixTab officeScope="All Offices" showMsg={showMsg} />
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
          <VerificationPinTab
            pinConfig={pinConfig}
            setPinConfig={setPinConfig}
            pinSavedFeedback={pinSavedFeedback}
            handleSavePinConfig={handleSavePinConfig}
            showMsg={showMsg}
          />
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

      {/* ── Password Confirmation Modal ── */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleModalClose}
          />

          {/* Modal Card */}
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm mx-4 p-7 z-10">
            {/* Close */}
            <button
              type="button"
              onClick={handleModalClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Icon + Heading */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                <ShieldAlert size={26} className="text-blue-600" />
              </div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Admin Access Required
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Enter your Super Admin password to access{" "}
                <span className="font-bold text-slate-700">
                  {PROTECTED_TAB_NAMES[pendingTab] || "this section"}
                </span>
                .
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={14} />
                  </div>
                  <input
                    type={showPw ? "text" : "password"}
                    value={pwInput}
                    onChange={(e) => { setPwInput(e.target.value); setPwError(""); }}
                    placeholder="Enter your password"
                    autoFocus
                    className={`w-full pl-9 pr-10 py-2.5 bg-slate-50 border rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none transition-colors ${
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
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {verifying ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Confirm"
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
