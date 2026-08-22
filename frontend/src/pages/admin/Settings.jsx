import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import {
  AlertCircle, CheckCircle, Loader2,
  ShieldCheck, Calendar, PackageOpen, DollarSign, User,
} from "lucide-react";

import UserRolesTab from "./tabs/UserRolesTab";
import EquipmentCategoriesTab from "./tabs/EquipmentCategoriesTab";
import VenueAvailabilityTab from "./tabs/VenueAvailabilityTab";
import AdminProfileTab from "./tabs/AdminProfileTab";
import FeeMatrixTab from "./tabs/FeeMatrixTab";
import Modal from "./settings/Modal";
import UserForm from "./settings/UserForm";

export default function Settings() {
  const context = useOutletContext();
  const { user: authUser, updateAuthUser } = useAuth();
  const selectedOffice = context?.selectedOffice ?? "All Offices";

  const [activeTab, setActiveTab] = useState("roles");

  // User Management State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Current Auth Admin User State dynamically initialized from Auth Context
  const [currentUser, setCurrentUser] = useState(() => {
    return {
      id: authUser?.id || 1,
      name: authUser?.name || "Administrator",
      email: authUser?.email || "admin@fsuu.edu.ph",
      personal_email: authUser?.personal_email || authUser?.email || "admin@gmail.com",
      avatar: authUser?.avatar || null,
      role: authUser?.role?.name || authUser?.role || "admin",
    };
  });

  const [profileAvatarFile, setProfileAvatarFile] = useState(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState(currentUser.avatar);

  const [profileForm, setProfileForm] = useState({
    name: currentUser.name,
    email: currentUser.email,
    personal_email: currentUser.personal_email || currentUser.email,
    current_password: "",
    new_password: "",
  });

  // Venue Availability State
  const [venues, setVenues] = useState([]);

  const [showAddVenueModal, setShowAddVenueModal] = useState(false);
  const [editVenue, setEditVenue] = useState(null);
  const [venueForm, setVenueForm] = useState({ name: "", capacity: 100, status: "Available", photo: null, location: "" });
  const [venuePhotoPreview, setVenuePhotoPreview] = useState(null);

  useEffect(() => {
    if (editVenue) {
      setVenueForm({
        name: editVenue.name || "",
        capacity: editVenue.capacity || 100,
        status: editVenue.status || "Available",
        location: editVenue.location || "",
      });
      setVenuePhotoPreview(editVenue.photo || editVenue.avatar || editVenue.image || null);
    }
  }, [editVenue]);

  // Keep profileForm in sync with currentUser
  useEffect(() => {
    setProfileForm(prev => ({
      ...prev,
      name: currentUser.name,
      email: currentUser.email,
      personal_email: currentUser.personal_email || prev.personal_email,
    }));
    if (currentUser.avatar) setProfileAvatarPreview(currentUser.avatar);
  }, [currentUser]);

  const showMsg = (msg, isErr = false) => {
    const errCheck = isErr || (typeof msg === "string" && (msg.includes("❌") || msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error")));
    const cleanMsg = (msg || "").replace(/^✅\s*|^❌\s*/, "").trim();

    if (errCheck) {
      notify.error("Action Failed", cleanMsg);
    } else {
      notify.success("Success", cleanMsg);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const uRes = await api.get("/admin/users").catch(() => api.get("/users"));
      const uData = Array.isArray(uRes.data) ? uRes.data : uRes.data?.data ?? [];
      setUsers(uData);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchVenues = async () => {
    try {
      const res = await api.get("/admin/venues").catch(() => api.get("/admin/venues-list"));
      const vData = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setVenues(vData);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchVenues();
  }, []);

  const isSuperAdmin = authUser?.role === "super_admin" || authUser?.role?.name === "super_admin" || authUser?.role === "superadmin" || authUser?.role?.name === "superadmin";

  const visibleUsers = users.filter(u => {
    if (isSuperAdmin) return true;

    if (authUser?.id && String(u.id) === String(authUser.id)) {
      return false;
    }

    const uRole = (u.role?.name || u.role || "").toString().toLowerCase();
    if (["super_admin", "superadmin", "sysad", "super-admin", "admin"].includes(uRole)) {
      return false;
    }

    return true;
  });

  const handleResendInvite = async (user) => {
    try {
      await api.post(`/admin/users/${user.id}/resend-invite`);
      showMsg(`Invitation email resent successfully to ${user.personal_email || user.email}.`);
      fetchUsers();
    } catch (err) {
      showMsg(err.response?.data?.message ?? "Failed to resend invite.", true);
    }
  };

  const handleCreateUser = async (formData) => {
    // Note: formData is multipart — we can't build an optimistic row from it directly
    // but we close the modal immediately and show an optimistic placeholder
    setFormLoading(true);
    setShowCreate(false);
    const tempId = `temp-${Date.now()}`;
    const prev = users;
    setUsers(u => [...u, { id: tempId, name: "Adding...", email: "", role: "staff", status: "pending", _optimistic: true }]);
    try {
      const res = await api.post("/admin/users", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const saved = res.data?.user || res.data;
      setUsers(u => u.map(x => x.id === tempId ? { ...saved, _optimistic: false } : x));
      showMsg("Invitation sent successfully!");
    } catch (err) {
      setUsers(prev);
      setShowCreate(true);
      showMsg(err.response?.data?.message ?? "Failed to send invitation.", true);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditUserSubmit = async (formData) => {
    if (!editUser) return;
    setFormLoading(true);
    // ── OPTIMISTIC EDIT (partial — multipart, can't read all fields back easily)
    const prev = users;
    setEditUser(null);
    try {
      await api.post(`/admin/users/${editUser.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      showMsg("User updated successfully!");
      fetchUsers(); // refresh for real data after multipart
    } catch (err) {
      setUsers(prev);
      setEditUser(editUser);
      showMsg(err.response?.data?.message ?? "Failed to update user.", true);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUserSubmit = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    // ── OPTIMISTIC DELETE ────────────────────────────────────────────────
    const prev = users;
    const target = deleteUser;
    setUsers(u => u.filter(x => x.id !== target.id));
    setDeleteUser(null);
    try {
      await api.delete(`/admin/users/${target.id}`);
      showMsg("User deleted successfully!");
    } catch (err) {
      setUsers(prev);
      setDeleteUser(target);
      showMsg(err.response?.data?.message ?? "Failed to delete user.", true);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleVenuePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVenuePhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddVenue = async (e) => {
    e.preventDefault();
    const payload = {
      name: venueForm.name,
      capacity: parseInt(venueForm.capacity, 10) || 100,
      status: (venueForm.status || "Available").toLowerCase(),
      avatar: venuePhotoPreview || null,
      location: venueForm.location || "Main Campus",
    };
    // ── OPTIMISTIC ADD ──────────────────────────────────────────────────
    const tempId = `temp-${Date.now()}`;
    const prev = venues;
    setVenues(v => [...v, { ...payload, id: tempId, photo: venuePhotoPreview, _optimistic: true }]);
    setShowAddVenueModal(false);
    setVenueForm({ name: "", capacity: 100, status: "Available", photo: null, location: "" });
    setVenuePhotoPreview(null);
    try {
      const res = await api.post("/admin/venues", payload);
      const saved = res.data;
      setVenues(v => v.map(x => x.id === tempId ? { ...saved, _optimistic: false } : x));
      showMsg(`Venue "${payload.name}" created!`);
    } catch {
      setVenues(prev);
      setShowAddVenueModal(true);
      showMsg(`Failed to create venue — changes reverted.`, true);
    }
  };

  const handleEditVenueSubmit = async (e) => {
    e.preventDefault();
    if (!editVenue) return;
    const payload = {
      name: venueForm.name,
      capacity: parseInt(venueForm.capacity, 10) || 100,
      status: (venueForm.status || "Available").toLowerCase(),
      avatar: venuePhotoPreview || null,
      location: venueForm.location || "Main Campus",
    };
    // ── OPTIMISTIC EDIT ──────────────────────────────────────────────────
    const prev = venues;
    setVenues(v => v.map(x => x.id === editVenue.id ? { ...x, ...payload, photo: venuePhotoPreview, _optimistic: true } : x));
    setEditVenue(null);
    setVenueForm({ name: "", capacity: 100, status: "Available", photo: null, location: "" });
    setVenuePhotoPreview(null);
    try {
      await api.put(`/admin/venues/${editVenue.id}`, payload);
      setVenues(v => v.map(x => x.id === editVenue.id ? { ...x, _optimistic: false } : x));
      showMsg(`Venue "${payload.name}" updated!`);
    } catch {
      setVenues(prev);
      setEditVenue(editVenue);
      showMsg(`Failed to update venue — changes reverted.`, true);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const payload = {
      name: profileForm.name,
      email: profileForm.email,
      personal_email: profileForm.personal_email,
      avatar: profileAvatarPreview || currentUser.avatar,
    };

    const updatedProfile = {
      ...currentUser,
      ...payload,
    };
    setCurrentUser(updatedProfile);

    try {
      const res = await api.post("/user/profile", payload);
      if (res.data?.user && updateAuthUser) {
        updateAuthUser(res.data.user);
      }
    } catch {}

    setUsers(prev => prev.map(u => (u.email === currentUser.email || u.id === currentUser.id) ? { ...u, name: profileForm.name, email: profileForm.email, personal_email: profileForm.personal_email, avatar: profileAvatarPreview || u.avatar } : u));

    try {
      localStorage.setItem("fsuu_admin_profile", JSON.stringify(updatedProfile));
      window.dispatchEvent(new Event("admin_profile_updated"));
    } catch { }

    showMsg("Profile settings & avatar photo saved permanently!");
  };

  const roleBadge = (role) => {
    const roleName = typeof role === 'object' ? (role?.name || "staff") : String(role || "staff");
    return (
      <span className="text-[11px] font-mono font-bold text-slate-800 uppercase">
        ● {roleName}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Office Manager Settings</h1>
        <p className="text-xs text-slate-500 font-semibold mt-0.5">
          Manage staff accounts for your office, local venue settings, equipment catalog categories, and profile configuration.
        </p>
      </div>

      {/* Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 w-fit">
        {[
          { id: "roles", label: "Role & Permission", icon: ShieldCheck },
          { id: "inventory", label: "Equipment Catalog", icon: PackageOpen },
          { id: "venues", label: "Venue Catalog", icon: Calendar },
          { id: "confirmation", label: "Confirmation", icon: CheckCircle },
          { id: "profile", label: "Profile", icon: User },
        ].map(tab => {
          const IconComp = tab.icon;
          const active = activeTab === tab.id || (tab.id === "inventory" && activeTab === "categories");
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer border ${
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

      {/* Toast Notification */}
      {success && (
        <div className="py-2.5 px-4 border-t border-b border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2 bg-white">
          <CheckCircle size={15} />
          {success}
        </div>
      )}
      {error && (
        <div className="py-2.5 px-4 border-t border-b border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 bg-white">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Tab Contents */}
      {activeTab === "roles" && (
        <UserRolesTab
          loading={loading}
          visibleUsers={visibleUsers}
          roleBadge={roleBadge}
          setShowCreate={setShowCreate}
          setEditUser={setEditUser}
          setDeleteUser={setDeleteUser}
          onResendInvite={handleResendInvite}
        />
      )}

      {(activeTab === "inventory" || activeTab === "categories") && (
        <EquipmentCategoriesTab showMsg={showMsg} />
      )}

      {activeTab === "venues" && (
        <VenueAvailabilityTab
          venues={venues}
          setVenues={setVenues}
          showMsg={showMsg}
          setShowAddVenueModal={setShowAddVenueModal}
          setEditVenue={setEditVenue}
        />
      )}

      {activeTab === "fee_matrix" && (
        <FeeMatrixTab officeScope={adminOfficeScope} showMsg={showMsg} />
      )}

      {activeTab === "confirmation" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-10 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
            <CheckCircle size={24} />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900">Confirmation</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Confirmation settings and template configurations will appear here.
          </p>
        </div>
      )}

      {activeTab === "profile" && (
        <AdminProfileTab
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          profileAvatarPreview={profileAvatarPreview}
          setProfileAvatarPreview={setProfileAvatarPreview}
          handleSaveProfile={handleSaveProfile}
        />
      )}

      {/* Modals */}
      {showCreate && (
        <Modal title="Add New Staff Account" onClose={() => setShowCreate(false)}>
          <UserForm
            onSubmit={handleCreateUser}
            loading={formLoading}
            onClose={() => setShowCreate(false)}
            isSuperAdmin={isSuperAdmin}
          />
        </Modal>
      )}

      {editUser && (
        <Modal title="Edit User Account & Access" onClose={() => setEditUser(null)}>
          <UserForm
            initial={editUser}
            onSubmit={handleEditUserSubmit}
            loading={formLoading}
            onClose={() => setEditUser(null)}
            isSuperAdmin={isSuperAdmin}
          />
        </Modal>
      )}

      {deleteUser && (
        <Modal title="Archive User Account" onClose={() => setDeleteUser(null)}>
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Are you sure you want to delete user account <b className="text-slate-900">{deleteUser.name}</b> ({deleteUser.email})?
            </p>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteUser(null)}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUserSubmit}
                disabled={deleteLoading}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                {deleteLoading && <Loader2 size={13} className="animate-spin" />}
                Archive User
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
