import { useState, useEffect } from "react";
import { Plus, Edit2, RotateCw, Ban, Loader2 } from "lucide-react";
import api from "@/lib/axios";
import { notify } from "@/lib/notify";

export default function RolesSubTab() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get("/sysad/roles");
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openCreate = () => {
    setEditRole(null);
    setForm({ name: "", description: "" });
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditRole(r);
    setForm({ name: r.name, description: r.description || "" });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editRole) {
        await api.put(`/sysad/roles/${editRole.id}`, form);
        notify.success("Role Updated", "Role details saved.");
      } else {
        await api.post("/sysad/roles", form);
        notify.success("Role Created", `Role "${form.name}" has been created.`);
      }
      setShowForm(false);
      fetchRoles();
    } catch (err) {
      notify.error("Failed", err.response?.data?.message || "Could not save role.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Delete role "${r.name}"? This action cannot be undone.`)) return;
    setDeletingId(r.id);
    try {
      await api.delete(`/sysad/roles/${r.id}`);
      notify.success("Deleted", `Role "${r.name}" removed.`);
      fetchRoles();
    } catch (err) {
      notify.error("Failed", err.response?.data?.message || "Could not delete role.");
    } finally {
      setDeletingId(null);
    }
  };

  const ROLE_DISPLAY = {
    staff: { label: "Staff" },
    student_assistant: { label: "Student Assistant" },
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Roles</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage the roles assigned to user accounts.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
        >
          <Plus size={14} /> Add Role
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
          <h4 className="text-xs font-semibold text-slate-800">
            {editRole ? "Edit Role" : "New Role"}
          </h4>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Role Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. facilities_officer"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={editRole?.is_protected}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white transition-colors disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description
              </label>
              <input
                type="text"
                placeholder="Brief description of this role"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-400 bg-white transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60 shadow-xs"
              >
                {formLoading && <Loader2 size={12} className="animate-spin" />}
                Save Role
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Roles table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Users
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-xs text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <RotateCw size={13} className="animate-spin" /> Loading roles...
                  </div>
                </td>
              </tr>
            ) : roles.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-xs text-slate-400">
                  No roles found.
                </td>
              </tr>
            ) : (
              roles.map((r) => {
                const displayName = ROLE_DISPLAY[r.name]?.label || r.name;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{displayName}</span>
                        {r.is_protected && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wide">
                            System
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {r.description || (
                        <span className="italic text-slate-300">No description</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-700">{r.users_count}</span>
                      <span className="text-slate-400 ml-1">
                        user{r.users_count !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={12} />
                        </button>
                        {!r.is_protected && (
                          <button
                            type="button"
                            onClick={() => handleDelete(r)}
                            disabled={deletingId === r.id || r.users_count > 0}
                            className="p-1.5 rounded-lg border border-slate-200 text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                              r.users_count > 0
                                ? "Cannot delete — users are assigned"
                                : "Delete role"
                            }
                          >
                            {deletingId === r.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Ban size={12} />
                            )}
                          </button>
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
    </div>
  );
}
