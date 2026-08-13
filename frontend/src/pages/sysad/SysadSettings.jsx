import { useState } from "react";
import { toast } from "sonner";
import {
  Users, Building2, Package, BookOpen, Clock,
  DollarSign, Key, User, CheckCircle2, ShieldCheck, Building, MapPin, X, AlertCircle
} from "lucide-react";

import EquipmentCategoriesTab from "../admin/tabs/EquipmentCategoriesTab";
import VenuesTab from "./tabs/VenuesTab";
import CampusManagementTab from "./tabs/CampusManagementTab";
import UserManagementTab from "./tabs/UserManagementTab";
import DepartmentsTab from "./tabs/DepartmentsTab";
import OperatingHoursTab from "./tabs/OperatingHoursTab";
import FeeMatrixTab from "../admin/tabs/FeeMatrixTab";
import VerificationPinTab from "./tabs/VerificationPinTab";
import ProfileConfigTab from "./tabs/ProfileConfigTab";

export default function SysadSettings() {
  const [primaryTab, setPrimaryTab] = useState("category");
  const [subTab, setSubTab] = useState("catalog");

  // Shared feedback banner & toast notification
  const [feedback, setFeedback] = useState(null);
  const [isError, setIsError] = useState(false);

  const showMsg = (msg) => {
    const errCheck = typeof msg === "string" && (msg.includes("❌") || msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error"));
    const cleanMsg = (msg || "").replace(/^✅\s*|^❌\s*/, "").trim();

    if (errCheck) {
      try { toast.error(cleanMsg); } catch {}
    } else {
      try { toast.success(cleanMsg); } catch {}
    }
  };
  // Verification PIN state (passed into VerificationPinTab)
  const [pinConfig, setPinConfig] = useState({ pin: "", enabled: false });
  const [pinSavedFeedback, setPinSavedFeedback] = useState(null);
  const handleSavePinConfig = () => {
    showMsg("Verification PIN saved successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-slate-900" size={22} />
            System Control &amp; Configurations
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Global management, combined analytics, office reports &amp; inventory filter.
          </p>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "category", label: "Category", icon: Package, defaultSub: "catalog" },
          { id: "campus_configure", label: "Campus Configure", icon: Building2, defaultSub: "users" },
          { id: "account_security", label: "Account & Security", icon: Key, defaultSub: "profile" },
        ].map((tab) => {
          const IconComp = tab.icon;
          const active = primaryTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setPrimaryTab(tab.id);
                setSubTab(tab.defaultSub);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                active
                  ? "border-slate-900 bg-white text-slate-900 shadow-2xs"
                  : "border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <IconComp size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Sub-Pill Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 w-fit">
        {primaryTab === "category" && [
          { id: "catalog", label: "Equipment Catalog", icon: Package },
          { id: "venues_catalog", label: "Venue Catalog", icon: Building },
          { id: "pricing_matrix", label: "Fee Matrix", icon: DollarSign },
        ].map((st) => {
          const IconC = st.icon;
          const active = subTab === st.id;
          return (
            <button
              key={st.id}
              onClick={() => setSubTab(st.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                active
                  ? "border-slate-900 bg-white text-slate-900 shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <IconC size={13} />
              <span>{st.label}</span>
            </button>
          );
        })}

        {primaryTab === "campus_configure" && [
          { id: "users", label: "User Management", icon: Users },
          { id: "campuses_offices", label: "Campuses & Branch Offices", icon: Building2 },
          { id: "departments", label: "Department / Program", icon: BookOpen },
          { id: "operating_hours", label: "Operating Hours & Grace Periods", icon: Clock },
        ].map((st) => {
          const IconC = st.icon;
          const active = subTab === st.id || (st.id === "campuses_offices" && (subTab === "locations" || subTab === "offices"));
          return (
            <button
              key={st.id}
              onClick={() => setSubTab(st.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                active
                  ? "border-slate-900 bg-white text-slate-900 shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <IconC size={13} />
              <span>{st.label}</span>
            </button>
          );
        })}

        {primaryTab === "account_security" && [
          { id: "profile", label: "Profile Configuration", icon: User },
          { id: "verification_pin", label: "Verification PIN", icon: Key },
        ].map((st) => {
          const IconC = st.icon;
          const active = subTab === st.id;
          return (
            <button
              key={st.id}
              onClick={() => setSubTab(st.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                active
                  ? "border-slate-900 bg-white text-slate-900 shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <IconC size={13} />
              <span>{st.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Views */}
      {subTab === "catalog" && <EquipmentCategoriesTab showMsg={showMsg} />}
      {subTab === "venues_catalog" && <VenuesTab showMsg={showMsg} />}
      {(subTab === "campuses_offices" || subTab === "locations" || subTab === "offices") && (
        <CampusManagementTab showMsg={showMsg} />
      )}
      {subTab === "users" && <UserManagementTab showMsg={showMsg} />}
      {subTab === "departments" && <DepartmentsTab showMsg={showMsg} />}
      {subTab === "operating_hours" && <OperatingHoursTab showMsg={showMsg} />}
      {subTab === "pricing_matrix" && <FeeMatrixTab officeScope="All Offices" showMsg={showMsg} />}
      {subTab === "verification_pin" && (
        <VerificationPinTab
          pinConfig={pinConfig}
          setPinConfig={setPinConfig}
          pinSavedFeedback={pinSavedFeedback}
          handleSavePinConfig={handleSavePinConfig}
        />
      )}
      {subTab === "profile" && <ProfileConfigTab showMsg={showMsg} />}
    </div>
  );
}
