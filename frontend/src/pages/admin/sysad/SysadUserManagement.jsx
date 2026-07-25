import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { useDataCache } from "@/hooks/useDataCache";
import { AppCard } from "@/components/ui/app-card";
import { SearchInput } from "@/components/ui/search-input";
import { TableSkeleton } from "@/components/ui/skeletons";
import {
  Users, UserPlus, Pencil, Trash2, X, Loader2, AlertCircle,
  RefreshCw, CheckCircle, ImagePlus, Shield, Building, Mail, Key
} from "lucide-react";

function UserModal({ user: editUser, offices, onClose, onSave }) {
  const isEdit = !!editUser?.id;
  const [form, setForm] = useState({
    name:           editUser?.name ?? "",
    email:          editUser?.email ?? "",
    personal_email: editUser?.personal_email ?? "",
    role:           editUser?.role ?? "staff",
    office_id:      editUser?.office_id ?? "",
    new_password:   "",
  });
  const [photo, setPhoto]       = useState(null);
  const [preview, setPreview]   = useState(editUser?.avatar ?? null);
  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setErrorMsg("Name and Username/Email are required.");
      return;
    }
    if (!isEdit && !form.personal_email.trim()) {
      setErrorMsg("Personal Email is required to send generated credentials.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      if (form.personal_email) fd.append("personal_email", form.personal_email);
      fd.append("role", form.role);
      if (form.office_id) fd.append("office_id", form.office_id);
      if (form.new_password) fd.append("new_password", form.new_password);
      if (photo) fd.append("image", photo);

      if (isEdit) {
        fd.append("_method", "PUT");
      }

      await onSave(fd, isEdit ? editUser.id : null);
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message ?? "Failed to save user account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-slate-100 rounded-t-3xl z-10">
          <div>
            <h3 className="font-black text-slate-900 text-lg">
              {isEdit ? "Edit Staff Account" : "Create New Account"}
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              {isEdit ? "Modify credentials or assign office" : "Generates access account for system staff"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-semibold flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Photo Preview & Selection */}
          <div className="flex flex-col items-center gap-2 py-1">
            <div className="relative">
              {preview ? (
                <img src={preview} alt="User Avatar" className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-200 shadow" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200">
                  <ImagePlus size={28} />
                </div>
              )}
              <label className="absolute -bottom-1.5 -right-1.5 bg-blue-600 text-white rounded-lg p-1.5 cursor-pointer shadow hover:bg-blue-700 transition-all">
                <ImagePlus size={13} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const f = e.target.files[0];
                    if (f) {
                      setPhoto(f);
                      setPreview(URL.createObjectURL(f));
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Profile Avatar (optional)</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Full Name <span className="text-red-500">*</span></label>
              <input
                required
                value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
            </div>

            {/* Username / Login Email */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Login Username/Email <span className="text-red-500">*</span></label>
              <input
                required
                value={form.email}
                onChange={e => set("email", e.target.value)}
                placeholder="e.g. avradmin or avr@fsuu.edu.ph"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
            </div>
          </div>

          {/* Personal Email */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">
              Personal Email {!isEdit && <span className="text-red-500">*</span>}
            </label>
            <input
              type="email"
              required={!isEdit}
              value={form.personal_email}
              onChange={e => set("personal_email", e.target.value)}
              placeholder="e.g. staff.personal@gmail.com (for password delivery)"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* System Role */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">System Role <span className="text-red-500">*</span></label>
              <select
                value={form.role}
                onChange={e => set("role", e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              >
                <option value="staff">Office Staff / Manager</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>

            {/* Assigned Office */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Assigned Office</label>
              <select
                value={form.office_id}
                onChange={e => set("office_id", e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              >
                <option value="">— No Office (System Level) —</option>
                {offices.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* New Password (optional if edit) */}
          {isEdit ? (
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                Reset Password <span className="text-slate-400 font-normal">(leave blank to keep current)</span>
              </label>
              <input
                type="password"
                value={form.new_password}
                onChange={e => set("new_password", e.target.value)}
                placeholder="Enter new password..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 space-y-1">
              <p className="font-bold flex items-center gap-1"><Key size={13} /> Auto-Generated Password</p>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                A secure random password will be auto-generated and emailed directly to the user's personal email address.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              <span>{isEdit ? "Save Changes" : "Create User Account"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SysadUserManagement() {
  const [search, setSearch]               = useState("");
  const [roleFilter, setRoleFilter]       = useState("");
  const [showModal, setShowModal]         = useState(false);
  const [editUser, setEditUser]           = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);

  const { data: usersData, loading: usersLoading, error, refresh: refreshUsers } = useDataCache('sysad_users_list', '/admin/users');
  const { data: officesData } = useDataCache('sysad_offices_list', '/admin/offices');

  const users   = Array.isArray(usersData) ? usersData : [];
  const offices = Array.isArray(officesData) ? officesData : [];

  // RAM Search & Filter
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.personal_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.office?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSaveUser = async (formData, id) => {
    if (id) {
      await api.post(`/admin/users/${id}`, formData);
    } else {
      await api.post("/admin/users", formData);
    }
    refreshUsers();
  };

  const handleDeleteUser = async (id, name) => {
    if (!confirm(`Are you sure you want to delete the account for "${name}"?`)) return;
    setDeleteLoading(id);
    try {
      await api.delete(`/admin/users/${id}`);
      refreshUsers();
    } catch (e) {
      alert(e.response?.data?.message ?? "Failed to delete user account.");
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
              System Administration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            User Account Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create, manage, and assign access roles for system staff and office administrators
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshUsers}
            disabled={usersLoading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60"
          >
            <RefreshCw size={14} className={usersLoading ? "animate-spin text-blue-600" : "text-blue-600"} />
            Refresh
          </button>
          <button
            onClick={() => { setEditUser(null); setShowModal(true); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-blue-600/20"
          >
            <UserPlus size={15} /> Create Account
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm font-semibold">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Control Bar: Search & Role Filter */}
      <AppCard className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, login username, personal email, or office..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-blue-600"
          >
            <option value="">All Roles</option>
            <option value="admin">System Administrator</option>
            <option value="staff">Office Staff / Manager</option>
          </select>
        </div>
      </AppCard>

      {/* Users List Table */}
      <AppCard className="p-0 overflow-hidden">
        {usersLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={7} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5 text-left">User</th>
                  <th className="px-5 py-3.5 text-left">Login Username</th>
                  <th className="px-5 py-3.5 text-left">Personal Email</th>
                  <th className="px-5 py-3.5 text-left">Assigned Office</th>
                  <th className="px-5 py-3.5 text-left">Role</th>
                  <th className="px-5 py-3.5 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                      No user accounts found. Click "+ Create Account" above to add one.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Avatar */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-xl object-cover shadow-sm border border-slate-100" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-sm">
                              {u.name?.charAt(0)?.toUpperCase() ?? "U"}
                            </div>
                          )}
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs">{u.name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">ID: #{u.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Login Username */}
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-blue-600 whitespace-nowrap">
                        {u.email}
                      </td>

                      {/* Personal Email */}
                      <td className="px-5 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                        {u.personal_email ?? "—"}
                      </td>

                      {/* Office */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {u.office ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">
                            <Building size={12} className="text-slate-400" />
                            {u.office.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60 text-[11px] font-bold">
                            <Shield size={11} className="text-blue-500" /> System Level
                          </span>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-extrabold capitalize border ${
                          u.role === "admin"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {u.role === "admin" ? "System Admin" : "Office Staff"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setEditUser(u); setShowModal(true); }}
                            title="Edit User"
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            disabled={deleteLoading === u.id}
                            title="Delete User"
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700 transition-all disabled:opacity-40"
                          >
                            {deleteLoading === u.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </AppCard>

      {/* Modal */}
      {showModal && (
        <UserModal
          user={editUser}
          offices={offices}
          onClose={() => setShowModal(false)}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
}
