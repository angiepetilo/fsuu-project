import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Package, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight, Camera, MoreVertical } from "lucide-react";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import { useAuth } from "@/context/AuthContext";

export default function EquipmentCategoriesTab({ showMsg }) {
  const { user } = useAuth();
  const userOfficeId = user?.office_id ?? user?.office?.id ?? null;

  const [categories, setCategories] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.action-menu-container')) {
        setOpenActionId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

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
      setCategories(rawCats);
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

  const handleOpenAddModal = () => {
    setEditItem(null);
    setForm({
      eq_name: "",
      eq_type: "AV Equipment",
      avatar: "",
      total_quantity: 0,
      available_count: 0,
      status: "available",
      office_id: offices[0]?.id || userOfficeId || "",
      description: "",
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (cat) => {
    setEditItem(cat);
    setForm({
      eq_name: cat.eq_name || cat.name || "",
      eq_type: cat.eq_type || "AV Equipment",
      avatar: cat.avatar || "",
      total_quantity: cat.total_quantity || 0,
      available_count: cat.available_count || 0,
      status: cat.status || "available",
      office_id: cat.office_id || offices[0]?.id || userOfficeId || "",
      description: cat.description || "",
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    const resolvedOfficeId = form.office_id || offices[0]?.id || userOfficeId;

    const payload = {
      ...form,
      eq_type: form.eq_type || "AV Equipment",
      office_id: resolvedOfficeId ? parseInt(resolvedOfficeId, 10) : null,
      total_quantity: parseInt(form.total_quantity, 10) || 0,
      available_count: parseInt(form.available_count, 10) || 0,
      avatar: form.avatar || null,
      description: form.description || null,
    };

    try {
      if (editItem) {
        await api.put(`/admin/equipment-types/${editItem.id}`, payload);
        notify.success("Category Updated", `Equipment category "${form.eq_name}" updated successfully.`);
      } else {
        await api.post("/admin/equipment-types", payload);
        notify.success("Category Created", `Equipment category "${form.eq_name}" created successfully.`);
      }
      setShowModal(false);
      setEditItem(null);
      fetchCategories();
      window.dispatchEvent(new Event("equipment_inventory_updated"));
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save equipment category.";
      notify.error("Category Save Failed", msg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (confirm(`Archive equipment category "${name}"? Soft-delete will apply.`)) {
      try {
        await api.delete(`/admin/equipment-types/${id}`);
        notify.error("Category Archived", `Equipment category "${name}" has been archived.`);
        fetchCategories();
        window.dispatchEvent(new Event("equipment_inventory_updated"));
      } catch {
        notify.error("Archive Failed", "Failed to archive equipment category.");
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            Equipment Categories
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Create and manage equipment category classifications and inventory records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add Equipment Category
          </button>
        </div>
      </div>

      {/* Equipment Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              {["#", "Avatar", "Equipment Category", "Total Stock", "Qty Present", "Reserved", "Released", "Damaged", "Lost", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-10 text-slate-400 font-medium">
                  <Loader2 size={16} className="animate-spin inline mr-2 text-slate-600" /> Loading catalog...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-10 text-slate-400 font-medium">
                  No equipment categories registered.
                </td>
              </tr>
            ) : (
              paginatedCategories.map((cat, idx) => {
                const displayIndex = startIndex + idx + 1;
                const total = cat.total_quantity ?? 0;
                const released = cat.released_count || 0;
                const damaged = cat.damaged_count || 0;
                const lost = cat.lost_count || 0;
                const reserved = cat.reserved_count || cat.reserved || 0;
                const available = typeof cat.available_count === "number" ? cat.available_count : Math.max(0, total - released - damaged - lost);

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
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-xs truncate" title={cat.eq_name || cat.name}>{cat.eq_name || cat.name}</span>
                      </div>
                      <span className="text-[10.5px] text-slate-500 font-mono truncate block" title={cat.eq_type || "AV Equipment"}>{cat.eq_type || "AV Equipment"}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {total}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-extrabold text-emerald-700">
                      <span className="bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center">
                        {available}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">
                      <span className={`px-2.5 py-1 rounded-lg border inline-flex items-center ${
                        reserved > 0 ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold" : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}>
                        {reserved}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">
                      <span className={`px-2.5 py-1 rounded-lg border inline-flex items-center ${
                        released > 0 ? "bg-blue-50 border-blue-200 text-blue-700 font-extrabold" : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}>
                        {released}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-700">
                      <span className={`px-2.5 py-1 rounded-lg border inline-flex items-center ${
                        damaged > 0 ? "bg-rose-50 border-rose-200 text-rose-700 font-extrabold" : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}>
                        {damaged}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-700">
                      <span className={`px-2.5 py-1 rounded-lg border inline-flex items-center ${
                        lost > 0 ? "bg-amber-50 border-amber-200 text-amber-700 font-extrabold" : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}>
                        {lost}
                      </span>
                    </td>
                    <td className="px-4 py-3 relative">
                      <div className="relative action-menu-container inline-block">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionId(openActionId === cat.id ? null : cat.id);
                          }}
                          className={`p-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                            openActionId === cat.id
                              ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                          title="Actions"
                        >
                          <MoreVertical size={15} />
                        </button>

                        {openActionId === cat.id && (
                          <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 z-40 animate-in fade-in zoom-in-95 backdrop-blur-md">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionId(null);
                                handleOpenEditModal(cat);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Pencil size={13} className="text-blue-500" />
                              <span>Edit Category</span>
                            </button>

                            <div className="border-t border-slate-100 my-1"></div>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionId(null);
                                handleDelete(cat.id, cat.eq_name || cat.name);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} className="text-rose-500" />
                              <span>Archive Category</span>
                            </button>
                          </div>
                        )}
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
            <span className="font-mono font-bold text-slate-900">
              {Math.min(startIndex + ITEMS_PER_PAGE, categories.length)}
            </span> of{" "}
            <span className="font-mono font-bold text-slate-900">
              {categories.length}
            </span> categories
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

      {/* Equipment Category Modal - Unified Clean Design */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {editItem ? "Edit Equipment Category" : "Add Equipment Category"}
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
                    <img src={form.avatar} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Package size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block font-bold text-slate-900 text-xs mb-1">Category Photo Avatar</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer shadow-2xs transition-all">
                    <Camera size={13} />
                    <span>{form.avatar ? "Change Photo" : "Upload Photo"}</span>
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Projector, Wireless Microphone, Sound System"
                  value={form.eq_name}
                  onChange={(e) => setForm({ ...form, eq_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional details or specifications for this equipment category..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>{editItem ? "Save Changes" : "Save Equipment Category"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
