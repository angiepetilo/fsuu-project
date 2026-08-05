import { Save, Camera, Trash2 } from "lucide-react";

export default function AdminProfileTab({
  profileForm,
  setProfileForm,
  profileAvatarPreview,
  setProfileAvatarPreview,
  handleSaveProfile,
}) {
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

  return (
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

      <div className="flex justify-end pt-4 border-t border-slate-100 max-w-2xl">
        <button
          type="submit"
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer"
        >
          <Save size={16} /> Save Profile Changes
        </button>
      </div>
    </form>
  );
}
