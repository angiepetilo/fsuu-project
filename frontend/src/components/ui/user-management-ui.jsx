import { useState, useMemo } from "react";
import { Users, Pencil, Trash2, Loader2, ImagePlus, User, Building, ShieldCheck, UserCog, Eye, EyeOff, Lock, Check, Copy } from "lucide-react";

export function Avatar({ user }) {
  if (user.avatar) return (
    <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow" />
  );
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold border-2 border-white shadow">
      {user.name?.charAt(0)?.toUpperCase() ?? "U"}
    </div>
  );
}

export function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all">
      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
    </button>
  );
}

function PasswordInput({ value, onChange, placeholder, label }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      {label && <label className="text-xs font-bold text-slate-700 mb-1 block">{label}</label>}
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all pr-10"
        />
        <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

export function UserForm({ initial, offices, onSubmit, loading, onClose }) {
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
    if (newPassword) fd.append("new_password", newPassword);
    if (imageFile) fd.append("image", imageFile);
    if (removeImage) fd.append("remove_image", "1");
    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Avatar upload */}
      <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
        <div className="relative">
          {preview ? (
            <img src={preview} alt="preview" className="w-16 h-16 rounded-full object-cover border-2 border-white shadow" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
              <User size={24} />
            </div>
          )}
          <label className="absolute bottom-0 right-0 p-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow transition-all">
            <ImagePlus size={12} />
            <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </label>
        </div>
        <div className="text-xs text-slate-500">
          <p className="font-bold text-slate-700">Profile Photo</p>
          <p className="text-[10px]">JPG, PNG or GIF. Max 2MB.</p>
          {preview && (
            <button
              type="button"
              onClick={() => { setPreview(null); setImageFile(null); setRemoveImage(true); }}
              className="text-[10px] text-red-600 font-bold hover:underline mt-1 block"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="text-xs font-bold text-slate-700 mb-1 block">Full Name *</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Juan dela Cruz"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
        />
      </div>

      {/* System Email */}
      <div>
        <label className="text-xs font-bold text-slate-700 mb-1 block">System Login Username / Email *</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="juan.delacruz@urios.edu.ph"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
        />
      </div>

      {/* Personal Email */}
      <div>
        <label className="text-xs font-bold text-slate-700 mb-1 block">Personal Email (For OTP / Credential Delivery) *</label>
        <input
          type="email"
          required
          value={personalEmail}
          onChange={(e) => setPersonalEmail(e.target.value)}
          placeholder="juan.personal@gmail.com"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all"
        />
      </div>

      {/* Role & Office */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Account Role *</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all bg-white"
          >
            <option value="staff">Staff</option>
            <option value="admin">System Admin</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">Assigned Office</label>
          <select
            value={officeId}
            onChange={(e) => setOfficeId(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all bg-white"
          >
            <option value="">None (Global)</option>
            {offices.map(o => (
              <option key={o.id} value={o.id}>{o.code} — {o.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Optional New Password */}
      {initial && (
        <PasswordInput
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Leave blank to keep current"
          label="Reset Password (Optional)"
        />
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {initial ? "Save Changes" : "Create Account"}
        </button>
      </div>
    </form>
  );
}

export function UserTable({ users, onEdit, onDelete, currentUserId }) {
  const [tablePage, setTablePage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));

  const pageUsers = useMemo(() => {
    return users.slice((tablePage - 1) * pageSize, tablePage * pageSize);
  }, [users, tablePage]);

  if (!users.length) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
        <Users className="mx-auto text-slate-300 mb-2" size={36} />
        <p className="text-sm font-bold text-slate-700">No users found</p>
        <p className="text-xs text-slate-400 mt-1">Try adjusting your search filter or add a new user.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Office</th>
              <th className="px-4 py-3 text-left">Personal Email</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pageUsers.map((u) => {
              const isAdmin = u.role === "admin";
              const isSelf  = currentUserId && u.id === currentUserId;
              return (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-all">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar user={u} />
                      <div>
                        <p className="font-extrabold text-slate-900 leading-tight">{u.name}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      isAdmin ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      {isAdmin ? <ShieldCheck size={12} /> : <UserCog size={12} />}
                      {isAdmin ? "Admin" : "Staff"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.office ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <Building size={12} className="text-slate-400" />
                        {u.office.code || u.office.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Global</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {u.personal_email ? (
                      <div className="flex items-center gap-1.5">
                        <span>{u.personal_email}</span>
                        <CopyButton text={u.personal_email} />
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onEdit(u)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all"
                        title="Edit User"
                      >
                        <Pencil size={13} />
                      </button>
                      {!isSelf && (
                        <button
                          onClick={() => onDelete(u)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700 transition-all"
                          title="Delete User"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Page {tablePage} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={tablePage === 1}
              onClick={() => setTablePage(p => Math.max(1, p - 1))}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-all"
            >
              Previous
            </button>
            <button
              disabled={tablePage === totalPages}
              onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
