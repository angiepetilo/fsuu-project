import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Loader2, Mail, ShieldAlert, ShieldCheck } from "lucide-react";
import api from "@/lib/axios";

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

      if (editUser) {
        const payload = {
          name: userForm.name,
          email: emailValue,
          personal_email: emailValue,
          role: "staff",
          status: statusValue,
          is_active: isActiveValue,
          permissions: userForm.permissions,
        };
        await api.put(`/admin/users/${editUser.id}`, payload);
        if (showMsg) showMsg(`Staff account "${userForm.name || emailValue}" updated successfully.`);
      } else {
        const payload = {
          email: emailValue,
          personal_email: emailValue,
          role: "staff",
          status: statusValue,
          is_active: isActiveValue,
          permissions: userForm.permissions,
        };
        await api.post("/admin/users", payload);
        if (showMsg) showMsg(`Staff invitation and credentials sent to ${emailValue}.`);
      }
      setShowAddUserModal(false);
      setEditUser(null);
      fetchData();
    } catch (err) {
      if (showMsg) showMsg(err.response?.data?.message || "Failed to save staff account.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (confirm(`Archive staff account "${name || 'User'}"?`)) {
      try {
        await api.delete(`/admin/users/${id}`);
        if (showMsg) showMsg(`Staff account "${name || 'User'}" archived.`);
        fetchData();
      } catch {
        if (showMsg) showMsg("Failed to delete staff user.");
      }
    }
  };

  const handleResendInvite = async (u) => {
    setResendingId(u.id);
    try {
      const res = await api.post(`/admin/users/${u.id}/resend-invite`);
      if (showMsg) showMsg(res.data?.message || `Invitation resent to ${u.personal_email || u.email}.`);
    } catch (err) {
      if (showMsg) showMsg(err.response?.data?.message || "Failed to resend invitation.");
    } finally {
      setResendingId(null);
    }
  };

  // Filter Staff accounts only
  const staffUsers = users.filter((u) => {
    const isSuperAdmin = u.id === 1 || u.email === "admin" || u.email === "admin@fsuu.edu.ph" || u.email === "superadmin@fsuu.edu.ph" || u.role_id === 1 || u.role === "superadmin" || u.role === "super_admin" || u.role?.name === "superadmin" || u.role?.name === "super_admin" || u.role?.slug === "super_admin";
    const isAdmin = u.role === "admin" || u.role?.name === "admin" || u.email === "admin.avr@fsuu.edu.ph";
    return !isSuperAdmin && !isAdmin;
  });

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm">
            Staff Accounts Management
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Create and manage staff accounts and feature permissions. Activation links and credentials are sent to the user's email.
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
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer transition-all"
        >
          <Plus size={16} /> Create Staff Account
        </button>
      </div>

      {/* Staff Accounts Table (Permissions column removed as requested) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Staff Name", "Email", "Role", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-10">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                    <span className="text-xs font-semibold italic">Loading staff accounts...</span>
                  </div>
                </td>
              </tr>
            ) : staffUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <span>No staff accounts found. Click "Create Staff Account" to invite a staff member.</span>
                  </div>
                </td>
              </tr>
            ) : (
              staffUsers.map((u, index) => {
                const isPending = u.status === "pending_activation" || !u.name || u.name === "Pending Activation";
                const isDisabled = u.status === "disabled" || u.status === "inactive" || u.is_active === false || u.is_active === 0;

                return (
                  <tr key={u.id || index} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3.5">
                      {isPending ? (
                        <span className="text-slate-400 font-medium italic">Pending Activation</span>
                      ) : (
                        <span className={`font-extrabold ${isDisabled ? "text-slate-400 line-through" : "text-slate-900"}`}>
                          {u.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600 font-medium">{u.personal_email || u.email}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-slate-100 text-slate-800 border-slate-300">
                        STAFF
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {isDisabled ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-rose-50 text-rose-700 border-rose-200">
                          DISABLED
                        </span>
                      ) : isPending ? (
                        <span className="text-amber-600 font-bold text-xs uppercase tracking-wide">
                          PENDING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 flex items-center gap-2">
                      {isPending ? (
                        <button
                          onClick={() => handleResendInvite(u)}
                          disabled={resendingId === u.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold cursor-pointer transition-all shadow-2xs"
                          title="Resend Activation Invite"
                        >
                          {resendingId === u.id ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                          Resend
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              const perms = Array.isArray(u.permissions)
                                ? u.permissions
                                : typeof u.permissions === "string"
                                ? JSON.parse(u.permissions || "[]")
                                : ["venue_bookings", "equipment_borrowing", "history_log"];

                              const userDisabled = u.status === "disabled" || u.status === "inactive" || u.is_active === false || u.is_active === 0;

                              setEditUser(u);
                              setUserForm({
                                name: u.name === "Pending Activation" ? "" : (u.name || ""),
                                email: u.email || u.personal_email,
                                personal_email: u.personal_email || u.email,
                                role: "staff",
                                isDisabled: userDisabled,
                                permissions: perms,
                              });
                              setShowAddUserModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:border-blue-300 hover:text-blue-600 cursor-pointer transition-all"
                            title="Edit Staff Account"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer transition-all"
                            title="Archive Staff Account"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create / Edit Staff with Disable Account Button / Toggle */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {editUser ? "Edit Staff Account" : "Create New Staff Account"}
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              {editUser ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">Staff Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Maria Santos"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. maria.santos@gmail.com"
                      value={userForm.email || userForm.personal_email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value, personal_email: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. maria.santos@gmail.com"
                    value={userForm.email || userForm.personal_email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value, personal_email: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">An invitation and credentials link will be sent to this email address.</p>
                </div>
              )}

              {/* Staff Feature Access Permissions */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                <span className="text-xs font-extrabold text-slate-900 block pb-1 border-b border-slate-200">
                  Staff Feature Access Permissions
                </span>
                <div className="space-y-1.5 pt-1">
                  {ALL_PERMISSIONS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-white transition-all">
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

              {/* Disable Account Access Control */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                userForm.isDisabled
                  ? "bg-rose-50 border-rose-200"
                  : "bg-slate-50 border-slate-200"
              }`}>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className={`text-xs font-extrabold block ${
                      userForm.isDisabled ? "text-rose-900" : "text-slate-900"
                    }`}>
                      {userForm.isDisabled ? "Account Access Disabled" : "Disable Account Access"}
                    </span>
                    <span className="text-[10.5px] text-slate-500 font-medium block">
                      {userForm.isDisabled
                        ? "This staff member is currently blocked from logging in."
                        : "Prevent this staff user from logging in without permanently deleting the account."}
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
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
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
