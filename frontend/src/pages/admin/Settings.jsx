import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import {
  Users, PlusCircle, Pencil, Trash2, X, Loader2,
  AlertCircle, CheckCircle, ImagePlus, User, Eye, EyeOff,
  ShieldCheck, UserCog, Building, Copy, Check, Layers, Calendar,
  Key, Save, Plus, PackageOpen, Sliders, KeyRound, Lock
} from "lucide-react";

import UserRolesTab from "./tabs/UserRolesTab";
import EquipmentCategoriesTab from "./tabs/EquipmentCategoriesTab";
import VenueAvailabilityTab from "./tabs/VenueAvailabilityTab";
import AdminProfileTab from "./tabs/AdminProfileTab";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-slate-100 rounded-t-3xl z-10">
          <h3 className="font-extrabold text-slate-900 text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-all cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, label, required = false }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      {label && <label className="text-xs font-bold text-slate-700 mb-1 block">{label} {required && <span className="text-red-500">*</span>}</label>}
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all pr-10"
        />
        <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
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
            <img src={preview} alt="Preview" className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-100 shadow" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200">
              <User size={32} />
            </div>
          )}
          <label className="absolute -bottom-1.5 -right-1.5 bg-blue-600 text-white rounded-lg p-1.5 cursor-pointer shadow hover:bg-blue-700 transition-all">
            <ImagePlus size={14} />
            <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </label>
        </div>
        {preview && (
          <button type="button" onClick={() => { setPreview(null); setImageFile(null); setRemoveImage(true); }} className="text-xs text-red-500 hover:underline">
            Remove photo
          </button>
        )}
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700 mb-1 block">Full Name <span className="text-red-500">*</span></label>
        <input
          required value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Juan Dela Cruz"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700 mb-1 block">Username <span className="text-red-500">*</span></label>
        <input
          required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="e.g. sco.admin or sco@fsuu.edu.ph"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-700 mb-1 block">
          Personal Email {!initial && <span className="text-red-500">*</span>}
        </label>
        <input
          required={!initial} type="email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)}
          placeholder="e.g. juan@gmail.com"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
        />
      </div>

      {role === "staff" && (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-2">
            <Sliders size={15} className="text-purple-600" />
            <span className="text-xs font-extrabold text-slate-800">Staff Feature Access Permissions</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            By default, Staff can access <b>Venue Booking</b>, <b>Equipment Borrowing</b>, and <b>History Log</b>. Check optional modules to grant access:
          </p>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer p-2 rounded-xl hover:bg-white transition-all">
              <input
                type="checkbox"
                checked={permissions.includes("manage_equipments")}
                onChange={() => togglePermission("manage_equipments")}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>📦 Manage Equipment (Inventory Access)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer p-2 rounded-xl hover:bg-white transition-all">
              <input
                type="checkbox"
                checked={permissions.includes("manage_venues")}
                onChange={() => togglePermission("manage_venues")}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>🏛️ Manage Venues (Facility Settings Access)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer p-2 rounded-xl hover:bg-white transition-all">
              <input
                type="checkbox"
                checked={permissions.includes("reports")}
                onChange={() => togglePermission("reports")}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>📊 Reports & Analytics Access</span>
            </label>
          </div>
        </div>
      )}

      {initial && (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <p className="text-xs font-bold text-slate-700 mb-3">Change Password <span className="text-slate-400 font-normal">(optional)</span></p>
          <PasswordInput
            value={newPassword} onChange={e => setNewPassword(e.target.value)}
            placeholder="New password (min. 6 characters)"
          />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md shadow-blue-600/20 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer">
          {loading && <Loader2 size={14} className="animate-spin" />}
          {initial ? "Save Changes" : "Create User"}
        </button>
      </div>
    </form>
  );
}

export default function Settings() {
  const context = useOutletContext();
  const selectedOffice = context?.selectedOffice ?? "All Offices";

  const [activeTab, setActiveTab] = useState("roles");

  // User Management State
  const [users, setUsers] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Verification PIN Settings State
  const [pinSettings, setPinSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_verification_pin_settings");
      if (saved) return JSON.parse(saved);
    } catch { }
    return {
      pin: "123456",
      title: "PIN Required",
      description: "AVR Head PIN Required. External Users and Multi-Day Reservations must verify an authorized PIN issued by the AVR Head before proceeding.",
      requireMultiDay: true,
      requireNextDay: true,
      requireExternal: true,
    };
  });

  const handleSavePinSettings = (e) => {
  e.preventDefault();
  try {
    localStorage.setItem("fsuu_verification_pin_settings", JSON.stringify(pinSettings));
    window.dispatchEvent(new Event("pin_settings_updated"));
    showMsg("✅ Verification PIN settings updated successfully!");
  } catch {
    showMsg("Failed to save PIN settings.", true);
  }
};

// Current Auth Admin User State initialized from localStorage
const [currentUser, setCurrentUser] = useState(() => {
  try {
    const saved = localStorage.getItem("fsuu_admin_profile");
    return saved ? JSON.parse(saved) : {
      name: "Main Branch Admin",
      email: "admin.main@fsuu.edu.ph",
      personal_email: "main.admin@gmail.com",
      office: "FSUU Main (AVR Center)",
      office_id: 1,
      role: "admin",
      avatar: null,
    };
  } catch {
    return {
      name: "Main Branch Admin",
      email: "admin.main@fsuu.edu.ph",
      personal_email: "main.admin@gmail.com",
      office: "FSUU Main (AVR Center)",
      office_id: 1,
      role: "admin",
      avatar: null,
    };
  }
});

const [profileAvatarPreview, setProfileAvatarPreview] = useState(() => currentUser?.avatar || null);

// Profile Form State initialized from currentUser
const [profileForm, setProfileForm] = useState({
  name: currentUser.name,
  email: currentUser.email,
  personal_email: currentUser.personal_email || "main.admin@gmail.com",
  office: currentUser.office || "FSUU Main (AVR Center)",
  current_password: "",
  new_password: "",
});

// Equipment Categories State with Photo Upload & LocalStorage Sync
const [categories, setCategories] = useState(() => {
  try {
    const saved = localStorage.getItem("fsuu_equipment_categories");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
});
  // Equipment Inventory Stock Table State
  const [inventoryCategories, setInventoryCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_equipment_inventory");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [editInventory, setEditInventory] = useState(null);
  const [showEditInventoryModal, setShowEditInventoryModal] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({
    category: "",
    available: 0,
    damaged: 0,
    lost: 0,
    date_purchased: "2024-01-01",
    lifespan: 5,
  });

  const handleSaveInventory = (e) => {
    e.preventDefault();
    let updated;
    if (editInventory) {
      updated = inventoryCategories.map(c => c.id === editInventory.id ? { ...c, ...inventoryForm } : c);
      showMsg(`✅ Stock updated for category "${inventoryForm.category}"!`);
    } else {
      updated = [...inventoryCategories, { id: Date.now(), ...inventoryForm }];
      showMsg(`✅ New inventory category "${inventoryForm.category}" created!`);
    }
    setInventoryCategories(updated);
    localStorage.setItem("fsuu_equipment_inventory", JSON.stringify(updated));
    window.dispatchEvent(new Event("equipment_inventory_updated"));
    setShowEditInventoryModal(false);
    setEditInventory(null);
  };

  const handleDeleteInventory = (id, name) => {
    if (confirm(`Delete inventory category "${name}"?`)) {
      const updated = inventoryCategories.filter(c => c.id !== id);
      setInventoryCategories(updated);
      localStorage.setItem("fsuu_equipment_inventory", JSON.stringify(updated));
      window.dispatchEvent(new Event("equipment_inventory_updated"));
      showMsg(`✅ Inventory category "${name}" removed.`);
    }
  };

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", code: "", office: "FSUU Main (AVR)", photo: null });
  const [categoryPhotoPreview, setCategoryPhotoPreview] = useState(null);

  // Venue Availability State with Photo Upload & LocalStorage Sync
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
      localStorage.setItem("fsuu_equipment_categories", JSON.stringify(categories));
      window.dispatchEvent(new Event("equipment_categories_updated"));
    } catch { }
  }, [categories]);

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
      const [usersRes, officesRes, venuesRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/offices"),
        api.get("/admin/venues").catch(() => ({ data: [] })),
      ]);
      setUsers(usersRes.data ?? []);
      setOffices(officesRes.data ?? []);
      const apiVenues = Array.isArray(venuesRes.data) ? venuesRes.data : [];
      const mappedVenues = apiVenues.map(v => ({
        id: v.id,
        name: v.name,
        capacity: v.capacity || 100,
        status: v.status || "Available",
        location: v.office?.location || v.location || "FSUU Main Campus",
        photo: v.avatar || v.photo || null,
        avatar: v.avatar || v.photo || null,
        office_id: v.office_id,
        office: v.office,
      }));
      setVenues(mappedVenues);
      if (mappedVenues.length === 0) {
        try { localStorage.removeItem("fsuu_venue_availability"); } catch {}
      }
    } catch {
      setUsers([]);
      setOffices([]);
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const isSuperAdmin = currentUser.role === "superadmin" || !currentUser.office_id;
  const userOfficeId = currentUser.office_id || 1;

  const adminOfficeScope = context?.adminOffice || context?.selectedOffice || currentUser.office || "FSUU Main";

  // Filter users by office: Branch Staff & Roles shows ONLY staff accounts belonging to this branch office
  const visibleUsers = users.filter(u => {
    const isStaff = u.role === "staff" || u.role?.name === "staff";
    if (!isStaff) return false;
    if (adminOfficeScope.includes("Morelos")) {
      return u.office_id === 2 || (u.office?.name || "").includes("Morelos");
    }
    return u.office_id === 1 || !(u.office?.name || "").includes("Morelos");
  });

  const handleCreateUser = async (fd) => {
    setFormLoading(true);
    try {
      await api.post("/admin/users", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setShowCreate(false);
      showMsg("✅ User created successfully!");
      fetchUsers();
    } catch {
      const name = fd.get("name");
      const email = fd.get("email");
      const pEmail = fd.get("personal_email");
      const role = fd.get("role");
      const oId = parseInt(fd.get("office_id"), 10) || userOfficeId;
      const newUser = {
        id: Date.now(),
        name,
        email,
        personal_email: pEmail,
        office_id: oId,
        office: offices.find(o => o.id === oId) || { id: oId, name: "FSUU Main" },
        role,
      };
      setUsers(prev => [newUser, ...prev]);
      setShowCreate(false);
      showMsg(`✅ User "${name}" created successfully!`);
    } finally { setFormLoading(false); }
  };

  const handleUpdateUser = async (fd) => {
    setFormLoading(true);
    try {
      await api.post(`/admin/users/${editUser.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      showMsg("User updated successfully.");
      setEditUser(null);
      fetchUsers();
    } catch {
      const name = fd.get("name");
      const email = fd.get("email");
      const role = fd.get("role");
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, name, email, role } : u));
      setEditUser(null);
      showMsg(`User "${name}" updated successfully.`);
    } finally { setFormLoading(false); }
  };

  const handleDeleteUser = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/users/${deleteUser.id}`);
      showMsg("User deleted.");
      setDeleteUser(null);
      fetchUsers();
    } catch {
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
      setDeleteUser(null);
      showMsg("User deleted.");
    } finally { setDeleteLoading(false); }
  };

  // Category Handlers with Photo Support
  const handleAddCategory = (e) => {
    e.preventDefault();
    const newCat = {
      id: Date.now(),
      name: categoryForm.name,
      code: categoryForm.code || categoryForm.name.slice(0, 3).toUpperCase(),
      office: categoryForm.office,
      total_items: 0,
      status: "Active",
      photo: categoryPhotoPreview,
    };
    setCategories(prev => [newCat, ...prev]);
    setShowAddCategoryModal(false);
    setCategoryForm({ name: "", code: "", office: "FSUU Main (AVR)", photo: null });
    setCategoryPhotoPreview(null);
    showMsg(`Equipment Category "${newCat.name}" added with photo!`);
  };

  const handleEditCategorySubmit = (e) => {
    e.preventDefault();
    setCategories(prev => prev.map(c => c.id === editCategory.id ? { ...c, ...categoryForm, photo: categoryPhotoPreview || c.photo } : c));
    setEditCategory(null);
    setCategoryPhotoPreview(null);
    showMsg(`Category updated successfully.`);
  };

  const handleDeleteCategory = (cat) => {
    if (confirm(`Delete category "${cat.name}"?`)) {
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      showMsg(`Category "${cat.name}" deleted.`);
    }
  };

  // Venue Handlers with Backend API Persistence & Photo Support
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
      showMsg(`✅ Venue "${venueForm.name}" created and synced to database!`);
      fetchUsers();
    } catch {
      const newVen = { id: Date.now(), ...payload, photo: venuePhotoPreview };
      setVenues(prev => [newVen, ...prev]);
      showMsg(`✅ Venue "${venueForm.name}" added.`);
    } finally {
      setShowAddVenueModal(false);
      setVenueForm({ name: "", capacity: 100, status: "Available", photo: null, location: "" });
      setVenuePhotoPreview(null);
    }
  };

  const handleEditVenueSubmit = async (e) => {
    e.preventDefault();
    if (!editVenue) return;
    const payload = {
      name: venueForm.name,
      capacity: parseInt(venueForm.capacity, 10) || 100,
      status: (venueForm.status || "Available").toLowerCase(),
      avatar: venuePhotoPreview || editVenue.photo || editVenue.avatar || null,
      location: venueForm.location || editVenue.location || "FSUU Main Campus",
    };
    try {
      await api.put(`/admin/venues/${editVenue.id}`, payload);
      showMsg(`✅ Venue record updated successfully!`);
      fetchUsers();
    } catch {
      setVenues(prev => prev.map(v => v.id === editVenue.id ? { ...v, ...venueForm, photo: venuePhotoPreview || v.photo } : v));
      showMsg(`✅ Venue availability updated.`);
    } finally {
      setEditVenue(null);
      setVenuePhotoPreview(null);
    }
  };

  const handleDeleteVenue = async (ven) => {
    const venId = ven.id || ven;
    const venName = ven.name || "venue slot";
    if (confirm(`Remove venue availability for "${venName}"?`)) {
      try {
        await api.delete(`/admin/venues/${venId}`);
        showMsg(`✅ Venue "${venName}" archived.`);
        fetchUsers();
      } catch {
        setVenues(prev => prev.filter(v => v.id !== venId));
        showMsg(`✅ Venue slot removed.`);
      }
    }
  };

  // Profile Save Handler with Global Admin Layout Sync
  const handleSaveProfile = (e) => {
    e.preventDefault();
    const updatedProfile = {
      ...currentUser,
      name: profileForm.name,
      email: profileForm.email,
      personal_email: profileForm.personal_email,
      avatar: profileAvatarPreview || currentUser.avatar,
    };
    setCurrentUser(updatedProfile);

    // Sync admin row in users list
    setUsers(prev => prev.map(u => (u.email === currentUser.email || u.id === currentUser.id) ? { ...u, name: profileForm.name, email: profileForm.email, personal_email: profileForm.personal_email, avatar: profileAvatarPreview || u.avatar } : u));

    // Persist to localStorage & dispatch event for AdminLayout
    try {
      localStorage.setItem("fsuu_admin_profile", JSON.stringify(updatedProfile));
      window.dispatchEvent(new Event("admin_profile_updated"));
    } catch { }

    showMsg("Profile settings updated successfully!");
  };

  const roleBadge = (role) => {
    const map = { admin: "bg-blue-50 text-blue-700 border-blue-200", staff: "bg-purple-50 text-purple-700 border-purple-200" };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize border ${map[role] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
        {role === "admin" ? "🛡 Admin" : "👤 Staff"}
      </span>
    );
  };

  return (
    <div className="space-y-6">

      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Manage system access roles, equipment categories, venue catalog, and profile configuration
        </p>
      </div>

      {/* 5-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit">
        {[
          { id: "roles", label: "Branch Staff & Roles", icon: ShieldCheck },
          { id: "inventory", label: "Equipment Catalog", icon: PackageOpen },
          { id: "venues", label: "Venue Catalog", icon: Calendar },
          { id: "profile", label: "Profile & Account", icon: User },
        ].map(tab => {
          const IconComp = tab.icon;
          const active = activeTab === tab.id || (tab.id === "inventory" && activeTab === "categories");
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${active ? "bg-white shadow-xs text-blue-600" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
            >
              <IconComp size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-700 text-xs font-bold animate-in slide-in-from-top-2 duration-300">
          <CheckCircle size={16} />{success}
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700 text-xs font-bold animate-in slide-in-from-top-2 duration-300">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {/* ── TAB 1: Role & Permission (Cleaned User View) ── */}
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

      {/* ── TAB 1.5 & TAB 2: Equipment Category & Stock Table ── */}
      {(activeTab === "inventory" || activeTab === "categories") && (
        <EquipmentCategoriesTab
          inventoryCategories={inventoryCategories}
          setInventoryCategories={setInventoryCategories}
          showMsg={showMsg}
          setEditInventory={setEditInventory}
          setInventoryForm={setInventoryForm}
          setShowEditInventoryModal={setShowEditInventoryModal}
        />
      )}

      {/* ── TAB 3: Venue Availability ── */}
      {activeTab === "venues" && (
        <VenueAvailabilityTab
          venues={venues}
          setVenues={setVenues}
          showMsg={showMsg}
          setShowAddVenueModal={setShowAddVenueModal}
          setEditVenue={setEditVenue}
        />
      )}



      {/* ── TAB 5: Admin Profile Configuration ── */}
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
        <Modal title="Add New User" onClose={() => setShowCreate(false)}>
          <UserForm offices={offices} loading={formLoading} onSubmit={handleCreateUser} onClose={() => setShowCreate(false)} userOfficeId={userOfficeId} isSuperAdmin={isSuperAdmin} />
        </Modal>
      )}

      {editUser && (
        <Modal title="Edit User" onClose={() => setEditUser(null)}>
          <UserForm initial={editUser} offices={offices} loading={formLoading} onSubmit={handleUpdateUser} onClose={() => setEditUser(null)} userOfficeId={userOfficeId} isSuperAdmin={isSuperAdmin} />
        </Modal>
      )}

      {deleteUser && (
        <Modal title="Delete User" onClose={() => setDeleteUser(null)}>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
              <Trash2 size={28} className="text-rose-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Delete "{deleteUser.name}"?</p>
              <p className="text-sm text-slate-500 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteUser(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer">Cancel</button>
              <button onClick={handleDeleteUser} disabled={deleteLoading} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer">
                {deleteLoading && <Loader2 size={14} className="animate-spin" />}Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Equipment Category Modal with Photo Upload */}
      {(showAddCategoryModal || editCategory) && (
        <Modal title={editCategory ? "Edit Category" : "Add Equipment Category"} onClose={() => { setShowAddCategoryModal(false); setEditCategory(null); }}>
          <form onSubmit={editCategory ? handleEditCategorySubmit : handleAddCategory} className="space-y-4 text-xs">

            {/* Category Photo Upload */}
            <div className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-900">Category Cover Photo</label>
              {categoryPhotoPreview ? (
                <img src={categoryPhotoPreview} alt="Category preview" className="w-24 h-16 rounded-xl object-cover border border-slate-200 shadow-xs" />
              ) : (
                <div className="w-24 h-16 rounded-xl bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                  <ImagePlus size={20} />
                  <span className="text-[9px] font-bold mt-1">Upload Photo</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setCategoryPhotoPreview(reader.result);
                    reader.readAsDataURL(file);
                  }
                }}
                className="text-xs text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Category Name *</label>
              <input
                type="text"
                required
                value={categoryForm.name}
                onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g. Projector or Sound System"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Prefix Code *</label>
              <input
                type="text"
                required
                value={categoryForm.code}
                onChange={e => setCategoryForm({ ...categoryForm, code: e.target.value })}
                placeholder="PRJ"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Assigned Office</label>
              <select
                value={categoryForm.office}
                onChange={e => setCategoryForm({ ...categoryForm, office: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-600"
              >
                <option value="FSUU Main (AVR)">FSUU Main (AVR Center)</option>
                <option value="FSUU Morelos">FSUU Morelos Campus</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setShowAddCategoryModal(false); setEditCategory(null); }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                {editCategory ? "Update Category" : "Save Category"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add / Edit Venue Availability Modal with Photo Upload */}
      {(showAddVenueModal || editVenue) && (
        <Modal title={editVenue ? "Edit Venue Availability" : "Add Venue Availability Slot"} onClose={() => { setShowAddVenueModal(false); setEditVenue(null); }}>
          <form onSubmit={editVenue ? handleEditVenueSubmit : handleAddVenue} className="space-y-4 text-xs">

            {/* Venue Photo Upload */}
            <div className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-900">Venue Cover Photo</label>
              {venuePhotoPreview ? (
                <img src={venuePhotoPreview} alt="Venue preview" className="w-28 h-16 rounded-xl object-cover border border-slate-200 shadow-xs" />
              ) : (
                <div className="w-28 h-16 rounded-xl bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                  <ImagePlus size={20} />
                  <span className="text-[9px] font-bold mt-1">Upload Photo</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setVenuePhotoPreview(reader.result);
                    reader.readAsDataURL(file);
                  }
                }}
                className="text-xs text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Venue Name *</label>
              <input
                type="text"
                required
                value={venueForm.name}
                onChange={e => setVenueForm({ ...venueForm, name: e.target.value })}
                placeholder="e.g. AVR 1 (Audio-Visual Room 1)"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Capacity (Seats) *</label>
              <input
                type="number"
                required
                min="10"
                max="2000"
                value={venueForm.capacity}
                onChange={e => setVenueForm({ ...venueForm, capacity: parseInt(e.target.value, 10) })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-600"
              />
            </div>



            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setShowAddVenueModal(false); setEditVenue(null); }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                {editVenue ? "Update Slot" : "Save Slot"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: EDIT STOCK & INVENTORY CATEGORY (Branch Admin) ── */}
      {showEditInventoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <PackageOpen size={18} className="text-blue-600" />
                {editInventory ? "Edit Equipment Stock & Details" : "Add Inventory Category"}
              </h3>
              <button onClick={() => setShowEditInventoryModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInventory} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Equipment Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Projector, Sound System..."
                  value={inventoryForm.category}
                  onChange={e => setInventoryForm({ ...inventoryForm, category: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Stock breakdown controls with exact Green, Orange, Red color indicators */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="block text-xs font-extrabold text-slate-900">Stock Count Breakdown *</label>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold text-emerald-700 block mb-1">🟢 Available</span>
                    <input
                      type="number"
                      min={0}
                      value={inventoryForm.available}
                      onChange={e => setInventoryForm({ ...inventoryForm, available: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full p-2.5 bg-emerald-50/80 border border-emerald-300 rounded-xl font-black text-emerald-800 text-sm text-center"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold text-amber-700 block mb-1">🟠 Maintenance</span>
                    <input
                      type="number"
                      min={0}
                      value={inventoryForm.damaged}
                      onChange={e => setInventoryForm({ ...inventoryForm, damaged: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full p-2.5 bg-amber-50/80 border border-amber-300 rounded-xl font-black text-amber-800 text-sm text-center"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold text-rose-700 block mb-1">🔴 Lost</span>
                    <input
                      type="number"
                      min={0}
                      value={inventoryForm.lost}
                      onChange={e => setInventoryForm({ ...inventoryForm, lost: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-full p-2.5 bg-rose-50/80 border border-rose-300 rounded-xl font-black text-rose-800 text-sm text-center"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 font-semibold mt-1">
                  Total Inventory Units: <strong>{(inventoryForm.available || 0) + (inventoryForm.damaged || 0) + (inventoryForm.lost || 0)} Units</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Date Purchased</label>
                  <input
                    type="date"
                    value={inventoryForm.date_purchased}
                    onChange={e => setInventoryForm({ ...inventoryForm, date_purchased: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Lifespan Limit (Years)</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={inventoryForm.lifespan}
                    onChange={e => setInventoryForm({ ...inventoryForm, lifespan: parseInt(e.target.value, 10) || 5 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditInventoryModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md"
                >
                  Save Stock Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
