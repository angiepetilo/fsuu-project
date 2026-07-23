import { useState, useEffect } from "react";
import api from "@/lib/axios";
import {
  Users, PlusCircle, Pencil, Trash2, X, Loader2,
  AlertCircle, CheckCircle, ImagePlus, User, Eye, EyeOff,
  ShieldCheck, UserCog, Building, Copy, Check
} from "lucide-react";

function Avatar({ user }) {
  if (user.avatar) return (
    <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow" />
  );
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold border-2 border-white shadow">
      {user.name?.charAt(0)?.toUpperCase() ?? "U"}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-slate-100 rounded-t-3xl z-10">
          <h3 className="font-extrabold text-slate-900 text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-all">
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

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" onClick={handleCopy} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all">
      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
    </button>
  );
}

function UserForm({ initial, offices, onSubmit, loading, onClose }) {
  const [name, setName]               = useState(initial?.name ?? "");
  const [email, setEmail]             = useState(initial?.email ?? "");
  const [personalEmail, setPersonalEmail] = useState(initial?.personal_email ?? "");
  const [role, setRole]               = useState(initial?.role ?? "staff");
  const [officeId, setOfficeId]       = useState(initial?.office_id ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [imageFile, setImageFile]     = useState(null);
  const [preview, setPreview]         = useState(initial?.avatar ?? null);
  const [removeImage, setRemoveImage] = useState(false);

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
    if (officeId) fd.append("office_id", officeId);
    if (imageFile) fd.append("image", imageFile);
    if (removeImage) fd.append("remove_image", "1");
    if (initial) fd.append("_method", "PUT");
    if (newPassword) fd.append("new_password", newPassword);
    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Avatar */}
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

      {/* Full Name */}
      <div>
        <label className="text-xs font-bold text-slate-700 mb-1 block">Full Name <span className="text-red-500">*</span></label>
        <input
          required value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Juan Dela Cruz"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
        />
      </div>

      {/* System Login Username */}
      <div>
        <label className="text-xs font-bold text-slate-700 mb-1 block">System Login Username <span className="text-red-500">*</span></label>
        <input
          required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="e.g. sco.admin or sco@fsuu.edu.ph"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
        />
        <p className="text-[11px] text-slate-400 mt-1">Used to sign in to the system.</p>
      </div>

      {/* Personal Email */}
      <div>
        <label className="text-xs font-bold text-slate-700 mb-1 block">
          Personal Email {!initial && <span className="text-red-500">*</span>}
        </label>
        <input
          required={!initial} type="email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)}
          placeholder="e.g. juan@gmail.com"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
        />
        {!initial && (
          <p className="text-[11px] text-blue-600 mt-1 font-medium">
            ✉ Login credentials will be sent to this email address.
          </p>
        )}
      </div>

      {/* Office */}
      <div>
        <label className="text-xs font-bold text-slate-700 mb-1 block">
          <span className="flex items-center gap-1"><Building size={12} /> Office</span>
        </label>
        <select
          value={officeId}
          onChange={e => setOfficeId(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all bg-white text-slate-800"
        >
          <option value="">— Select Office —</option>
          {offices.map(o => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.code})
            </option>
          ))}
        </select>
      </div>

      {/* Role */}
      <div>
        <label className="text-xs font-bold text-slate-700 mb-2 block">Role <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button" onClick={() => setRole("admin")}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${role === "admin" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
          >
            <ShieldCheck size={16} /> Admin
          </button>
          <button
            type="button" onClick={() => setRole("staff")}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${role === "staff" ? "border-purple-600 bg-purple-50 text-purple-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
          >
            <UserCog size={16} /> Staff
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          {role === "admin" ? "Admin has access to all features." : "Staff has limited access based on assignment."}
        </p>
      </div>

      {/* Change Password (edit mode) */}
      {initial && (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <p className="text-xs font-bold text-slate-700 mb-3">Change Password <span className="text-slate-400 font-normal">(leave blank to keep current)</span></p>
          <PasswordInput
            value={newPassword} onChange={e => setNewPassword(e.target.value)}
            placeholder="New password (min. 6 characters)"
          />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md shadow-blue-600/20 disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Loader2 size={14} className="animate-spin" />}
          {initial ? "Save Changes" : "Create & Send Credentials"}
        </button>
      </div>
    </form>
  );
}

export default function Settings() {
  const [users, setUsers]             = useState([]);
  const [offices, setOffices]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError]             = useState(null);
  const [success, setSuccess]         = useState(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [editUser, setEditUser]       = useState(null);
  const [deleteUser, setDeleteUser]   = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // Credentials reveal after creation
  const [createdCreds, setCreatedCreds] = useState(null);

  const showMsg = (msg, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(null); setSuccess(null); }, 6000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [usersRes, officesRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/offices"),
      ]);
      setUsers(usersRes.data ?? []);
      setOffices(officesRes.data ?? []);
    } catch { showMsg("Failed to load data.", true); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (fd) => {
    setFormLoading(true);
    try {
      const res = await api.post("/admin/users", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const { user } = res.data;
      // Extract generated password from FormData isn't possible after send,
      // so we show a note. The actual password is in the email.
      setShowCreate(false);
      setCreatedCreds({
        name: user.name,
        username: user.email,
        personalEmail: user.personal_email,
        role: user.role,
      });
      showMsg("✅ User created! Credentials emailed to their personal address.");
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.message
        ?? Object.values(err.response?.data?.errors ?? {}).flat().join(" ")
        ?? "Failed to create user.";
      showMsg(msg, true);
    } finally { setFormLoading(false); }
  };

  const handleUpdate = async (fd) => {
    setFormLoading(true);
    try {
      await api.post(`/admin/users/${editUser.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      showMsg("User updated successfully.");
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      showMsg(err.response?.data?.message ?? "Failed to update user.", true);
    } finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/users/${deleteUser.id}`);
      showMsg("User deleted.");
      setDeleteUser(null);
      fetchUsers();
    } catch (err) {
      showMsg(err.response?.data?.message ?? "Failed to delete user.", true);
    } finally { setDeleteLoading(false); }
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
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage system users and account settings</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        <button className="px-5 py-2 text-sm font-bold rounded-xl bg-white shadow-sm text-slate-900">User Management</button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-700 text-sm font-semibold animate-in slide-in-from-top-2 duration-300">
          <CheckCircle size={18} />{success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm font-semibold animate-in slide-in-from-top-2 duration-300">
          <AlertCircle size={18} />{error}
        </div>
      )}

      {/* Credentials reveal box after creation */}
      {createdCreds && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <p className="font-bold text-blue-900 text-sm">✅ Account Created: {createdCreds.name}</p>
            <button onClick={() => setCreatedCreds(null)} className="text-blue-400 hover:text-blue-700"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-white rounded-xl p-3 border border-blue-100">
              <p className="text-slate-400 font-bold mb-1">LOGIN USERNAME</p>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-slate-900">{createdCreds.username}</span>
                <CopyButton text={createdCreds.username} />
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-blue-100">
              <p className="text-slate-400 font-bold mb-1">EMAIL SENT TO</p>
              <span className="font-bold text-slate-900">{createdCreds.personalEmail}</span>
            </div>
            <div className="bg-white rounded-xl p-3 border border-blue-100">
              <p className="text-slate-400 font-bold mb-1">ROLE</p>
              <span className="font-bold text-slate-900 capitalize">{createdCreds.role}</span>
            </div>
          </div>
          <p className="text-[11px] text-blue-700 font-medium">
            ⚠ The generated password was sent to <strong>{createdCreds.personalEmail}</strong>. The user must check their inbox.
          </p>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-600" />
            <span className="font-bold text-slate-900 text-sm">System Users</span>
            <span className="ml-1 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{users.length}</span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20"
          >
            <PlusCircle size={14} /> Add User
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["User", "Login Username", "Personal Email", "Office", "Role", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">
                  <Loader2 size={20} className="animate-spin inline mr-2" />Loading users…
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">No users found.</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar user={u} />
                      <span className="font-semibold text-slate-800">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{u.personal_email ?? <span className="text-slate-300 italic">not set</span>}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{u.office?.name ?? <span className="text-slate-300 italic">—</span>}</td>
                  <td className="px-4 py-3">{roleBadge(u.role)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditUser(u)} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteUser(u)} className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700 transition-all" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <Modal title="Add New User" onClose={() => setShowCreate(false)}>
          <UserForm offices={offices} loading={formLoading} onSubmit={handleCreate} onClose={() => setShowCreate(false)} />
        </Modal>
      )}
      {editUser && (
        <Modal title="Edit User" onClose={() => setEditUser(null)}>
          <UserForm initial={editUser} offices={offices} loading={formLoading} onSubmit={handleUpdate} onClose={() => setEditUser(null)} />
        </Modal>
      )}
      {deleteUser && (
        <Modal title="Delete User" onClose={() => setDeleteUser(null)}>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 size={28} className="text-red-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Delete "{deleteUser.name}"?</p>
              <p className="text-sm text-slate-500 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteUser(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={handleDelete} disabled={deleteLoading} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {deleteLoading && <Loader2 size={14} className="animate-spin" />}Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
