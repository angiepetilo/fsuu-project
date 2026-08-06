import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Package, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/axios";

export default function EquipmentCategoriesTab({ showMsg }) {
  const [categories, setCategories] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [form, setForm] = useState({
    eq_name: "",
    eq_type: "AV Equipment",
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
    setCurrentPage(1);
  }, [categories.length]);

  const totalPages = Math.ceil(categories.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCategories = categories.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

    try {
      if (editItem) {
        await api.put(`/admin/equipment-types/${editItem.id}`, payload);
        if (showMsg) showMsg(`✅ Equipment catalog item "${form.eq_name}" updated!`);
      } else {
        await api.post("/admin/equipment-types", payload);
        if (showMsg) showMsg(`✅ Equipment catalog item "${form.eq_name}" added to catalog!`);
      }
      setShowModal(false);
      setEditItem(null);
      fetchCategories();
      window.dispatchEvent(new Event("equipment_inventory_updated"));
    } catch {
      if (showMsg) showMsg("❌ Failed to save equipment catalog item.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (confirm(`Archive equipment category "${name}"? Soft-delete will apply.`)) {
      try {
        await api.delete(`/admin/equipment-types/${id}`);
        if (showMsg) showMsg(`✅ Equipment "${name}" archived (soft-deleted).`);
        fetchCategories();
        window.dispatchEvent(new Event("equipment_inventory_updated"));
      } catch {
        if (showMsg) showMsg("❌ Failed to archive equipment.");
      }
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
              total_quantity: 0,
              available_count: 0,
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

      {/* Equipment Catalog Table: [#, Avatar, Equipment Catalog, Overall Stock, Actions] */}
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
                    <Loader2 size={16} className="animate-spin text-blue-500" />
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
              paginatedCategories.map((cat, idx) => {
                const displayIndex = startIndex + idx + 1;
                return (
                  <tr key={cat.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-400">{displayIndex}</td>
                    <td className="px-4 py-3.5">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
                        {cat.avatar ? (
                          <img src={cat.avatar} alt={cat.eq_name} className="w-full h-full object-cover" />
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
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.eq_name || cat.name)}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Archive Category"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {categories.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 text-xs font-semibold text-slate-600">
          <div>
            Showing <span className="font-extrabold text-slate-900">{startIndex + 1}</span> to{" "}
            <span className="font-extrabold text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, categories.length)}</span> of{" "}
            <span className="font-extrabold text-slate-900">{categories.length}</span> catalog categories
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold mr-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Catalog Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Package size={18} className="text-blue-600" />
                {editItem ? "Edit Equipment Catalog Item" : "Add Equipment Catalog Item"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {/* Avatar Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Equipment Catalog Avatar</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner shrink-0">
                    {form.avatar ? (
                      <img src={form.avatar} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={24} className="text-slate-400" />
                    )}
                  </div>
                  <label className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all cursor-pointer flex items-center gap-2">
                    <ImageIcon size={14} /> Upload Avatar Image
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Equipment Catalog Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Microphone, HD Projector"
                  value={form.eq_name}
                  onChange={(e) => setForm({ ...form, eq_name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Category Type *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Audio, Video, Projection"
                    value={form.eq_type}
                    onChange={(e) => setForm({ ...form, eq_type: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Operating Office</label>
                  <select
                    value={form.office_id}
                    onChange={(e) => setForm({ ...form, office_id: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    {offices.map((off) => (
                      <option key={off.id} value={off.id}>{off.office_name || off.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Catalog specs or usage guidelines..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                />
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>{editItem ? "Save Changes" : "Add to Catalog"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
