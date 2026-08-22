import { useState, useEffect } from "react";
import { Save, Camera, KeyRound, Lock, Eye, EyeOff, Loader2, X, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import notify from "@/lib/notify";

export default function ProfileConfigTab({ showMsg }) {
  const { user, updateAuthUser } = useAuth();
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

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

  const [profileData, setProfileData] = useState(() => ({
    name: user?.name || "Super Administrator",
    email: user?.email || "superadmin@fsuu.edu.ph",
    personal_email: user?.personal_email || "",
    avatar: user?.avatar || null,
  }));

  // Ensure state automatically reflects the logged-in user when switching accounts
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "Super Administrator",
        email: user.email || "superadmin@fsuu.edu.ph",
        personal_email: user.personal_email || "",
        avatar: user.avatar || null,
      });
      setAvatarPreview(user.avatar || null);
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
        setProfileData((prev) => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const payload = {
      name: profileData.name,
      email: profileData.email,
      personal_email: profileData.personal_email,
      avatar: avatarPreview || profileData.avatar,
    };

    try {
      const res = await api.post("/user/profile", payload);
      if (res.data?.user && updateAuthUser) {
        updateAuthUser(res.data.user);
      }
      notify.success("Profile Updated", "Profile settings saved successfully.");
      setIsEditing(false);
    } catch (err) {
      notify.error("Update Failed", err.response?.data?.message || "Failed to update profile.");
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

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left Column: Avatar Photo Card */}
        <div className="w-full lg:w-52 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col items-center gap-3 text-center">
          <div className="relative">
            {avatarPreview || profileData.avatar ? (
              <img
                src={avatarPreview || profileData.avatar}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border border-slate-200 shadow-2xs"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white text-2xl font-bold select-none">
                {profileData.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-slate-900">Profile Photo</p>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5 leading-snug">
              Photo displayed in header and system records.
            </p>
          </div>

          {isEditing && (
            <div className="w-full space-y-2">
              <label className="w-full px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs">
                <Camera size={13} />
                <span>{avatarPreview || profileData.avatar ? "Change Photo" : "Upload Photo"}</span>
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>

              {(avatarPreview || profileData.avatar) && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarPreview(null);
                    setProfileData((prev) => ({ ...prev, avatar: null }));
                  }}
                  className="w-full px-3 py-1.5 border border-slate-200 text-rose-600 hover:bg-rose-50 font-semibold rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Information Form */}
        <div className="flex-1 min-w-0 space-y-4 w-full">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Personal Information</h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Manage administrator display credentials and recovery email.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold rounded-md">
                  Super Admin
                </span>
                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Save size={13} />
                      <span>Save Changes</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Profile Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className={`w-full p-2.5 border rounded-lg font-medium text-xs transition-colors ${
                    isEditing
                      ? "bg-white border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600"
                      : "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address (Login Credentials) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  disabled={!isEditing}
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="e.g. admin@fsuu.edu.ph"
                  className={`w-full p-2.5 border rounded-lg font-mono font-medium text-xs transition-colors ${
                    isEditing
                      ? "bg-white border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600"
                      : "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Personal / Recovery Email <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  disabled={!isEditing}
                  value={profileData.personal_email || ""}
                  onChange={(e) => setProfileData({ ...profileData, personal_email: e.target.value })}
                  placeholder="e.g. personal@gmail.com"
                  className={`w-full p-2.5 border rounded-lg font-mono font-medium text-xs transition-colors ${
                    isEditing
                      ? "bg-white border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600"
                      : "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Role</label>
                <input
                  type="text"
                  disabled
                  value="Super Admin"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-600 text-xs cursor-not-allowed"
                />
              </div>
            </div>
          </form>

          {/* Password & Security card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Password &amp; Security</h3>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Update your login password. You must enter your current password to confirm.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="shrink-0 px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/20 z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Lock size={15} className="text-slate-700" />
                <h3 className="font-bold text-slate-900 text-sm">Change Account Password</h3>
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
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-semibold text-xs">
                  {passFeedback}
                </div>
              )}
              {passError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-semibold text-xs">
                  {passError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password *</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    placeholder="Enter current password"
                    value={passForm.current_password}
                    onChange={(e) => setPassForm({ ...passForm, current_password: e.target.value })}
                    className="w-full p-2.5 pr-10 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:border-blue-600 bg-white"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    placeholder="Min. 8 characters"
                    value={passForm.new_password}
                    onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })}
                    className="w-full p-2.5 pr-10 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:border-blue-600 bg-white"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Confirm new password"
                  value={passForm.new_password_confirmation}
                  onChange={(e) => setPassForm({ ...passForm, new_password_confirmation: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:border-blue-600 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
