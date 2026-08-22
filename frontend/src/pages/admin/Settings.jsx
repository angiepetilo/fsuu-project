import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import {
  ShieldCheck, Package, Building, DollarSign, BookOpen, Clock,
  GraduationCap, Key, Sliders, User, Loader2
} from "lucide-react";

import UserRolesTab from "./tabs/UserRolesTab";
import EquipmentCategoriesTab from "./tabs/EquipmentCategoriesTab";
import VenuesTab from "../superadmin/tabs/VenuesTab";
import FeeMatrixTab from "./tabs/FeeMatrixTab";
import DepartmentsTab from "../superadmin/tabs/DepartmentsTab";
import OperatingHoursTab from "../superadmin/tabs/OperatingHoursTab";
import AcademicTermsTab from "../superadmin/tabs/AcademicTermsTab";
import VerificationPinTab from "../superadmin/tabs/VerificationPinTab";
import SystemSettingsTab from "../superadmin/tabs/SystemSettingsTab";
import CommunicationLogsTab from "../superadmin/tabs/CommunicationLogsTab";
import ProfileConfigTab from "../superadmin/tabs/ProfileConfigTab";
import Modal from "./settings/Modal";
import UserForm from "./settings/UserForm";

export default function Settings() {
  const context = useOutletContext();
  const selectedOffice = context?.selectedOffice ?? "All Offices";

  const [activeTab, setActiveTab] = useState("roles");

  // User Management / Roles & Permissions State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const showMsg = (msg) => {
    const errCheck = typeof msg === "string" && (msg.includes("❌") || msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error"));
    const cleanMsg = (msg || "").replace(/^✅\s*|^❌\s*/, "").trim();

    if (errCheck) {
      notify.error("Action Failed", cleanMsg);
    } else {
      notify.success("Success", cleanMsg);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get("/admin/users");
      const list = res.data?.data || res.data || [];
      setUsers(Array.isArray(list) ? list : []);
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (formData) => {
    setFormLoading(true);
    try {
      await api.post("/admin/users", formData);
      showMsg("Staff account created and activation email sent!");
      setShowCreate(false);
      fetchUsers();
    } catch (err) {
      showMsg("❌ Failed to create account: " + (err.response?.data?.message || err.message));
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateUser = async (formData) => {
    if (!editUser) return;
    setFormLoading(true);
    try {
      await api.post(`/admin/users/${editUser.id}`, formData);
      showMsg("Account updated successfully!");
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      showMsg("❌ Failed to update account: " + (err.response?.data?.message || err.message));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/users/${deleteUser.id}`);
      showMsg("Account archived successfully.");
      setDeleteUser(null);
      fetchUsers();
    } catch (err) {
      showMsg("❌ Failed to archive account: " + (err.response?.data?.message || err.message));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleResendInvite = async (user) => {
    try {
      await api.post(`/admin/users/${user.id}/resend-invite`);
      showMsg("Activation invitation resent to " + (user.personal_email || user.email));
    } catch (err) {
      showMsg("❌ Failed to resend invitation: " + (err.response?.data?.message || err.message));
    }
  };

  // Filter staff visible in this office
  const visibleUsers = users.filter((u) => {
    const roleName = (u.role?.name || u.role || "").toLowerCase();
    return roleName !== "superadmin";
  });

  // Verification PIN state
  const [pinConfig, setPinConfig] = useState({ pin: "", enabled: false });
  const [pinSavedFeedback, setPinSavedFeedback] = useState(null);
  const handleSavePinConfig = () => {
    showMsg("Verification PIN saved successfully!");
  };

  // Complete Admin tabs including Roles & Permissions
  const ADMIN_TABS = [
    { id: "roles", label: "Roles & Permissions", icon: ShieldCheck },
    { id: "equipment", label: "Equipment Categories", icon: Package },
    { id: "venues", label: "Venue Catalog", icon: Building },
    { id: "fee_matrix", label: "Fee Matrix", icon: DollarSign },
    { id: "departments", label: "Departments", icon: BookOpen },
    { id: "operating_hours", label: "Operating Hours", icon: Clock },
    { id: "academic_terms", label: "Academic Terms & Archiving", icon: GraduationCap },
    { id: "pin", label: "Verification PIN", icon: Key },
    { id: "communication_logs", label: "Communications Log", icon: Building },
    { id: "system_settings", label: "System Settings", icon: Sliders },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div className="space-y-6">
      {/* Direct Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
        {ADMIN_TABS.map((tab) => {
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
      {activeTab === "roles" && (
        <UserRolesTab
          loading={loadingUsers}
          visibleUsers={visibleUsers}
          setShowCreate={setShowCreate}
          setEditUser={setEditUser}
          setDeleteUser={setDeleteUser}
          onResendInvite={handleResendInvite}
        />
      )}
      {activeTab === "equipment" && <EquipmentCategoriesTab showMsg={showMsg} />}
      {activeTab === "venues" && <VenuesTab showMsg={showMsg} />}
      {activeTab === "fee_matrix" && <FeeMatrixTab officeScope={selectedOffice} showMsg={showMsg} />}
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
      {activeTab === "communication_logs" && <CommunicationLogsTab />}
      {activeTab === "system_settings" && <SystemSettingsTab showMsg={showMsg} />}
      {activeTab === "profile" && <ProfileConfigTab showMsg={showMsg} />}

      {/* Create User Modal */}
      {showCreate && (
        <Modal title="Create Staff Account" onClose={() => setShowCreate(false)}>
          <UserForm
            onSubmit={handleCreateUser}
            loading={formLoading}
            onClose={() => setShowCreate(false)}
            isSuperAdmin={false}
          />
        </Modal>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <Modal title="Edit Staff Permissions & Account" onClose={() => setEditUser(null)}>
          <UserForm
            initial={editUser}
            onSubmit={handleUpdateUser}
            loading={formLoading}
            onClose={() => setEditUser(null)}
            isSuperAdmin={false}
          />
        </Modal>
      )}

      {/* Delete User Confirmation */}
      {deleteUser && (
        <Modal title="Archive Staff Account" onClose={() => setDeleteUser(null)}>
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium leading-relaxed">
              Are you sure you want to archive <span className="font-bold text-slate-900">{deleteUser.name}</span> (<span className="text-slate-500">{deleteUser.email}</span>)?
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteUser(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
              >
                {deleteLoading && <Loader2 size={13} className="animate-spin" />}
                <span>Archive Account</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
