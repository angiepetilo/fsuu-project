import { useState } from "react";
import {
  Users, Building2, Package, BookOpen, Clock,
  DollarSign, Key, User, CheckCircle2, ShieldCheck, Building, MapPin
} from "lucide-react";

import EquipmentCatalogTab from "./tabs/EquipmentCatalogTab";
import VenuesTab from "./tabs/VenuesTab";
import CampusLocationsTab from "./tabs/CampusLocationsTab";
import UserManagementTab from "./tabs/UserManagementTab";
import CampusOfficesTab from "./tabs/CampusOfficesTab";
import DepartmentsTab from "./tabs/DepartmentsTab";
import OperatingHoursTab from "./tabs/OperatingHoursTab";
import FeeMatrixTab from "./tabs/FeeMatrixTab";
import VerificationPinTab from "./tabs/VerificationPinTab";
import ProfileConfigTab from "./tabs/ProfileConfigTab";

export default function SysadSettings() {
  const [primaryTab, setPrimaryTab] = useState("category");
  const [subTab, setSubTab] = useState("catalog");

  // Shared feedback banner
  const [feedback, setFeedback] = useState(null);
  const showMsg = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Verification PIN state (passed into VerificationPinTab)
  const [pinConfig, setPinConfig] = useState({ pin: "", enabled: false });
  const [pinSavedFeedback, setPinSavedFeedback] = useState(null);
  const handleSavePinConfig = () => {
    setPinSavedFeedback("✅ Verification PIN saved successfully!");
    setTimeout(() => setPinSavedFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-amber-500" size={24} />
            System Control &amp; Configurations
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Global management, combined analytics, office reports &amp; inventory filter
          </p>
        </div>
      </div>

      {feedback && (
        <div className="bg-emerald-500 text-white text-xs font-bold px-5 py-3 rounded-2xl flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 size={16} />
          {feedback}
        </div>
      )}

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
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                active ? "bg-slate-900 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <IconComp size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Sub-Pill Navigation */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 max-w-max">
        {primaryTab === "category" && [
          { id: "catalog", label: "Equipment Catalog", icon: Package },
          { id: "venues_catalog", label: "Venue Catalog", icon: Building },
          { id: "pricing_matrix", label: "Fee & Penalty Matrix", icon: DollarSign },
        ].map((st) => {
          const IconC = st.icon;
          const active = subTab === st.id;
          return (
            <button
              key={st.id}
              onClick={() => setSubTab(st.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                active ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <IconC size={14} />
              <span>{st.label}</span>
            </button>
          );
        })}

        {primaryTab === "campus_configure" && [
          { id: "users", label: "User Management", icon: Users },
          { id: "locations", label: "Campus Locations", icon: MapPin },
          { id: "offices", label: "Campus Branch Offices", icon: Building2 },
          { id: "departments", label: "Department / Program", icon: BookOpen },
          { id: "operating_hours", label: "Operating Hours & Grace Periods", icon: Clock },
        ].map((st) => {
          const IconC = st.icon;
          const active = subTab === st.id;
          return (
            <button
              key={st.id}
              onClick={() => setSubTab(st.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                active ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <IconC size={14} />
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                active ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <IconC size={14} />
              <span>{st.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Views */}
      {subTab === "catalog" && <EquipmentCatalogTab showMsg={showMsg} />}
      {subTab === "venues_catalog" && <VenuesTab showMsg={showMsg} />}
      {subTab === "locations" && <CampusLocationsTab showMsg={showMsg} />}
      {subTab === "users" && <UserManagementTab showMsg={showMsg} />}
      {subTab === "offices" && <CampusOfficesTab showMsg={showMsg} />}
      {subTab === "departments" && <DepartmentsTab showMsg={showMsg} />}
      {subTab === "operating_hours" && <OperatingHoursTab showMsg={showMsg} />}
      {subTab === "pricing_matrix" && <FeeMatrixTab showMsg={showMsg} />}
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
