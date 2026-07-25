import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/axios";
import { useDataCache } from "@/hooks/useDataCache";
import { Settings, Loader2, AlertCircle, Plus, Trash2, Clock, Tag, User, ClipboardList, ImagePlus, Pencil, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const TABS = [
  { key: "categories", label: "Equipment Categories", icon: Tag },
  { key: "programs",   label: "Programs",             icon: ClipboardList },
  { key: "hours",      label: "Operation Hours",      icon: Clock },
  { key: "profile",    label: "User Profile",         icon: User },
];

function CategoryModal({ category, onClose, onSave }) {
  const isEdit = !!category?.id;
  const [form, setForm] = useState({ name: category?.name ?? "" });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(category?.image_url ?? null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      if (photo) fd.append("image", photo);
      if (isEdit) fd.append("_method", "PUT");
      await onSave(fd, isEdit ? category.id : null);
      onClose();
    } catch (e) {
      alert(e.response?.data?.message ?? "Failed to save category.");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-900">{isEdit ? "Edit Category" : "Add Category"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-xl"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {preview
                ? <img src={preview} alt="Category" className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-100 shadow" />
                : <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200"><ImagePlus size={28} /></div>
              }
              <label className="absolute -bottom-1.5 -right-1.5 bg-blue-600 text-white rounded-lg p-1.5 cursor-pointer shadow hover:bg-blue-700 transition-all">
                <ImagePlus size={13} />
                <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if(f){ setPhoto(f); setPreview(URL.createObjectURL(f)); }}} className="hidden" />
              </label>
            </div>
            <p className="text-[11px] text-slate-400">Category image (optional)</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Category Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => setForm({ name: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">Cancel</button>
            <button onClick={handleSave} disabled={loading || !form.name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />} {isEdit ? "Save Changes" : "Add Category"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Equipment Categories ──────────────────────────────────────────────────────
function CategoriesTab() {
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [editCategory, setEditCategory] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data: catData, loading, refresh: fetch } = useDataCache('avr_equipment_types', '/avr/equipment-types');
  const categories = catData?.data ?? (Array.isArray(catData) ? catData : []);

  const handleSave = async (fd, id) => {
    if (id) await api.post(`/avr/equipment-types/${id}`, fd);
    else    await api.post("/avr/equipment-types", fd);
    fetch();
  };

  const del = async (id) => {
    if (!confirm("Delete this category?")) return;
    setDeleteLoading(id);
    try { await api.delete(`/avr/equipment-types/${id}`); fetch(); }
    catch (e) { alert(e.response?.data?.message ?? "Cannot delete."); }
    finally { setDeleteLoading(null); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Equipment Categories</h2>
          <p className="text-xs text-slate-500">Manage categories and upload category photos</p>
        </div>
        <button onClick={() => { setEditCategory(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-600/20">
          <Plus size={14} /> Add Category
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Name", "Total Units", "Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? <tr><td colSpan={3} className="text-center py-8 text-slate-400"><Loader2 size={16} className="animate-spin inline mr-1" />Loading…</td></tr>
                : categories.length === 0
                  ? <tr><td colSpan={3} className="text-center py-8 text-slate-400">No categories yet.</td></tr>
                  : categories.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{c.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{c.units_count ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => { setEditCategory(c); setShowModal(true); }}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-700 transition-all">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => del(c.id)} disabled={deleteLoading === c.id}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-700 transition-all">
                            {deleteLoading === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
      {showModal && <CategoryModal category={editCategory} onClose={() => setShowModal(false)} onSave={handleSave} />}
    </div>
  );
}

// ── Operation Hours ───────────────────────────────────────────────────────────
function HoursTab() {
  const [form, setForm] = useState({ open_time: "08:00", close_time: "17:00", grace_period_hours: 1, auto_cancel_enabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/avr/settings").then(({ data }) => setForm({ ...form, ...data })).catch(() => { }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setSaved(false);
    try { await api.post("/avr/settings", form); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    catch (e) { alert(e.response?.data?.message ?? "Failed to save."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-8 text-slate-400"><Loader2 size={16} className="animate-spin inline" /> Loading…</div>;

  return (
    <div className="space-y-5 max-w-md">
      {[["open_time", "Opening Time", "time"], ["close_time", "Closing Time", "time"], ["grace_period_hours", "Grace Period (hours)", "number"]].map(([k, l, t]) => (
        <div key={k}>
          <label className="text-xs font-bold text-slate-700 mb-1.5 block">{l}</label>
          <input type={t} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: t === "number" ? parseInt(e.target.value) : e.target.value }))}
            min={t === "number" ? 0 : undefined}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
        </div>
      ))}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-2 mt-4">
        <p><strong>Grace Period Rules:</strong></p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>Venue Bookings:</strong> If the requestor does not arrive within the grace period after the start time, the booking is automatically canceled (unless valid reason).</li>
          <li><strong>Equipment Borrowing:</strong> The grace period applies before the end of the borrowing time. During this time, they are responsible for the equipment.</li>
        </ul>
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="auto_cancel" checked={!!form.auto_cancel_enabled} onChange={e => setForm(f => ({ ...f, auto_cancel_enabled: e.target.checked }))}
          className="w-4 h-4 rounded accent-blue-600" />
        <label htmlFor="auto_cancel" className="text-sm font-semibold text-slate-700">Auto-cancel overdue unreturned borrowings</label>
      </div>
      <button onClick={save} disabled={saving}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"} disabled:opacity-60`}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : null}
        {saved ? "Saved!" : "Save Settings"}
      </button>
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name ?? "", email: user?.email ?? "", personal_email: user?.personal_email ?? "", new_password: "" });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(user?.avatar ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleImage = (e) => {
    const f = e.target.files[0];
    if (f) { setImageFile(f); setPreview(URL.createObjectURL(f)); setRemoveImage(false); }
  };

  const save = async () => {
    setSaving(true); setSaved(false);
    const fd = new FormData();
    fd.append("_method", "PUT");
    fd.append("name", form.name);
    fd.append("email", form.email);
    fd.append("personal_email", form.personal_email);
    if (form.new_password) fd.append("new_password", form.new_password);
    if (imageFile) fd.append("image", imageFile);
    if (removeImage) fd.append("remove_image", "1");

    try {
      await api.post(`/admin/users/${user?.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
      setForm(f => ({ ...f, new_password: "" }));
    } catch (e) { alert(e.response?.data?.message ?? "Failed to update profile."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-md">
      <div className="flex items-center gap-4 mb-2">
        <div className="relative">
          {preview ? (
            <img src={preview} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover shadow" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-2xl font-extrabold shadow">
              {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
            </div>
          )}
          <label className="absolute -bottom-1 -right-1 bg-white text-blue-600 rounded-lg p-1.5 cursor-pointer shadow hover:bg-slate-50 transition-all border border-slate-100">
            <ImagePlus size={12} />
            <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </label>
        </div>
        <div>
          <p className="font-bold text-slate-900">{user?.name}</p>
          <p className="text-xs text-slate-400">AVR Administrator</p>
          {preview && (
            <button onClick={() => { setPreview(null); setImageFile(null); setRemoveImage(true); }} className="text-[10px] text-red-500 hover:underline mt-0.5">
              Remove photo
            </button>
          )}
        </div>
      </div>

      {[["name", "Full Name"], ["email", "System Email"], ["personal_email", "Personal Email"]].map(([k, l]) => (
        <div key={k}>
          <label className="text-xs font-bold text-slate-700 mb-1.5 block">{l}</label>
          <input value={form[k] ?? ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
        </div>
      ))}

      <div>
        <label className="text-xs font-bold text-slate-700 mb-1.5 block">Change Password <span className="text-slate-400 font-normal">(leave blank to keep current)</span></label>
        <input type="password" placeholder="New password" value={form.new_password} onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10" />
      </div>

      <button onClick={save} disabled={saving}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"} disabled:opacity-60`}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : null}
        {saved ? "Saved!" : "Update Profile"}
      </button>
    </div>
  );
}

// ── Programs Tab ──────────────────────────────────────────────────────────────
function ProgramsTab() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/programs");
      setPrograms(data);
    } catch {
      setError("Could not load registered programs. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetch(); }, []);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post("/programs", form);
      setForm({ name: "", description: "" });
      fetch();
    } catch (e) { alert(e.response?.data?.message ?? "Failed to save."); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm("Delete this program?")) return;
    setDeleteLoading(id);
    try { await api.delete(`/programs/${id}`); fetch(); }
    catch (e) { alert(e.response?.data?.message ?? "Cannot delete."); }
    finally { setDeleteLoading(null); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Add Form */}
      <div className="bg-slate-50 rounded-2xl p-5 space-y-3 border border-slate-200">
        <p className="text-sm font-bold text-slate-700">Add New Program</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Program name *"
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white" />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description"
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-white" />
        </div>
        <button onClick={save} disabled={saving || !form.name.trim()}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Program
        </button>
      </div>

      {/* Error Fallback Notice */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-700 font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetch} className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Name", "Description", "Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? <tr><td colSpan={3} className="text-center py-8 text-slate-400"><Loader2 size={16} className="animate-spin inline mr-1" />Loading programs…</td></tr>
                : programs.length === 0 && !error
                  ? <tr><td colSpan={3} className="text-center py-8 text-slate-400 text-xs">No programs registered. Use the form above to add a new academic program.</td></tr>
                  : programs.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{p.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.description ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => del(p.id)} disabled={deleteLoading === p.id}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-700 transition-all">
                          {deleteLoading === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AvrSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSearchParams({ tab: key });
  };

  const renderTab = () => {
    switch (activeTab) {
      case "categories": return <CategoriesTab />;
      case "programs": return <ProgramsTab />;
      case "hours": return <HoursTab />;
      case "profile": return <ProfileTab />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">System configuration and account settings</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === t.key ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        {renderTab()}
      </div>
    </div>
  );
}
