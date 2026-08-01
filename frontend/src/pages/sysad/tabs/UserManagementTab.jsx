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
      const payload = {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role || "admin",
        location: userForm.location || (locations[0]?.name || "FSUU Main Campus"),
        office_id: userForm.office_id ? parseInt(userForm.office_id, 10) : (offices[0]?.id || null),
      };

      if (editUser) {
        await api.put(`/admin/users/${editUser.id}`, payload);
        showMsg(`✅ User account "${userForm.name}" updated!`);
      } else {
        const res = await api.post("/admin/users", payload);
        showMsg(`✅ Account created for "${userForm.name}"! Temporary credentials sent to ${userForm.email}.`);
      }
      setShowAddUserModal(false);
      setEditUser(null);
      fetchData();
    } catch (err) {
      showMsg(err.response?.data?.message || "❌ Failed to save user account.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (confirm(`Archive user account "${name}"? Soft-delete will apply.`)) {
      try {
        await api.delete(`/admin/users/${id}`);
        showMsg(`✅ User "${name}" archived.`);
        fetchData();
      } catch {
        showMsg("❌ Failed to delete user.");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            Branch Office Admin Accounts
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            System Admin can create branch admin accounts for each campus office. Temporary credentials will be sent to the institutional email.
          </p>
        </div>
        <button
          onClick={() => {
            setEditUser(null);
            setUserForm({
              name: "",
              email: "",
              role: "admin",
              location: locations[0]?.name || "FSUU Main Campus",
              office_id: offices[0]?.id || "",
            });
            setShowAddUserModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer"
        >
          <Plus size={16} /> Create Admin Account
        </button>
      </div>

      {offices.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <span>No campus branch offices created yet. Please create a campus office first in the <strong>Campus Branch Offices</strong> tab before assigning admin accounts.</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Admin Name", "Institutional Email", "Campus Location", "Assigned Branch Office", "Role", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400">
                  <Loader2 className="animate-spin inline mr-2" size={18} /> Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400">
                  👥 No admin accounts found. Click "Create Admin Account" to assign branch access.
                </td>
              </tr>
            ) : (
              users.map((u, index) => (
                <tr key={u.id || index} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3.5 font-extrabold text-slate-900">{u.name}</td>
                  <td className="px-4 py-3.5 font-mono text-blue-600 font-bold">{u.email}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                      <MapPin size={12} className="text-blue-600 shrink-0" />
                      {u.location || u.office?.location || "FSUU Main Campus"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-extrabold text-slate-800">
                    {typeof u.office === "object" ? (u.office?.name || "Unassigned") : (u.office || "Unassigned")}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        u.role === "superadmin" || u.role?.slug === "super_admin"
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-blue-100 text-blue-800 border-blue-300"
                      }`}
                    >
                      {u.role === "superadmin" || u.role?.slug === "super_admin" ? "👑 Super Admin" : "BRANCH ADMIN"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditUser(u);
                        setUserForm({
                          name: u.name,
                          email: u.email,
                          role: u.role || "admin",
                          location: u.location || u.office?.location || locations[0]?.name || "FSUU Main Campus",
                          office_id: u.office_id || u.office?.id || offices[0]?.id || "",
                        });
                        setShowAddUserModal(true);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                      title="Edit User"
                    >
                      <Edit2 size={14} />
                    </button>
                    {u.role !== "superadmin" && u.role?.slug !== "super_admin" && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                {editUser ? "Edit Admin Account" : "Create New Branch Admin Account"}
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Admin Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Institutional Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. msantos@fsuu.edu.ph"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">Temporary password & credentials will be sent to this email.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Campus Location *</label>
                <select
                  value={userForm.location}
                  onChange={(e) => setUserForm({ ...userForm, location: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  {locations.length > 0 ? (
                    locations.map((loc) => (
                      <option key={loc.id} value={loc.name}>{loc.name}</option>
                    ))
                  ) : (
                    <option value="FSUU Main Campus">FSUU Main Campus</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Role Level</label>
                  <input
                    type="text"
                    disabled
                    value="Branch Admin"
                    className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-500 text-xs"
                  />
                </div>

                {offices.length > 0 ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">Assigned Office *</label>
                    <select
                      value={userForm.office_id}
                      onChange={(e) => setUserForm({ ...userForm, office_id: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                    >
                      {offices.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
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
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading || offices.length === 0}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>Save & Send Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
