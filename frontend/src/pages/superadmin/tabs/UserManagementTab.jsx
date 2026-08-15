import { useState, useEffect } from "react";
import { Users, Plus, Edit2, Trash2, X, AlertTriangle, Loader2, MapPin, Building2 } from "lucide-react";
import api from "@/lib/axios";

export default function UserManagementTab({ showMsg }) {
  const [users, setUsers] = useState([]);
  const [offices, setOffices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    personal_email: "",
    role: "admin",
    location: "",
    office_id: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, oRes, lRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/offices").catch(() => ({ data: [] })),
        api.get("/admin/locations").catch(() => ({ data: [] })),
      ]);
      setUsers(Array.isArray(uRes.data) ? uRes.data : (uRes.data?.data || []));
      const offData = Array.isArray(oRes.data) ? oRes.data : [];
      const locData = Array.isArray(lRes.data) ? lRes.data : [];
      setOffices(offData);
      setLocations(locData);

      if (offData.length > 0 && !userForm.office_id) {
        setUserForm((prev) => ({
          ...prev,
          office_id: offData[0].id,
          location: locData[0]?.name || offData[0].location || "FSUU Main Campus",
        }));
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const emailValue = (userForm.email || userForm.personal_email || "").trim();
      if (editUser) {
        const payload = {
          name: userForm.name,
          email: emailValue,
          personal_email: emailValue,
          role: "admin",
          location: userForm.location || (locations[0]?.name || "FSUU Main Campus"),
          office_id: userForm.office_id ? parseInt(userForm.office_id, 10) : (offices[0]?.id || null),
        };
        await api.put(`/admin/users/${editUser.id}`, payload);
        showMsg(`Branch Admin "${userForm.name}" updated successfully.`);
      } else {
        const payload = {
          email: emailValue,
          personal_email: emailValue,
          office_id: userForm.office_id ? parseInt(userForm.office_id, 10) : (offices[0]?.id || null),
          role: "admin",
        };
        await api.post("/admin/users", payload);
        showMsg(`Invitation sent to ${emailValue}.`);
      }
      setShowAddUserModal(false);
      setEditUser(null);
      fetchData();
    } catch (err) {
      showMsg(err.response?.data?.message || "Failed to save admin account.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (confirm(`Archive admin account "${name}"? Soft-delete will apply.`)) {
      try {
        await api.delete(`/admin/users/${id}`);
        showMsg(`User "${name}" archived.`);
        fetchData();
      } catch {
        showMsg("Failed to delete user.");
      }
    }
  };

  // Filter ONLY Branch Admin accounts (Super Admin cannot manage staff accounts and super admin's own account is excluded)
  const adminUsers = users.filter((u) => {
    const isSuperAdmin = u.id === 1 || u.email === "admin" || u.email === "admin@fsuu.edu.ph" || u.email === "superadmin@fsuu.edu.ph" || u.role_id === 1 || u.role === "superadmin" || u.role === "super_admin" || u.role?.name === "superadmin" || u.role?.name === "super_admin" || u.role?.slug === "super_admin";
    const isStaff = u.role === "staff" || u.role?.name === "staff" || u.role?.slug === "staff";
    return !isSuperAdmin && !isStaff;
  });

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            Branch Office Admin Accounts
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            System Admin creates branch admin accounts for each campus office. Activation link is sent to the administrator's email.
          </p>
        </div>
        <button
          onClick={() => {
            setEditUser(null);
            setUserForm({
              name: "",
              email: "",
              personal_email: "",
              role: "admin",
              location: locations[0]?.name || "FSUU Main Campus",
              office_id: offices[0]?.id || "",
            });
            setShowAddUserModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer transition-all"
        >
          <Plus size={16} /> Create Admin Account
        </button>
      </div>

      {offices.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <span>No campus branch offices created yet. Please create a campus office first in the <strong>Campuses &amp; Branch Offices</strong> tab before assigning admin accounts.</span>
        </div>
      )}

      {/* Admin Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Admin Name", "Email", "Assigned Branch Office", "Role", "Actions"].map((h) => (
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
                    <span className="text-xs font-semibold italic">Loading branch admins...</span>
                  </div>
                </td>
              </tr>
            ) : adminUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <Users size={16} className="text-slate-400" />
                    <span>No branch admin accounts found. Click "Create Admin Account" to assign branch management access.</span>
                  </div>
                </td>
              </tr>
            ) : (
              adminUsers.map((u, index) => {
                const matchedOff = (typeof u.office === "object" && u.office) || offices.find((o) => o.id === u.office_id);
                const officeName = matchedOff
                  ? (matchedOff.location ? `${matchedOff.name} | ${matchedOff.location}` : matchedOff.name)
                  : (u.location || "FSUU Main Campus");

                return (
                  <tr key={u.id || index} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3.5">
                      {u.status === "pending_activation" || !u.name || u.name === "Pending Activation" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Pending Activation
                        </span>
                      ) : (
                        <span className="font-extrabold text-slate-900">{u.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600 font-medium">{u.email || u.personal_email}</td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-800">
                      <span className="inline-flex items-center gap-1">
                        <Building2 size={13} className="text-slate-400 shrink-0" />
                        {officeName}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-blue-50 text-blue-700 border-blue-200">
                        BRANCH ADMIN
                      </span>
                    </td>
                    <td className="px-4 py-3.5 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditUser(u);
                          setUserForm({
                            name: u.name === "Pending Activation" ? "" : u.name,
                            email: u.email || u.personal_email,
                            personal_email: u.personal_email || u.email,
                            role: "admin",
                            location: u.location || u.office?.location || locations[0]?.name || "FSUU Main Campus",
                            office_id: u.office_id || u.office?.id || offices[0]?.id || "",
                          });
                          setShowAddUserModal(true);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:border-blue-300 hover:text-blue-600 cursor-pointer transition-all"
                        title="Edit Admin Account"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer transition-all"
                        title="Archive Admin Account"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create / Edit Branch Admin */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                {editUser ? "Edit Branch Admin Account" : "Create New Branch Admin Account"}
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              {editUser ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">Admin Full Name</label>
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

              {offices.length > 0 ? (
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Assigned Office *</label>
                  <select
                    value={userForm.office_id}
                    onChange={(e) => setUserForm({ ...userForm, office_id: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  >
                    {offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.location ? `${o.name} | ${o.location}` : o.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Assigned Office</label>
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold rounded-xl">
                    Create campus office first
                  </div>
                </div>
              )}

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
                  disabled={formLoading || offices.length === 0}
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
