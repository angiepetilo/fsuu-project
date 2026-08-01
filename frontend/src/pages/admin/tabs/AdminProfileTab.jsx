import { Save } from "lucide-react";

export default function AdminProfileTab({
  profileForm,
  setProfileForm,
  handleSaveProfile,
}) {
  return (
    <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
      <div>
        <h3 className="font-extrabold text-slate-900 text-sm">Branch Administrator Account Profile</h3>
        <p className="text-xs text-slate-500 font-medium">
          Update account display name, contact email, and branch phone numbers.
        </p>
      </div>

      <div className="max-w-xl space-y-4 pt-2 border-t border-slate-100">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">Position / Office *</label>
            <input
              type="text"
              required
              value={profileForm.office}
              onChange={(e) => setProfileForm({ ...profileForm, office: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">Official Email *</label>
            <input
              type="email"
              required
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">Contact Phone *</label>
            <input
              type="text"
              required
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
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
