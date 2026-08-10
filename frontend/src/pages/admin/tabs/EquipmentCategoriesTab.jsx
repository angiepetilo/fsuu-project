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

      const rawCats = Array.isArray(catRes.data) ? catRes.data : [];
      let activeRelCount = 0;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("fsuu_assigned_units_")) {
            const v = localStorage.getItem(k);
            if (v) {
              const obj = JSON.parse(v);
              Object.values(obj).forEach(bCode => { if (bCode) activeRelCount++; });
            }
          }
        }
      } catch {}

      setCategories(rawCats.map(c => ({
        ...c,
        released_count: c.released_count ?? (activeRelCount > 0 ? activeRelCount : 0),
      })));
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
        if (showMsg) showMsg(`Equipment catalog item "${form.eq_name}" updated!`);
      } else {
        await api.post("/admin/equipment-types", payload);
        if (showMsg) showMsg(`Equipment catalog item "${form.eq_name}" added to catalog!`);
      }
      setShowModal(false);
      setEditItem(null);
      fetchCategories();
      window.dispatchEvent(new Event("equipment_inventory_updated"));
    } catch {
      if (showMsg) showMsg("Failed to save equipment catalog item.", true);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (confirm(`Archive equipment category "${name}"? Soft-delete will apply.`)) {
      try {
        await api.delete(`/admin/equipment-types/${id}`);
        if (showMsg) showMsg(`Equipment "${name}" archived.`);
        fetchCategories();
        window.dispatchEvent(new Event("equipment_inventory_updated"));
      } catch {
        if (showMsg) showMsg("Failed to archive equipment.", true);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm">
            Manage Equipment Catalog
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Configure catalog gear, total quantities, and avatars for borrowing.
          </p>
        </div>
        <button
          type="button"
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
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-900 text-slate-900 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
        >
          <Plus size={14} /> Add Category
        </button>
      </div>

      {/* Equipment Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              {["#", "Avatar", "Equipment Catalog", "Overall Stock", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400 font-medium">
                  <Loader2 size={16} className="animate-spin inline mr-2 text-slate-600" /> Loading catalog...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400 font-medium">
                  No equipment categories registered. Click "Add Category" to start.
                </td>
              </tr>
            ) : (
              paginatedCategories.map((cat, idx) => {
                const displayIndex = startIndex + idx + 1;
                const total = cat.total_quantity ?? 0;
                const released = cat.released_count || 0;
                const damaged = cat.damaged_count || 0;
                const lost = cat.lost_count || 0;
                const available = Math.max(0, total - released - damaged - lost);

                return (
                  <tr key={cat.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-400">{displayIndex}</td>
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center">
                        {cat.avatar ? (
                          <img src={cat.avatar} alt={cat.eq_name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={16} className="text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-extrabold text-slate-900 text-xs block">{cat.eq_name || cat.name}</span>
                      <span className="text-[10.5px] text-slate-500 font-mono">{cat.eq_type || "AV Equipment"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-slate-700">Total: <b>{total}</b></span>
                        <span className="text-emerald-600 font-bold">● {available} Available</span>
                        {released > 0 && <span className="text-blue-600 font-bold">● {released} Released</span>}
                        {damaged > 0 && <span className="text-rose-600 font-bold">● {damaged} Damaged</span>}
                        {lost > 0 && <span className="text-amber-600 font-bold">● {lost} Lost</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
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
                          className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                          title="Edit Item"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.id, cat.eq_name || cat.name)}
                          className="p-1.5 rounded-lg border border-slate-300 text-rose-600 hover:bg-rose-50 transition-all cursor-pointer shadow-2xs"
                          title="Archive Category"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {categories.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-xs font-semibold text-slate-600 bg-white rounded-xl">
          <div>
            Showing <span className="font-mono font-bold text-slate-900">{startIndex + 1}</span> to{" "}
            <span className="font-mono font-bold text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, categories.length)}</span> of{" "}
            <span className="font-mono font-bold text-slate-900">{categories.length}</span> categories
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono text-xs mr-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
            >
              <ChevronLeft size={13} /> Previous
            </button>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {editItem ? "Edit Equipment Category" : "Add Equipment Category"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-900 mb-1">Equipment Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Microphone"
                  value={form.eq_name}
                  onChange={(e) => setForm({ ...form, eq_name: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Category Type *</label>
                  <select
                    value={form.eq_type}
                    onChange={(e) => setForm({ ...form, eq_type: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer"
                  >
                    <option value="AV Equipment">AV Equipment</option>
                    <option value="Audio Equipment">Audio Equipment</option>
                    <option value="Visual Equipment">Visual Equipment</option>
                    <option value="Peripherals">Peripherals</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">Total Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.total_quantity}
                    onChange={(e) => setForm({ ...form, total_quantity: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">Upload Photo</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-300 overflow-hidden flex items-center justify-center">
                    {form.avatar ? (
                      <img src={form.avatar} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={18} className="text-slate-400" />
                    )}
                  </div>
                  <label className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold cursor-pointer transition-all shadow-2xs">
                    Choose Photo
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2 rounded-xl border border-slate-900 bg-white text-slate-900 hover:bg-slate-50 font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {formLoading && <Loader2 size={13} className="animate-spin" />}
                  {editItem ? "Save Changes" : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
