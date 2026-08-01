import { useState, useEffect } from "react";
import { Save, User, Camera } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";

export default function ProfileConfigTab({ showMsg }) {
  const { user } = useAuth();
  const [offices, setOffices] = useState([]);

  const [profileData, setProfileData] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_sysad_profile");
      return saved ? JSON.parse(saved) : {
        name: user?.name || "Super Admin",
        username: user?.username || "sysad",
        email: user?.email || "sysad@fsuu.edu.ph",
        personal_email: user?.personal_email || "",
        location: "",
        avatar: null,
      };
    } catch {
      return {
        name: user?.name || "Super Admin",
        username: "sysad",
        email: user?.email || "sysad@fsuu.edu.ph",
        personal_email: "",
        location: "",
        avatar: null,
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
      } catch {
        setOffices([]);
      }
    };
    fetchOffices();
  }, []);

  const [avatarPreview, setAvatarPreview] = useState(profileData.avatar);

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

  const handleSaveProfile = (e) => {
    e.preventDefault();
    localStorage.setItem("fsuu_sysad_profile", JSON.stringify(profileData));
    showMsg("✅ Profile updated! Assigned campus office, username, personal recovery email, and avatar saved.");
  };

  return (
    <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
      <div>
        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
          <User size={18} className="text-blue-600" />
          Profile & Recovery Configuration
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Update account details, unique login handle, personal email for password reset, and profile avatar.
        </p>
      </div>

      <div className="space-y-6 pt-2 border-t border-slate-100 max-w-2xl">
        {/* Avatar Upload */}
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={36} className="text-slate-400" />
            )}
          </div>

          <div>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer">
              <Camera size={14} />
              <span>Upload New Avatar</span>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Recommended square JPG/PNG under 2MB.</p>
          </div>
        </div>

        {/* Profile Form Fields */}
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
            <label className="block text-xs font-bold text-slate-900 mb-1">Unique Username Handle *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
              <input
                type="text"
                required
                placeholder="sysad_admin"
                value={profileData.username}
                onChange={(e) => setProfileData({ ...profileData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                className="w-full p-3 pl-7 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
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

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">Assigned Campus Branch Office *</label>
            <select
              value={profileData.location}
              onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {offices.length > 0 ? (
                offices.map((o) => (
                  <option key={o.id} value={o.name}>
                    {o.name} {o.location ? `(${o.location})` : ""}
                  </option>
                ))
              ) : (
                <option value="">No campus branch offices created yet</option>
              )}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Dynamically populated from registered Campus Branch Offices.</p>
          </div>

          <div>
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
            <p className="text-[10px] text-slate-400 mt-1">Used for password recovery links if institutional email is locked.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100 max-w-2xl">
        <button
          type="submit"
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer"
        >
          <Save size={16} /> Save Profile Configuration
        </button>
      </div>
    </form>
  );
}
