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
      setPassFeedback("✅ Password changed successfully!");
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

  return (
    <>
      <form onSubmit={handleSaveProfile} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Branch Administrator Account Profile</h3>
          <p className="text-xs text-slate-500 font-medium">
            Update account display name, profile avatar photo, contact email, and branch assignment.
          </p>
        </div>

        {/* Avatar Section */}
        <div className="flex flex-col sm:flex-row items-center gap-5 p-5 bg-slate-50/80 border border-slate-200/80 rounded-2xl max-w-2xl">
          <div className="relative shrink-0">
            {profileAvatarPreview ? (
              <img
                src={profileAvatarPreview}
                alt={profileForm.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-600 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-2xl font-black shadow-sm">
                {profileForm.name ? profileForm.name.charAt(0).toUpperCase() : "A"}
              </div>
            )}
          </div>

          <div className="space-y-2 text-center sm:text-left">
            <h4 className="text-xs font-extrabold text-slate-900">Profile Avatar Photo</h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Upload a profile photo to personalize your branch administrator account across the admin portal navigation.
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
              <label className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm">
                <Camera size={14} />
                <span>{profileAvatarPreview ? "Change Photo" : "Upload Photo Avatar"}</span>
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>

              {profileAvatarPreview && (
                <button
                  type="button"
                  onClick={() => setProfileAvatarPreview(null)}
                  className="px-3 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-2xl space-y-4 pt-2 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Position / Office *</label>
              <input
                type="text"
                required
                value={profileForm.office}
                onChange={(e) => setProfileForm({ ...profileForm, office: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">System Login Email *</label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Personal Contact Email</label>
              <input
                type="email"
                value={profileForm.personal_email || ""}
                onChange={(e) => setProfileForm({ ...profileForm, personal_email: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 max-w-2xl">
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs"
          >
            <KeyRound size={15} /> Change Account Password
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer"
          >
            <Save size={16} /> Save Profile Changes
          </button>
        </div>
      </form>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-amber-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Change Account Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-6 space-y-4 text-xs font-medium">
              {passFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold text-xs">
                  {passFeedback}
                </div>
              )}
              {passError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold text-xs">
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
                    className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:border-amber-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
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
                    className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:border-amber-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
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
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
                >
                  {passLoading && <Loader2 size={14} className="animate-spin" />}
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
