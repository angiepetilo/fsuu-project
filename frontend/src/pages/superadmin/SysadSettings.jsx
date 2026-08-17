import { useState } from "react";
import { toast } from "sonner";
import {
  Users, Building2, Package, BookOpen, Clock,
  DollarSign, Key, User, ShieldCheck, Building, GraduationCap
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
import AcademicTermsTab from "./tabs/AcademicTermsTab";

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
    { id: "equipment", label: "Master Equipment Category", icon: Package },
    { id: "venues", label: "Venue Catalog", icon: Building },
    { id: "fee_matrix", label: "Fee Matrix", icon: DollarSign },
    { id: "departments", label: "Departments", icon: BookOpen },
    { id: "operating_hours", label: "Operating Hours", icon: Clock },
    { id: "academic_terms", label: "Academic Terms & Archiving", icon: GraduationCap },
    { id: "pin", label: "Verification PIN", icon: Key },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div className="space-y-6">
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
      {activeTab === "operating_hours" && <OperatingHoursTab showMsg={showMsg} />}
      {activeTab === "academic_terms" && <AcademicTermsTab showMsg={showMsg} />}
      {activeTab === "pin" && (
        <VerificationPinTab
          pinConfig={pinConfig}
          setPinConfig={setPinConfig}
          pinSavedFeedback={pinSavedFeedback}
          handleSavePinConfig={handleSavePinConfig}
          showMsg={showMsg}
        />
      )}
      {activeTab === "profile" && <ProfileConfigTab showMsg={showMsg} />}
    </div>
  );
}
