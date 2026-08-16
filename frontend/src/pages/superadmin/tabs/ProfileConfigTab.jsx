import { useState, useEffect } from "react";
import { Save, User, Camera, KeyRound, Lock, Eye, EyeOff, Loader2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";

export default function ProfileConfigTab({ showMsg }) {
  const { user, updateAuthUser } = useAuth();
  const [offices, setOffices] = useState([]);
  const [avatarPreview, setAvatarPreview] = useState(null);

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

  const [profileData, setProfileData] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_sysad_profile");
      return saved ? JSON.parse(saved) : {
        name: user?.name || "Super Admin",
        email: user?.email || "sysad@fsuu.edu.ph",
        personal_email: user?.personal_email || "",
        location: "",
        avatar: user?.avatar || null,
      };
    } catch {
      return {
        name: user?.name || "Super Admin",
        email: user?.email || "sysad@fsuu.edu.ph",
        personal_email: "",
        location: "",
        avatar: user?.avatar || null,
      };
    }
  });

  useEffect(() => {
    const fetchOffices = async () => {
      try {
        const res = await api.get("/admin/offices");
        const list = Array.isArray(res.data) ? res.data : [];
        setOffices(list);
        if (list.length > 0 && !profileData.location) {
          setProfileData((prev) => ({ ...prev, location: list[0].name }));
        }
      } catch {}
    };
    fetchOffices();
  }, []);

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
    } catch {}

    localStorage.setItem("fsuu_sysad_profile", JSON.stringify(profileData));
    window.dispatchEvent(new Event("sysad_profile_updated"));
    showMsg("✅ System Administrator profile & avatar updated permanently!");
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
      {/* Side-by-Side Panel Layout: Left = Avatar Card, Right = Information Form */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Avatar Photo Card */}
        <div className="w-full lg:w-64 shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col items-center gap-4 text-center">
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-black border-4 border-white shadow-md overflow-hidden">
            {avatarPreview || profileData.avatar ? (
              <img src={avatarPreview || profileData.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              profileData.name.charAt(0).toUpperCase()
            )}
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-extrabold text-slate-900">SysAd Profile Photo</h4>
            <p className="text-[11px] text-slate-500 font-medium leading-snug">
              Upload a custom profile photo for your system administrator account.
            </p>
          </div>

          <label className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-all shadow-xs">
            <Camera size={14} />
            <span>Upload New Avatar</span>
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
        </div>

        {/* Right Column: Information Form */}
        <form onSubmit={handleSaveProfile} className="flex-1 w-full bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">System Administrator Profile Configuration</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage global system administrator display credentials, recovery email, and profile settings.
            </p>
          </div>

          {/* Profile Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Full Display Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Angie Petilo"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>


            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Institutional Email *</label>
              <input
                type="email"
                required
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>Personal Recovery Email</span>
                <span className="text-[10px] text-purple-600 font-bold">(Set Forgot Password)</span>
              </label>
              <input
                type="email"
                required
                placeholder="personal@gmail.com"
                value={profileData.personal_email}
                onChange={(e) => setProfileData({ ...profileData, personal_email: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs"
            >
              <KeyRound size={15} /> Change Account Password
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition-all"
            >
              <Save size={16} /> Save Profile Configuration
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-slate-100">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-amber-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Change Super Admin Password</h3>
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
                    placeholder="Enter existing password"
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
