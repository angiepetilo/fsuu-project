import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import {
  Users, PlusCircle, Pencil, Trash2, X, Loader2,
  AlertCircle, CheckCircle, ImagePlus, User, Eye, EyeOff,
  ShieldCheck, UserCog, Building, Copy, Check, Layers, Calendar,
  Key, Save, Plus, PackageOpen, Sliders, KeyRound, Lock, DollarSign
} from "lucide-react";

import UserRolesTab from "./tabs/UserRolesTab";
import EquipmentCategoriesTab from "./tabs/EquipmentCategoriesTab";
import VenueAvailabilityTab from "./tabs/VenueAvailabilityTab";
import AdminProfileTab from "./tabs/AdminProfileTab";
import FeeMatrixTab from "./tabs/FeeMatrixTab";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-300 shadow-xl w-full max-w-lg relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-slate-200 rounded-t-2xl z-10">
          <h3 className="font-extrabold text-slate-900 text-base">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, label, required = false }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      {label && (
        <label className="text-xs font-bold text-slate-700 mb-1 block">
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900 transition-all pr-10 bg-white"
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

function UserForm({ initial, offices, onSubmit, loading, onClose, userOfficeId, isSuperAdmin }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [personalEmail, setPersonalEmail] = useState(initial?.personal_email ?? "");
  const [role, setRole] = useState(initial?.role?.name ?? initial?.role ?? "staff");
  const [officeId, setOfficeId] = useState(initial?.office_id ?? (userOfficeId || ""));
  const [newPassword, setNewPassword] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(initial?.avatar ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const [permissions, setPermissions] = useState(
    initial?.permissions ?? ["venue_bookings", "equipment_borrowing", "history_log"]
  );

  const togglePermission = (key) => {
    setPermissions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleImage = (e) => {
    const f = e.target.files[0];
    if (f) { setImageFile(f); setPreview(URL.createObjectURL(f)); setRemoveImage(false); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("name", name);
    fd.append("email", email);
    fd.append("personal_email", personalEmail);
    fd.append("role", role);
    fd.append("permissions", JSON.stringify(permissions));
    if (officeId) fd.append("office_id", officeId);
    if (imageFile) fd.append("image", imageFile);
    if (removeImage) fd.append("remove_image", "1");
    if (initial) fd.append("_method", "PUT");
    if (newPassword) fd.append("new_password", newPassword);
    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col items-center gap-3 mb-2">
        <div className="relative">
          {preview ? (
            <img src={preview} alt="Preview" className="w-20 h-20 rounded-2xl object-cover border border-slate-300 shadow-2xs" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-300">
              <User size={30} />
            </div>
          )}
          <label className="absolute -bottom-1 -right-1 bg-white border border-slate-300 text-slate-700 rounded-lg p-1.5 cursor-pointer shadow-2xs hover:bg-slate-50 transition-all">
            <ImagePlus size={13} />
            <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </label>
        </div>
        {preview && (
          <button
            type="button"
            onClick={() => { setPreview(null); setImageFile(null); setRemoveImage(true); }}
            className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
          >
            Remove photo
          </button>
        )}
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700 mb-1 block">Full Name <span className="text-rose-600">*</span></label>
        <input
          required value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Juan Dela Cruz"
          className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900 transition-all bg-white"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700 mb-1 block">Username <span className="text-rose-600">*</span></label>
        <input
          required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="e.g. sco.admin or sco@fsuu.edu.ph"
          className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900 transition-all bg-white"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700 mb-1 block">
          Personal Email {!initial && <span className="text-rose-600">*</span>}
        </label>
        <input
          required={!initial} type="email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)}
          placeholder="e.g. juan@gmail.com"
          className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900 transition-all bg-white"
        />
      </div>

      {role === "staff" && (
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 space-y-2.5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
            <Sliders size={14} className="text-slate-600" />
            <span className="text-xs font-bold text-slate-900">Staff Feature Access Permissions</span>
          </div>
          <p className="text-[11px] text-slate-500">
            By default, Staff can access <b>Venue Booking</b>, <b>Equipment Borrowing</b>, and <b>History Log</b>.
          </p>

          <div className="space-y-1.5 pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 transition-all">
              <input
                type="checkbox"
                checked={permissions.includes("manage_equipments")}
                onChange={() => togglePermission("manage_equipments")}
                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <span>Manage Equipment (Inventory Access)</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 transition-all">
              <input
                type="checkbox"
                checked={permissions.includes("manage_venues")}
                onChange={() => togglePermission("manage_venues")}
                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <span>Manage Venues (Facility Settings Access)</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 transition-all">
              <input
                type="checkbox"
                checked={permissions.includes("reports")}
                onChange={() => togglePermission("reports")}
                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <span>Reports & Analytics Access</span>
            </label>
          </div>
        </div>
      )}

      {initial && (
        <div className="bg-white rounded-xl p-3.5 border border-slate-200">
          <p className="text-xs font-bold text-slate-700 mb-2">Change Password <span className="text-slate-400 font-normal">(optional)</span></p>
          <PasswordInput
            value={newPassword} onChange={e => setNewPassword(e.target.value)}
            placeholder="New password (min. 6 characters)"
          />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 rounded-xl border border-slate-900 bg-white text-slate-900 hover:bg-slate-50 font-bold text-xs transition-all shadow-xs disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          {initial ? "Save Changes" : "Create User"}
        </button>
      </div>
    </form>
  );
}

export default function Settings() {
  const context = useOutletContext();
  const { user: authUser, updateAuthUser } = useAuth();
  const selectedOffice = context?.selectedOffice ?? "All Offices";

  const [activeTab, setActiveTab] = useState("roles");

  // User Management State
  const [users, setUsers] = useState(() => {
    try {
      const cached = localStorage.getItem("fsuu_cache_sysad_users");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [offices, setOffices] = useState(() => {
    try {
      const cached = localStorage.getItem("fsuu_cache_sysad_offices");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem("fsuu_cache_sysad_users");
    } catch {
      return true;
    }
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Current Auth Admin User State dynamically initialized from Auth Context
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_admin_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if ((authUser?.email && parsed.email === authUser.email) || (authUser?.id && parsed.id === authUser.id)) {
          return parsed;
        }
      }
    } catch {}
    return {
      id: authUser?.id || null,
      name: authUser?.name || "Branch Admin",
      email: authUser?.email || "",
      personal_email: authUser?.personal_email || authUser?.email || "",
      office: authUser?.office?.name || authUser?.office || "AVR office",
      office_id: authUser?.office_id || 1,
      role: authUser?.role?.name || authUser?.role || "admin",
      avatar: authUser?.avatar || null,
    };
  });

  useEffect(() => {
    if (authUser?.name) {
      setCurrentUser(prev => ({
        ...prev,
        id: authUser.id ?? prev.id,
        name: authUser.name ?? prev.name,
        email: authUser.email ?? prev.email,
        personal_email: authUser.personal_email ?? prev.personal_email,
        office: authUser.office?.name ?? (typeof authUser.office === 'string' ? authUser.office : prev.office),
        office_id: authUser.office_id ?? prev.office_id,
        role: authUser.role?.name ?? authUser.role ?? prev.role,
        avatar: authUser.avatar ?? prev.avatar,
      }));
    }
  }, [authUser]);

  const [profileAvatarPreview, setProfileAvatarPreview] = useState(() => currentUser?.avatar || null);

  // Profile Form State initialized from currentUser
  const [profileForm, setProfileForm] = useState({
    name: currentUser.name,
    email: currentUser.email,
    personal_email: currentUser.personal_email || currentUser.email,
    office: currentUser.office || "AVR office",
    current_password: "",
    new_password: "",
  });

  // Venue Availability State
  const [venues, setVenues] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_venue_availability");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  useEffect(() => {
    try {
      localStorage.setItem("fsuu_venue_availability", JSON.stringify(venues));
      window.dispatchEvent(new Event("venue_availability_updated"));
    } catch { }
  }, [venues]);

  // Keep profileForm in sync with currentUser
  useEffect(() => {
    setProfileForm(prev => ({
      ...prev,
      name: currentUser.name,
      email: currentUser.email,
      personal_email: currentUser.personal_email || prev.personal_email,
      office: currentUser.office || prev.office,
    }));
    if (currentUser.avatar) setProfileAvatarPreview(currentUser.avatar);
  }, [currentUser]);

  const showMsg = (msg, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(null); setSuccess(null); }, 5000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [uRes, oRes] = await Promise.all([
        api.get("/admin/users").catch(() => api.get("/users")),
        api.get("/admin/offices").catch(() => api.get("/offices")),
      ]);
      const uData = Array.isArray(uRes.data) ? uRes.data : uRes.data?.data ?? [];
      const oData = Array.isArray(oRes.data) ? oRes.data : oRes.data?.data ?? [];
      setUsers(uData);
      setOffices(oData);
      try {
        localStorage.setItem("fsuu_cache_sysad_users", JSON.stringify(uData));
        localStorage.setItem("fsuu_cache_sysad_offices", JSON.stringify(oData));
      } catch { }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const adminOfficeScope = selectedOffice;
  const userOfficeId = authUser?.office_id ?? authUser?.office?.id ?? null;
  const isSuperAdmin = authUser?.role === "super_admin" || authUser?.role?.name === "super_admin";

  const visibleUsers = users.filter(u => {
    if (isSuperAdmin || adminOfficeScope === "All Offices") return true;
    const uOfficeName = u.office?.name || "";
    if (adminOfficeScope.includes("Main") && uOfficeName.includes("Main")) return true;
    if (adminOfficeScope.includes("Morelos") && uOfficeName.includes("Morelos")) return true;
    return false;
  });

  const handleCreateUser = async (formData) => {
    setFormLoading(true);
    try {
      const res = await api.post("/admin/users", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showMsg("User created successfully!");
      setShowCreate(false);
      fetchUsers();
    } catch (err) {
      showMsg(err.response?.data?.message ?? "Failed to create user.", true);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditUserSubmit = async (formData) => {
    if (!editUser) return;
    setFormLoading(true);
    try {
      await api.post(`/admin/users/${editUser.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showMsg("User updated successfully!");
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      showMsg(err.response?.data?.message ?? "Failed to update user.", true);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUserSubmit = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/users/${deleteUser.id}`);
      showMsg("User deleted successfully!");
      setDeleteUser(null);
      fetchUsers();
    } catch (err) {
      showMsg(err.response?.data?.message ?? "Failed to delete user.", true);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddVenue = async (e) => {
    e.preventDefault();
    const payload = {
      name: venueForm.name,
      capacity: parseInt(venueForm.capacity, 10) || 100,
      status: (venueForm.status || "Available").toLowerCase(),
      avatar: venuePhotoPreview || null,
      location: venueForm.location || (adminOfficeScope.includes("Morelos") ? "FSUU Morelos Campus" : "FSUU Main Campus"),
      office_id: userOfficeId,
    };
    try {
      await api.post("/admin/venues", payload);
      showMsg(`Venue "${venueForm.name}" created and synced to database!`);
      fetchUsers();
    } catch {
      const newVen = { id: Date.now(), ...payload, photo: venuePhotoPreview };
      setVenues(prev => [newVen, ...prev]);
      showMsg(`Venue "${venueForm.name}" added.`);
    } finally {
      setShowAddVenueModal(false);
      setVenueForm({ name: "", capacity: 100, status: "Available", photo: null, location: "" });
      setVenuePhotoPreview(null);
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
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-xs text-slate-500 font-semibold mt-0.5">
          Manage system access roles, equipment categories, venue catalog, and profile configuration.
        </p>
      </div>

      {/* 5-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 w-fit">
        {[
          { id: "roles", label: "Role & Permission", icon: ShieldCheck },
          { id: "inventory", label: "Equipment Catalog", icon: PackageOpen },
          { id: "venues", label: "Venue Catalog", icon: Calendar },
          { id: "fee_matrix", label: "Fee Matrix", icon: DollarSign },
          { id: "profile", label: "Profile & Account", icon: User },
        ].map(tab => {
          const IconComp = tab.icon;
          const active = activeTab === tab.id || (tab.id === "inventory" && activeTab === "categories");
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
                active
                  ? "border-slate-900 bg-white text-slate-900 shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
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
        <Modal title="Add New User Account" onClose={() => setShowCreate(false)}>
          <UserForm
            offices={offices}
            onSubmit={handleCreateUser}
            loading={formLoading}
            onClose={() => setShowCreate(false)}
            userOfficeId={userOfficeId}
            isSuperAdmin={isSuperAdmin}
          />
        </Modal>
      )}

      {editUser && (
        <Modal title="Edit User Account & Access" onClose={() => setEditUser(null)}>
          <UserForm
            initial={editUser}
            offices={offices}
            onSubmit={handleEditUserSubmit}
            loading={formLoading}
            onClose={() => setEditUser(null)}
            userOfficeId={userOfficeId}
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
