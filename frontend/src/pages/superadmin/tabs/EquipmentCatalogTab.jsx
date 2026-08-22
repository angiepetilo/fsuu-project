import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Package, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, Camera } from "lucide-react";
import api from "@/lib/axios";

export default function EquipmentCatalogTab({ showMsg }) {
  const [categories, setCategories] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState({
    eq_name: "",
    eq_type: "",
    avatar: "",
    total_quantity: 0,
    available_count: 0,
    status: "available",
    office_id: "",
    description: "",
  });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const [catRes, offRes] = await Promise.all([
        api.get("/admin/equipment-types"),
        api.get("/admin/offices").catch(() => ({ data: [] })),
      ]);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setOffices(Array.isArray(offRes.data) ? offRes.data : []);
    } catch {
      const saved = JSON.parse(localStorage.getItem("fsuu_equipment_types") || "[]");
      setCategories(saved);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
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
      ...form,
      office_id: form.office_id ? parseInt(form.office_id, 10) : (offices[0]?.id || null),
      total_quantity: parseInt(form.total_quantity, 10) || 0,
      available_count: parseInt(form.available_count, 10) || 0,
      avatar: form.avatar || null,
      description: form.description || null,
    };

    if (editItem) {
      // ── OPTIMISTIC EDIT ─────────────────────────────────────────────────
      const prevCats = categories;
      setCategories(prev => prev.map(c => c.id === editItem.id ? { ...c, ...payload, _optimistic: true } : c));
      setShowModal(false);
      setEditItem(null);
      try {
        await api.put(`/admin/equipment-types/${editItem.id}`, payload);
        setCategories(prev => prev.map(c => c.id === editItem.id ? { ...c, _optimistic: false } : c));
        showMsg(`Equipment category "${form.eq_name}" updated!`);
      } catch (err) {
        setCategories(prevCats);
        setEditItem(editItem);
        setShowModal(true);
        showMsg("Failed to update — changes were reverted.");
      } finally {
        setFormLoading(false);
      }
    } else {
      // ── OPTIMISTIC ADD ──────────────────────────────────────────────────
      const tempId = `temp-${Date.now()}`;
      const optimistic = { ...payload, id: tempId, _optimistic: true };
      const prevCats = categories;
      setCategories(prev => [...prev, optimistic]);
      setShowModal(false);
      try {
        const res = await api.post("/admin/equipment-types", payload);
        const saved = res.data;
        setCategories(prev => prev.map(c => c.id === tempId ? { ...saved, _optimistic: false } : c));
        showMsg(`Equipment catalog item "${form.eq_name}" added!`);
      } catch (err) {
        setCategories(prevCats);
        setShowModal(true);
        showMsg("Failed to add — changes were reverted.");
      } finally {
        setFormLoading(false);
      }
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Archive equipment category "${name}"? Soft-delete will apply.`)) return;

    // ── OPTIMISTIC DELETE ─────────────────────────────────────────────────
    const prevCats = categories;
    setCategories(prev => prev.filter(c => c.id !== id));
    // ─────────────────────────────────────────────────────────────────────────

    try {
      await api.delete(`/admin/equipment-types/${id}`);
      showMsg(`Equipment "${name}" archived.`);
    } catch {
      setCategories(prevCats); // Rollback
      showMsg(`Failed to archive "${name}" — changes were reverted.`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Package size={18} className="text-blue-600" />
            Equipment Catalog Management
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Items created in this catalog with avatars will be displayed directly in the public equipment borrowing process.
          </p>
        </div>
        <button
          onClick={() => {
            setEditItem(null);
            setForm({
              eq_name: "",
              eq_type: "AV Equipment",
              avatar: "",
              total_quantity: 1,
              available_count: 1,
              status: "available",
              office_id: offices[0]?.id || "",
              description: "",
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer"
        >
          <Plus size={16} /> Add Equipment Catalog Item
        </button>
      </div>

      {/* Equipment Catalog Table: [#, Avatar, Equipment Catalog, Overall Stock, Action (edit and delete icon)] */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Avatar", "Equipment Catalog", "Overall Stock", "Actions"].map((h) => (
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
                    <span className="text-xs font-semibold italic">Loading catalog...</span>
                  </div>
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">
                  📦 No equipment categories registered. Click "Add Equipment Catalog Item" to start.
                </td>
              </tr>
            ) : (
              categories.map((cat, idx) => (
                <tr key={cat.id || idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
                      {cat.avatar ? (
                        <img src={cat.avatar} alt={cat.eq_name} className="w-full h-full object-contain p-0.5" />
                      ) : (
                        <Package size={20} className="text-slate-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-extrabold text-slate-900 text-sm block">{cat.eq_name || cat.name}</span>
                    <span className="text-[11px] text-blue-600 font-semibold">{cat.eq_type || "AV Equipment"}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-3 py-1 rounded-xl bg-slate-100 font-black text-slate-900 text-xs">
                      {cat.total_quantity ?? 0} Units
                    </span>
                  </td>
                  <td className="px-4 py-3.5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditItem(cat);
                        setForm({
                          eq_name: cat.eq_name || cat.name || "",
                          eq_type: cat.eq_type || "AV Equipment",
                          avatar: cat.avatar || "",
                          total_quantity: cat.total_quantity ?? cat.stock ?? 0,
                          available_count: cat.available_count ?? cat.stock ?? 0,
                          status: cat.status || "available",
                          office_id: cat.office_id || offices[0]?.id || "",
                          description: cat.description || "",
                        });
                        setShowModal(true);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                      title="Edit Catalog Item"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.eq_name || cat.name)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Archive Catalog Item"
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

      {/* Modal - Clean White Header */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Package size={18} className="text-blue-600" />
                {editItem ? "Edit Equipment Catalog Item" : "Add Equipment Catalog Item"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Avatar Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Equipment Catalog Avatar *</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                    {form.avatar ? (
                      <img src={form.avatar} alt="Preview" className="w-full h-full object-contain p-1" />
                    ) : (
                      <ImageIcon size={24} className="text-slate-400" />
                    )}
                  </div>
                  <div>
                    <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer">
                      <Camera size={14} />
                      <span>{form.avatar ? "Change Avatar" : "Upload Equipment Photo Avatar"}</span>
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                      This photo avatar will display directly in public equipment borrowing when users choose items.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Equipment Catalog Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Epson Digital Projector HD, Sony 4K Camera"
                  value={form.eq_name}
                  onChange={(e) => setForm({ ...form, eq_name: e.target.value, eq_type: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Catalog Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

