import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Loader2, Mail, MoreVertical, ShieldCheck, UserCheck, Users, Shield } from "lucide-react";
import api from "@/lib/axios";
import notify from "@/lib/notify";

const ALL_PERMISSIONS = [
  { key: "manage_equipments", label: "Manage Equipment" },
  { key: "venue_bookings", label: "Venue Bookings" },
  { key: "equipment_borrowing", label: "Equipment Borrowing" },
  { key: "history_log", label: "History Log" },
  { key: "manage_venues", label: "Manage Venues" },
  { key: "reports", label: "Reports & Analytics" },
];

export default function UserManagementTab({ showMsg }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [openActionId, setOpenActionId] = useState(null);

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    personal_email: "",
    role: "staff",
    isDisabled: false,
    permissions: ["venue_bookings", "equipment_borrowing", "history_log"],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users");
      setUsers(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.action-menu-container')) {
        setOpenActionId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const togglePermission = (key) => {
    setUserForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((k) => k !== key)
        : [...prev.permissions, key],
    }));
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const emailValue = (userForm.email || userForm.personal_email || "").trim();
      const statusValue = userForm.isDisabled ? "disabled" : "active";
      const isActiveValue = !userForm.isDisabled;
      const targetRole = userForm.role || "staff";

      const payload = {
        name: userForm.name,
        email: emailValue,
        personal_email: emailValue,
        role: targetRole,
        status: statusValue,
        is_active: isActiveValue,
        permissions: targetRole === "admin" ? ALL_PERMISSIONS.map(p => p.key) : userForm.permissions,
      };

      if (editUser) {
        await api.put(`/admin/users/${editUser.id}`, payload);
        notify.success("Account Updated", `${targetRole === "admin" ? "Admin" : "Staff"} account "${userForm.name || emailValue}" updated successfully.`);
      } else {
        await api.post("/admin/users", payload);
        notify.success("Account Created", `${targetRole === "admin" ? "Admin" : "Staff"} invitation and credentials sent to ${emailValue}.`);
      }
      setShowAddUserModal(false);
      setEditUser(null);
      fetchData();
    } catch (err) {
      notify.error("Save Failed", err.response?.data?.message || "Failed to save user account.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (id, name, role) => {
    const roleLabel = role === "admin" ? "Admin" : "Staff";
    if (confirm(`Archive ${roleLabel} account "${name || 'User'}"?`)) {
      try {
        await api.delete(`/admin/users/${id}`);
        notify.error("Account Archived", `${roleLabel} account "${name || 'User'}" archived.`);
        fetchData();
      } catch {
        notify.error("Archive Failed", `Failed to delete ${roleLabel} user.`);
      }
    }
  };

  const handleResendInvite = async (u) => {
    setResendingId(u.id);
    try {
      const res = await api.post(`/admin/users/${u.id}/resend-invite`);
      notify.success("Invitation Sent", res.data?.message || `Invitation resent to ${u.personal_email || u.email}.`);
    } catch (err) {
      notify.error("Resend Failed", err.response?.data?.message || "Failed to resend invitation.");
    } finally {
      setResendingId(null);
    }
  };

  // Exclude only root superadmin (id 1 or superadmin role)
  const managedUsers = users.filter((u) => {
    const isSuperAdmin = u.id === 1 || u.email === "admin" || u.email === "admin@fsuu.edu.ph" || u.email === "superadmin@fsuu.edu.ph" || u.role_id === 1 || u.role === "superadmin" || u.role === "super_admin" || u.role?.name === "superadmin" || u.role?.name === "super_admin" || u.role?.slug === "super_admin";
    return !isSuperAdmin;
  });

  const filteredUsers = managedUsers.filter((u) => {
    const roleName = (u.role?.name || u.role || "").toLowerCase();
    const isAdmin = roleName.includes("admin");
    if (roleFilter === "admin") return isAdmin;
    if (roleFilter === "staff") return !isAdmin;
    return true;
  });

  const adminCount = managedUsers.filter(u => (u.role?.name || u.role || "").toLowerCase().includes("admin")).length;
  const staffCount = managedUsers.filter(u => !(u.role?.name || u.role || "").toLowerCase().includes("admin")).length;

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">
            User Accounts Management
          </h3>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Create and manage administrator and staff accounts with system feature permissions.
          </p>
        </div>
        <button
          onClick={() => {
            setEditUser(null);
            setUserForm({
              name: "",
              email: "",
              personal_email: "",
              role: "staff",
              isDisabled: false,
              permissions: ["venue_bookings", "equipment_borrowing", "history_log"],
            });
            setShowAddUserModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-all"
        >
          <Plus size={15} /> Create User Account
        </button>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setRoleFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            roleFilter === "all"
              ? "bg-slate-900 text-white shadow-2xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          All Users ({managedUsers.length})
        </button>
        <button
          type="button"
          onClick={() => setRoleFilter("admin")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            roleFilter === "admin"
              ? "bg-blue-600 text-white shadow-2xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          Admins ({adminCount})
        </button>
        <button
          type="button"
          onClick={() => setRoleFilter("staff")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            roleFilter === "staff"
              ? "bg-blue-600 text-white shadow-2xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          Staff ({staffCount})
        </button>
      </div>

      {/* User Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {["#", "Account Name", "Email", "Role", "Status", "Actions"].map((h, i) => (
                <th key={h} className={`px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${i === 0 ? 'rounded-tl-2xl' : i === 5 ? 'rounded-tr-2xl' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                    <span className="text-xs font-semibold italic">Loading user accounts...</span>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400">
                  <span>No {roleFilter === "all" ? "user" : roleFilter} accounts found. Click "Create User Account" to add one.</span>
                </td>
              </tr>
            ) : (
              filteredUsers.map((u, index) => {
                const isPending = u.status === "pending_activation" || !u.name || u.name === "Pending Activation";
                const isDisabled = u.status === "disabled" || u.status === "inactive" || u.is_active === false || u.is_active === 0;
                const roleName = (u.role?.name || u.role || "staff").toLowerCase();
                const isAdmin = roleName.includes("admin");
                const isNearBottom = index >= Math.max(1, filteredUsers.length - 2);
                const isOpen = openActionId === u.id;

                return (
                  <tr key={u.id || index} className={`hover:bg-slate-50/60 transition-colors ${isOpen ? 'relative z-30' : ''}`}>
                    <td className="px-4 py-3.5 font-bold text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3.5">
                      {isPending ? (
                        <span className="text-slate-400 font-normal italic">Pending Activation</span>
                      ) : (
                        <span className={`font-semibold ${isDisabled ? "text-slate-400 line-through" : "text-slate-900"}`}>
                          {u.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600">{u.personal_email || u.email}</td>
                    <td className="px-4 py-3.5">
                      {isAdmin ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
                          ADMIN
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 text-slate-700 border-slate-200">
                          STAFF
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {isDisabled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-rose-50 text-rose-700 border-rose-200">
                          DISABLED
                        </span>
                      ) : isPending ? (
                        <span className="text-amber-600 font-semibold text-xs uppercase tracking-wide">
                          PENDING
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 relative">
                      <div className="relative action-menu-container inline-block">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionId(openActionId === u.id ? null : u.id);
                          }}
                          className={`p-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                            isOpen
                              ? "bg-blue-600 border-blue-600 text-white shadow-md"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                          title="Actions"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {isOpen && (
                          <div className={`absolute right-0 ${isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} w-44 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-md`}>
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  handleResendInvite(u);
                                }}
                                disabled={resendingId === u.id}
                                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Mail size={13} className="text-blue-500" />
                                <span>{resendingId === u.id ? "Sending..." : "Resend Invite"}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionId(null);
                                const perms = Array.isArray(u.permissions)
                                  ? u.permissions
                                  : typeof u.permissions === "string"
                                  ? JSON.parse(u.permissions || "[]")
                                  : ALL_PERMISSIONS.map(p => p.key);

                                const userDisabled = u.status === "disabled" || u.status === "inactive" || u.is_active === false || u.is_active === 0;

                                setEditUser(u);
                                setUserForm({
                                  name: u.name === "Pending Activation" ? "" : (u.name || ""),
                                  email: u.email || u.personal_email,
                                  personal_email: u.personal_email || u.email,
                                  role: isAdmin ? "admin" : "staff",
                                  isDisabled: userDisabled,
                                  permissions: perms,
                                });
                                setShowAddUserModal(true);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Edit2 size={13} className="text-slate-500" />
                              <span>Edit Account</span>
                            </button>

                            <div className="border-t border-slate-100 my-1"></div>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionId(null);
                                handleDeleteUser(u.id, u.name, isAdmin ? "admin" : "staff");
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} className="text-rose-500" />
                              <span>Archive Account</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create / Edit User with Role Selection */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/20 z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {editUser ? `Edit ${userForm.role === "admin" ? "Admin" : "Staff"} Account` : "Create New User Account"}
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">Account Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUserForm({ ...userForm, role: "admin", permissions: ALL_PERMISSIONS.map(p => p.key) })}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                      userForm.role === "admin"
                        ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Shield size={14} />
                    <span>Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserForm({ ...userForm, role: "staff" })}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                      userForm.role === "staff"
                        ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Users size={14} />
                    <span>Staff</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-normal mt-1">
                  {userForm.role === "admin"
                    ? "Admins have full operations and management access."
                    : "Staff have custom feature permissions."}
                </p>
              </div>

              {editUser ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Maria Santos"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. maria.santos@gmail.com"
                      value={userForm.email || userForm.personal_email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value, personal_email: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono font-medium text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. maria.santos@gmail.com"
                    value={userForm.email || userForm.personal_email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value, personal_email: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono font-medium text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1 font-normal">An invitation and credentials link will be sent to this email address.</p>
                </div>
              )}

              {/* Feature Access Permissions (Visible for Staff) */}
              {userForm.role === "staff" && (
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block pb-1 border-b border-slate-200">
                    Staff Feature Access Permissions
                  </span>
                  <div className="space-y-1.5 pt-1">
                    {ALL_PERMISSIONS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-white transition-colors">
                        <input
                          type="checkbox"
                          checked={userForm.permissions.includes(key)}
                          onChange={() => togglePermission(key)}
                          className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Disable Account Access Control */}
              <div className={`p-3.5 rounded-xl border transition-colors ${
                userForm.isDisabled
                  ? "bg-rose-50 border-rose-200"
                  : "bg-slate-50 border-slate-200"
              }`}>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className={`text-xs font-semibold block ${
                      userForm.isDisabled ? "text-rose-900" : "text-slate-900"
                    }`}>
                      {userForm.isDisabled ? "Account Access Disabled" : "Disable Account Access"}
                    </span>
                    <span className="text-[10.5px] text-slate-500 font-normal block">
                      {userForm.isDisabled
                        ? "This user is currently blocked from logging in."
                        : "Prevent this user from logging in without deleting the account."}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={userForm.isDisabled}
                    onChange={(e) => setUserForm({ ...userForm, isDisabled: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-600 cursor-pointer ml-3 shrink-0"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {formLoading && <Loader2 size={13} className="animate-spin" />}
                  <span>{editUser ? "Save Changes" : "Send Invite"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
