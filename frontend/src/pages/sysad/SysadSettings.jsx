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
  const [activeTab, setActiveTab] = useState("catalog");
  const [feedback, setFeedback] = useState(null);

  const showMsg = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const [pinConfig, setPinConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_sysad_pin_config");
      return saved ? JSON.parse(saved) : { masterPin: "", requirePinForStudent: false, enableExternalVenue: true, enableExternalEquipment: true };
    } catch {
      return { masterPin: "", requirePinForStudent: false, enableExternalVenue: true, enableExternalEquipment: true };
    }
  });

  const [pinSavedFeedback, setPinSavedFeedback] = useState(null);
  const handleSavePinConfig = (e) => {
    e.preventDefault();
    localStorage.setItem("fsuu_sysad_pin_config", JSON.stringify(pinConfig));
    setPinSavedFeedback("✅ Master PIN & Security Policies updated successfully!");
    setTimeout(() => setPinSavedFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-amber-500" size={24} />
            System Admin Global Configurations
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage equipment & venue catalogs, campus locations, user accounts, campus offices, department records, operating rules, fee matrices, and security PIN policies.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="bg-emerald-500 text-white text-xs font-bold px-5 py-3 rounded-2xl flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 size={16} />
          {feedback}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "catalog", label: "Equipment Catalog", icon: Package },
          { id: "venues_catalog", label: "Venue Catalog", icon: Building },
          { id: "locations", label: "Campus Locations", icon: MapPin },
          { id: "offices", label: "Campus Branch Offices", icon: Building2 },
          { id: "departments", label: "Department / Program", icon: BookOpen },
          { id: "users", label: "User Management", icon: Users },
          { id: "operating_hours", label: "Operating Hours & Grace Periods", icon: Clock },
          { id: "pricing_matrix", label: "Fee & Penalty Matrix", icon: DollarSign },
          { id: "verification_pin", label: "Verification PIN", icon: Key },
          { id: "profile", label: "Profile Configuration", icon: User },
        ].map((tab) => {
          const IconComp = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                active ? "bg-slate-900 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <IconComp size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      {activeTab === "catalog" && (
        <EquipmentCatalogTab showMsg={showMsg} />
      )}

      {activeTab === "venues_catalog" && (
        <VenuesTab showMsg={showMsg} />
      )}

      {activeTab === "locations" && (
        <CampusLocationsTab showMsg={showMsg} />
      )}

      {activeTab === "users" && (
        <UserManagementTab showMsg={showMsg} />
      )}

      {activeTab === "offices" && (
        <CampusOfficesTab showMsg={showMsg} />
      )}

      {activeTab === "departments" && (
        <DepartmentsTab showMsg={showMsg} />
      )}

      {activeTab === "operating_hours" && (
        <OperatingHoursTab showMsg={showMsg} />
      )}

      {activeTab === "pricing_matrix" && (
        <FeeMatrixTab showMsg={showMsg} />
      )}

      {activeTab === "verification_pin" && (
        <VerificationPinTab
          pinConfig={pinConfig}
          setPinConfig={setPinConfig}
          pinSavedFeedback={pinSavedFeedback}
          handleSavePinConfig={handleSavePinConfig}
        />
      )}

      {activeTab === "profile" && (
        <ProfileConfigTab showMsg={showMsg} />
      )}
    </div>
  );
}
