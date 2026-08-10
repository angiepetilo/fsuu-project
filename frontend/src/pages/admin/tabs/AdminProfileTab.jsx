import { useState } from "react";
import { Save, Camera, Trash2, KeyRound, Lock, Eye, EyeOff, Loader2, X } from "lucide-react";
import api from "@/lib/axios";

export default function AdminProfileTab({
  profileForm,
  setProfileForm,
  profileAvatarPreview,
  setProfileAvatarPreview,
  handleSaveProfile,
}) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passFeedback, setPassFeedback] = useState(null);
  const [passError, setPassError] = useState(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.new_password !== passForm.new_password_confirmation) {
      setPassError("New passwords do not match.");
      return;
    }
    setPassLoading(true);
    setPassError(null);
    setPassFeedback(null);
    try {
      await api.post("/change-password", {
        current_password: passForm.current_password,
        new_password: passForm.new_password,
      });
      setPassFeedback("Password changed successfully!");
      setPassForm({ current_password: "", new_password: "", new_password_confirmation: "" });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPassFeedback(null);
      }, 1500);
    } catch (err) {
      setPassError(err.response?.data?.message || err.response?.data?.errors?.current_password?.[0] || "Failed to change password.");
    } finally {
      setPassLoading(false);
    }
  };

  const [isEditing, setIsEditing] = useState(false);

  // Derive role label from profileForm
  const roleLabel = profileForm.role || profileForm.account_type || 'Admin';

  return (
    <>
      {/* Two-panel layout: Left = Avatar Card, Right = Info + Password sections */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">

        {/* ── Left: Avatar Card ───────────────────────────────────────────── */}
        <div className="w-full lg:w-52 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col items-center gap-3 text-center">
          {/* Circular Avatar */}
          <div className="relative">
            {profileAvatarPreview ? (
              <img
                src={profileAvatarPreview}
                alt={profileForm.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-600 border-2 border-blue-500 flex items-center justify-center text-white text-3xl font-black shadow-xs select-none">
                {profileForm.name
                  ? profileForm.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  : 'AD'}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-extrabold text-slate-900">Profile Photo</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
              This photo will appear in the sidebar and across the system.
            </p>
          </div>

          <label className="w-full px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors">
            <Camera size={13} />
            <span>{profileAvatarPreview ? 'Change Photo' : 'Upload Photo'}</span>
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>

          {profileAvatarPreview && (
            <button
              type="button"
              onClick={() => setProfileAvatarPreview(null)}
              className="w-full px-3 py-1.5 border border-slate-300 text-rose-600 hover:bg-rose-50 font-bold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Trash2 size={13} />
              <span>Remove</span>
            </button>
          )}
        </div>

        {/* ── Right: Personal Info + Password & Security ───────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Personal Information card */}
          <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(e); setIsEditing(false); }}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Personal Information</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Your name is shown on the dashboard greeting and reservation records.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 text-[11px] font-extrabold rounded-lg">
                  {roleLabel}
                </span>
                {isEditing ? (
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 text-white text-[11px] font-extrabold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                  >
                    <Save size={12} /> Save
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-[11px] font-extrabold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-2xs"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* 2-col fields grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  disabled={!isEditing}
                  value={profileForm.personal_email || profileForm.email || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, personal_email: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Login Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  disabled={!isEditing}
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account</label>
                <input
                  type="text"
                  disabled
                  value={profileForm.office || roleLabel}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs"
                />
              </div>
            </div>
          </form>

          {/* Password & Security card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Password &amp; Security</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Update your login password. You must enter your current password to confirm.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="shrink-0 px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              Change Password
            </button>
          </div>
        </div>
      </div>



      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Lock size={15} className="text-slate-700" />
                <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">Change Account Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-5 space-y-3.5 text-xs font-medium">
              {passFeedback && (
                <div className="p-2.5 border-t border-b border-emerald-200 text-emerald-700 font-bold text-xs">
                  {passFeedback}
                </div>
              )}
              {passError && (
                <div className="p-2.5 border-t border-b border-rose-200 text-rose-700 font-bold text-xs">
                  {passError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Current Password *</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    value={passForm.current_password}
                    onChange={(e) => setPassForm({ ...passForm, current_password: e.target.value })}
                    placeholder="Enter your existing password"
                    className="w-full p-2.5 pr-9 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    minLength={6}
                    value={passForm.new_password}
                    onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full p-2.5 pr-9 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passForm.new_password_confirmation}
                  onChange={(e) => setPassForm({ ...passForm, new_password_confirmation: e.target.value })}
                  placeholder="Re-enter new password"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="px-4 py-1.5 rounded-lg border border-slate-900 bg-white text-slate-900 hover:bg-slate-50 font-bold text-xs shadow-2xs disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
                >
                  {passLoading && <Loader2 size={13} className="animate-spin" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
