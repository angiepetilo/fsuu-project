import { useState } from "react";
import { toast } from "sonner";
import {
  Users, Building2, Package, BookOpen, Clock,
  DollarSign, Key, User, ShieldCheck, Building
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
  const [activeTab, setActiveTab] = useState("users");

  const showMsg = (msg) => {
    const errCheck = typeof msg === "string" && (msg.includes("❌") || msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error"));
    const cleanMsg = (msg || "").replace(/^✅\s*|^❌\s*/, "").trim();

    if (errCheck) {
      try { toast.error(cleanMsg); } catch {}
    } else {
      try { toast.success(cleanMsg); } catch {}
    }
  };

  // Verification PIN state
  const [pinConfig, setPinConfig] = useState({ pin: "", enabled: false });
  const [pinSavedFeedback, setPinSavedFeedback] = useState(null);
  const handleSavePinConfig = () => {
    showMsg("Verification PIN saved successfully!");
  };

  const SYSAD_TABS = [
    { id: "users", label: "User Management", icon: Users },
    { id: "equipment", label: "Equipment Catalog", icon: Package },
    { id: "venues", label: "Venue Catalog", icon: Building },
    { id: "fee_matrix", label: "Fee Matrix", icon: DollarSign },
    { id: "departments", label: "Departments", icon: BookOpen },
    { id: "campuses", label: "Campuses & Offices", icon: Building2 },
    { id: "operating_hours", label: "Operating Hours", icon: Clock },
    { id: "pin", label: "Verification PIN", icon: Key },
    { id: "profile", label: "Profile & Account", icon: User },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-slate-900" size={22} />
            Super Admin System Control &amp; Configurations
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Master global management for campuses, offices, manager user accounts, master equipment/venue catalogs, fee matrix, and security.
          </p>
        </div>
      </div>

      {/* Direct High-Visibility Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
        {SYSAD_TABS.map((tab) => {
          const IconComp = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${
                active
                  ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                  : "border-transparent text-slate-600 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              <IconComp size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content Render */}
      {activeTab === "users" && <UserManagementTab showMsg={showMsg} />}
      {activeTab === "equipment" && <EquipmentCategoriesTab showMsg={showMsg} />}
      {activeTab === "venues" && <VenuesTab showMsg={showMsg} />}
      {activeTab === "fee_matrix" && <FeeMatrixTab officeScope="All Offices" showMsg={showMsg} />}
      {activeTab === "departments" && <DepartmentsTab showMsg={showMsg} />}
      {activeTab === "campuses" && <CampusManagementTab showMsg={showMsg} />}
      {activeTab === "operating_hours" && <OperatingHoursTab showMsg={showMsg} />}
      {activeTab === "pin" && (
        <VerificationPinTab
          pinConfig={pinConfig}
          setPinConfig={setPinConfig}
          pinSavedFeedback={pinSavedFeedback}
          handleSavePinConfig={handleSavePinConfig}
        />
      )}
      {activeTab === "profile" && <ProfileConfigTab showMsg={showMsg} />}
    </div>
  );
}
