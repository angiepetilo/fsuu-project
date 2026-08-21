import { useState } from "react";
import { ImagePlus, User, Loader2, Sliders } from "lucide-react";
import PasswordInput from "./PasswordInput";

export default function UserForm({ initial, onSubmit, loading, onClose, isSuperAdmin }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [personalEmail, setPersonalEmail] = useState(initial?.personal_email ?? "");
  const [role, setRole] = useState(initial?.role?.name ?? initial?.role ?? "staff");
  const [newPassword, setNewPassword] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(initial?.avatar ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const [isDisabled, setIsDisabled] = useState(
    initial?.status === "disabled" || initial?.status === "inactive" || initial?.is_active === false
  );
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
    if (initial) {
      fd.append("name", name);
      fd.append("email", email);
      fd.append("personal_email", personalEmail);
      fd.append("role", role);
      fd.append("status", isDisabled ? "disabled" : "active");
      fd.append("is_active", isDisabled ? "0" : "1");
      fd.append("permissions", JSON.stringify(permissions));
      if (imageFile) fd.append("image", imageFile);
      if (removeImage) fd.append("remove_image", "1");
      fd.append("_method", "PUT");
      if (newPassword) fd.append("new_password", newPassword);
    } else {
      fd.append("personal_email", personalEmail);
      fd.append("role", "staff");
      fd.append("status", isDisabled ? "disabled" : "active");
      fd.append("is_active", isDisabled ? "0" : "1");
      fd.append("permissions", JSON.stringify(permissions));
    }
    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {initial ? (
        <>
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
            <label className="text-xs font-bold text-slate-700 mb-1 block">Institutional / Login Email <span className="text-rose-600">*</span></label>
            <input
              required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="e.g. sco.admin@fsuu.edu.ph"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900 transition-all bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Personal Email</label>
            <input
              type="email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)}
              placeholder="e.g. juan@gmail.com"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900 transition-all bg-white"
            />
          </div>
        </>
      ) : (
        <div>
          <label className="text-xs font-bold text-slate-900 mb-1 block">Personal Email <span className="text-rose-600">*</span></label>
          <input
            required type="email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)}
            placeholder="e.g. juan@gmail.com"
            className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900 transition-all bg-white"
          />
          <p className="text-[10px] text-slate-400 mt-1 font-medium">An activation link will be sent to this email.</p>
        </div>
      )}

      {/* Staff Feature Access Permissions */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 space-y-2.5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
          <span className="text-xs font-extrabold text-slate-900">Staff Feature Access Permissions</span>
        </div>

        <div className="space-y-1.5 pt-1">
          {[
            { key: "manage_equipments", label: "Manage Equipment" },
            { key: "venue_bookings", label: "Venue Bookings" },
            { key: "equipment_borrowing", label: "Equipment Borrowing" },
            { key: "history_log", label: "History Log" },
            { key: "manage_venues", label: "Manage Venues" },
            { key: "reports", label: "Reports & Analytics" },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 transition-all">
              <input
                type="checkbox"
                checked={permissions.includes(key)}
                onChange={() => togglePermission(key)}
                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Disable Account Option */}
      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-xs font-extrabold text-slate-900 block">Disable Account Access</span>
            <span className="text-[10.5px] text-slate-500 font-medium block">
              Prevent this user from logging in without permanently deleting the account.
            </span>
          </div>
          <input
            type="checkbox"
            checked={isDisabled}
            onChange={e => setIsDisabled(e.target.checked)}
            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-600 cursor-pointer"
          />
        </label>
      </div>

      {initial && (
        <div className="bg-white rounded-xl p-3.5 border border-slate-200">
          <p className="text-xs font-bold text-slate-700 mb-2">Change Password <span className="text-slate-400 font-normal">(optional)</span></p>
          <PasswordInput
            value={newPassword} onChange={e => setNewPassword(e.target.value)}
            placeholder="New password (min. 6 characters)"
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          {initial ? "Save Changes" : "Send Invite"}
        </button>
      </div>
    </form>
  );
}
