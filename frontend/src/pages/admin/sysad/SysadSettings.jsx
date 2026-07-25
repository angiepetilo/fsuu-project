import { useState } from "react";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { AppCard } from "@/components/ui/app-card";
import { User, Loader2, ImagePlus, CheckCircle } from "lucide-react";

export default function SysadSettings() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name:           user?.name ?? "",
    email:          user?.email ?? "",
    personal_email: user?.personal_email ?? "",
    new_password:   "",
  });
  const [imageFile, setImageFile]     = useState(null);
  const [preview, setPreview]         = useState(user?.avatar ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  const handleImage = (e) => {
    const f = e.target.files[0];
    if (f) {
      setImageFile(f);
      setPreview(URL.createObjectURL(f));
      setRemoveImage(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const fd = new FormData();
    fd.append("_method", "PUT");
    fd.append("name", form.name);
    fd.append("email", form.email);
    fd.append("role", "admin");
    if (form.personal_email) fd.append("personal_email", form.personal_email);
    if (form.new_password)   fd.append("new_password", form.new_password);
    if (imageFile)           fd.append("image", imageFile);
    if (removeImage)         fd.append("remove_image", "1");

    try {
      await api.post(`/admin/users/${user?.id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setForm(f => ({ ...f, new_password: "" }));
    } catch (err) {
      alert(err.response?.data?.message ?? "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">System Admin Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage your administrative account details and credentials</p>
      </div>

      <AppCard className="p-6">
        <form onSubmit={save} className="space-y-5">
          {/* Avatar Upload */}
          <div className="flex items-center gap-4 pb-2 border-b border-slate-100">
            <div className="relative">
              {preview ? (
                <img src={preview} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover shadow" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-2xl font-extrabold shadow">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "S"}
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 bg-white text-blue-600 rounded-lg p-1.5 cursor-pointer shadow hover:bg-slate-50 transition-all border border-slate-100">
                <ImagePlus size={12} />
                <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
              </label>
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-sm">{user?.name}</p>
              <p className="text-xs text-blue-600 font-semibold">System Administrator</p>
              {preview && (
                <button
                  type="button"
                  onClick={() => { setPreview(null); setImageFile(null); setRemoveImage(true); }}
                  className="text-[11px] text-red-500 hover:underline mt-0.5 font-bold"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">Full Name</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">Login Username / Email</label>
            <input
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">Personal Email</label>
            <input
              type="email"
              value={form.personal_email}
              onChange={e => setForm(f => ({ ...f, personal_email: e.target.value }))}
              placeholder="e.g. personal@gmail.com"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">
              Change Password <span className="text-slate-400 font-normal">(leave blank to keep current)</span>
            </label>
            <input
              type="password"
              placeholder="New password..."
              value={form.new_password}
              onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-extrabold transition-all shadow-md ${
              saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
            } disabled:opacity-60`}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : null}
            <span>{saved ? "Profile Saved Successfully!" : "Save Profile Changes"}</span>
          </button>
        </form>
      </AppCard>
    </div>
  );
}
