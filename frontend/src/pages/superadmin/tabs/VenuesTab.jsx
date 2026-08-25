import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Building, CheckCircle2, Loader2, Image as ImageIcon, Camera } from "lucide-react";
import api from "@/lib/axios";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function VenuesTab({ showMsg }) {
  const [venues, setVenues] = useState([]);
  const [equipmentCatalog, setEquipmentCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null); // { id, name }

  const [form, setForm] = useState({
    name: "",
    avatar: "",
    status: "available",
    location: "",
    capacity: 100,
    allowed_equipment: [],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [venueRes, equipRes] = await Promise.all([
        api.get("/admin/venues"),
        api.get("/public/equipment-types").catch(() => ({ data: [] })),
      ]);
      setVenues(Array.isArray(venueRes.data) ? venueRes.data : []);
      setEquipmentCatalog(Array.isArray(equipRes.data) ? equipRes.data : []);
    } catch {
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    const payload = {
      name: form.name,
      avatar: form.avatar || null,
      status: form.status || "available",
      location: form.location || null,
      capacity: parseInt(form.capacity, 10) || 100,
      allowed_equipment: form.allowed_equipment || [],
    };

    if (editItem) {
      // ── OPTIMISTIC EDIT ─────────────────────────────────────────────────
      const prevVenues = venues;
      setVenues(prev => prev.map(v => v.id === editItem.id ? { ...v, ...payload, _optimistic: true } : v));
      setShowModal(false);
      setEditItem(null);
      try {
        const res = await api.put(`/admin/venues/${editItem.id}`, payload);
        const saved = res.data || payload;
        setVenues(prev => prev.map(v => v.id === editItem.id ? { ...v, ...saved, _optimistic: false } : v));
        showMsg(`Venue "${form.name}" updated!`);
      } catch (err) {
        setVenues(prevVenues);
        setEditItem(editItem);
        setShowModal(true);
        const errorMsg =
          err.response?.data?.message ||
          (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(", ") : null) ||
          `Failed to update "${form.name}" — changes reverted.`;
        showMsg(errorMsg);
      } finally {
        setFormLoading(false);
      }
    } else {
      // ── OPTIMISTIC ADD ──────────────────────────────────────────────────
      const tempId = `temp-${Date.now()}`;
      const optimistic = { ...payload, id: tempId, _optimistic: true };
      const prevVenues = venues;
      setVenues(prev => [...prev, optimistic]);
      setShowModal(false);
      try {
        const res = await api.post("/admin/venues", payload);
        const saved = res.data;
        setVenues(prev => prev.map(v => v.id === tempId ? { ...saved, _optimistic: false } : v));
        showMsg(`Venue "${form.name}" created!`);
      } catch (err) {
        setVenues(prevVenues);
        setShowModal(true);
        const errorMsg =
          err.response?.data?.message ||
          (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(", ") : null) ||
          `Failed to create venue — changes reverted.`;
        showMsg(errorMsg);
      } finally {
        setFormLoading(false);
      }
    }
  };

  const handleDelete = (id, name) => {
    setArchiveTarget({ id, name });
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    const { id, name } = archiveTarget;
    const prevVenues = venues;
    setVenues(prev => prev.filter(v => v.id !== id));
    setArchiveTarget(null);
    try {
      await api.delete(`/admin/venues/${id}`);
      showMsg(`Venue "${name}" archived.`);
    } catch (err) {
      setVenues(prevVenues);
      showMsg(err.response?.data?.message || `Failed to archive "${name}" — changes reverted.`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            Venue Catalog Management
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Venues created in this catalog with avatars will be displayed directly in the public venue booking process.
          </p>
        </div>
        <button
          onClick={() => {
            setEditItem(null);
            setForm({
              name: "",
              avatar: "",
              status: "available",
              location: "",
              capacity: 100,
              allowed_equipment: [],
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer"
        >
          <Plus size={16} /> Create Venue
        </button>
      </div>

      {/* Table: [#, Avatar, Venue, Status, Action] */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Avatar", "Venue", "Status", "Action"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                    <span className="text-xs font-semibold italic">Loading venues catalog...</span>
                  </div>
                </td>
              </tr>
            ) : venues.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">
                  🏛️ No venues registered. Click "Create Venue" to add your first venue.
                </td>
              </tr>
            ) : (
              venues.map((v, idx) => (
                <tr key={v.id || idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
                      {v.avatar ? (
                        <img src={v.avatar} alt={v.name} className="w-full h-full object-contain p-0.5" />
                      ) : (
                        <Building size={20} className="text-slate-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 max-w-[240px]">
                    <span className="font-extrabold text-slate-900 text-sm block truncate" title={v.name}>{v.name}</span>
                    {v.location && <span className="text-[11px] text-slate-500 font-medium block truncate" title={`${v.location} (Capacity: ${v.capacity || 100})`}>{v.location} (Capacity: {v.capacity || 100})</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold capitalize border ${
                      v.status === 'maintenance' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                      v.status === 'decommissioned' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                      'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      {v.status || "available"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditItem(v);
                        setForm({
                          name: v.name || "",
                          avatar: v.avatar || "",
                          status: v.status || "available",
                          location: v.location || "",
                          capacity: v.capacity || 100,
                          allowed_equipment: Array.isArray(v.allowed_equipment)
                            ? v.allowed_equipment
                            : typeof v.allowed_equipment === "string"
                            ? (() => {
                                try { return JSON.parse(v.allowed_equipment); } catch { return []; }
                              })()
                            : [],
                        });
                        setShowModal(true);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                      title="Edit Venue"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(v.id, v.name)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Archive Venue"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {editItem ? "Edit Venue Catalog" : "Create New Venue Catalog"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Avatar Upload */}
              <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner shrink-0 relative">
                  {form.avatar ? (
                    <img src={form.avatar} alt="Preview" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Building size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block font-bold text-slate-900 text-xs mb-1">Venue Photo Avatar</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer shadow-2xs transition-all">
                      <Camera size={13} />
                      <span>{form.avatar ? "Change Photo" : "Upload Photo"}</span>
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                    {form.avatar && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, avatar: "" })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 font-bold text-xs cursor-pointer shadow-2xs transition-all"
                      >
                        <Trash2 size={12} />
                        Delete Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Venue Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AVR 1, Main Auditorium"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2nd Floor, Main Building"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 100"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-2">Allowed Equipment for this Venue (Optional)</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-40 overflow-y-auto grid grid-cols-2 gap-2">
                  {equipmentCatalog.map(eq => (
                    <label key={eq.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-blue-600 w-4 h-4"
                        checked={form.allowed_equipment.includes(eq.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, allowed_equipment: [...form.allowed_equipment, eq.id] });
                          } else {
                            setForm({ ...form, allowed_equipment: form.allowed_equipment.filter(id => id !== eq.id) });
                          }
                        }}
                      />
                      <span className="text-xs font-semibold text-slate-700">{eq.name}</span>
                    </label>
                  ))}
                  {equipmentCatalog.length === 0 && (
                    <span className="text-xs text-slate-500 italic col-span-2">No equipment catalog found.</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>{editItem ? "Save Changes" : "Save Venue Catalog"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
        variant="archive"
        title="Archive Venue?"
        message={`Are you sure you want to archive "${archiveTarget?.name}"? It will be removed from the public venue list.`}
        confirmLabel="Archive"
      />
    </div>
  );
}
