import { useState, useEffect } from "react";
import { Plus, Pencil, Ban, X, Package, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight, Camera, MoreVertical, Trash2 } from "lucide-react";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function EquipmentCategoriesTab({ showMsg }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [disableTarget, setDisableTarget] = useState(null);

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
    photo: "",
    avatar: "",
    total_quantity: 0,
    available_count: 0,
    status: "available",
    description: "",
  });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const catRes = await api.get("/admin/equipment-types");
      const rawCats = Array.isArray(catRes.data) ? catRes.data : [];
      setCategories(rawCats);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [categories.length]);

  const totalPages = Math.ceil(categories.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCategories = categories.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, photo: reader.result, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddModal = () => {
    setEditItem(null);
    setForm({
      eq_name: "",
      eq_type: "AV Equipment",
      photo: "",
      avatar: "",
      total_quantity: 0,
      available_count: 0,
      status: "available",
      description: "",
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (cat) => {
    setEditItem(cat);
    const photoVal = cat.photo || cat.avatar || "";
    setForm({
      eq_name: cat.eq_name || cat.name || cat.equipment_types_name || "",
      eq_type: cat.eq_type || "AV Equipment",
      photo: photoVal,
      avatar: photoVal,
      total_quantity: cat.total_quantity || 0,
      available_count: cat.available_count || 0,
      status: cat.status || "available",
      description: cat.description || "",
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.eq_name.trim()) return;

    setFormLoading(true);
    const photoData = form.photo || form.avatar;
    const payload = {
      eq_name: form.eq_name.trim(),
      name: form.eq_name.trim(),
      equipment_types_name: form.eq_name.trim(),
      eq_type: form.eq_type,
      photo: photoData,
      avatar: photoData,
      description: form.description,
      status: form.status || "available",
    };

    if (editItem) {
      // ── OPTIMISTIC EDIT ─────────────────────────────────────────────────
      const prevCats = categories;
      const updated = prevCats.map(c => c.id === editItem.id ? { ...c, ...payload } : c);
      setCategories(updated);
      setShowModal(false);

      try {
        const res = await api.put(`/admin/equipment-types/${editItem.id}`, payload);
        const saved = res.data?.equipment_type || res.data;
        setCategories(prev => prev.map(c => c.id === editItem.id ? { ...c, ...saved } : c));
        try {
          localStorage.setItem("fsuu_equipment_types", JSON.stringify(updated));
        } catch {}
        window.dispatchEvent(new Event("equipment_updated"));
        if (showMsg) showMsg("Equipment category updated.");
        notify.success("Category Updated", "Equipment category successfully updated.");
      } catch (err) {
        setCategories(prevCats);
        if (showMsg) showMsg(err.response?.data?.message || "Failed to update category — reverted.");
        notify.error("Update Failed", err.response?.data?.message || "Failed to update category.");
      } finally {
        setFormLoading(false);
      }
    } else {
      // ── OPTIMISTIC CREATE ────────────────────────────────────────────────
      const tempId = Date.now();
      const newCatTemp = { id: tempId, ...payload, total_quantity: 0, available_count: 0, created_at: new Date().toISOString() };
      const nextCats = [newCatTemp, ...categories];
      setCategories(nextCats);
      setShowModal(false);

      try {
        const res = await api.post("/admin/equipment-types", payload);
        const actualCat = res.data?.equipment_type || res.data || newCatTemp;
        setCategories(prev => prev.map(c => c.id === tempId ? { ...actualCat, id: actualCat.id || tempId } : c));
        try {
          localStorage.setItem("fsuu_equipment_types", JSON.stringify(nextCats));
        } catch {}
        window.dispatchEvent(new Event("equipment_updated"));
        if (showMsg) showMsg("Equipment category created.");
        notify.success("Category Created", "New equipment category successfully registered.");
      } catch (err) {
        setCategories(categories);
        if (showMsg) showMsg(err.response?.data?.message || "Failed to create category — reverted.");
        notify.error("Creation Failed", err.response?.data?.message || "Failed to create category.");
      } finally {
        setFormLoading(false);
      }
    }
  };

  const confirmToggleDisable = async () => {
    if (!disableTarget) return;
    const { id, name, status } = disableTarget;
    const isCurrentlyDisabled = status === "disabled" || status === "inactive" || status === "unavailable";
    const newStatus = isCurrentlyDisabled ? "available" : "disabled";

    const prevCats = categories;
    const updated = prevCats.map(c => c.id === id ? { ...c, status: newStatus } : c);
    setCategories(updated);
    setDisableTarget(null);

    try {
      await api.put(`/admin/equipment-types/${id}`, { status: newStatus });
      try {
        localStorage.setItem("fsuu_equipment_types", JSON.stringify(updated));
      } catch {}
      window.dispatchEvent(new Event("equipment_updated"));
      notify.success("Category Updated", `Equipment category "${name}" has been ${isCurrentlyDisabled ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setCategories(prevCats);
      notify.error("Action Failed", err.response?.data?.message || `Failed to update "${name}".`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            Equipment Category
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Manage equipment categories, photos, and inventory specifications.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer transition-all"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Table: [Photo, Category, Total, Available, Reserved, Released, Damaged, Lost, Action] */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-visible">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-3.5 w-16">Photo</th>
              <th className="px-4 py-3.5">Category Name</th>
              <th className="px-4 py-3.5">Total</th>
              <th className="px-4 py-3.5">Available</th>
              <th className="px-4 py-3.5">Reserved</th>
              <th className="px-4 py-3.5">Released</th>
              <th className="px-4 py-3.5">Damaged</th>
              <th className="px-4 py-3.5">Lost</th>
              <th className="px-4 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-10 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-blue-600" />
                    <span>Loading equipment categories...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedCategories.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-10 text-slate-400">
                  📦 No equipment categories registered yet. Click "Add Category" to get started.
                </td>
              </tr>
            ) : (
              paginatedCategories.map((cat, idx) => {
                const total = cat.total_quantity ?? cat.total_units ?? 0;
                const available = cat.available_count ?? total;
                const reserved = cat.reserved_count ?? 0;
                const released = cat.released_count ?? 0;
                const damaged = cat.damaged_count ?? 0;
                const lost = cat.lost_count ?? 0;
                const isNearBottom = idx >= Math.max(1, paginatedCategories.length - 2);
                const isOpen = openActionId === cat.id;
                const displayPhoto = cat.photo || cat.avatar;
                const isItemDisabled = cat.status === "disabled" || cat.status === "inactive" || cat.status === "unavailable";

                return (
                  <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner shrink-0">
                        {displayPhoto ? (
                          <img src={displayPhoto} alt={cat.eq_name || cat.name} className="w-full h-full object-contain p-0.5" />
                        ) : (
                          <Package size={18} className="text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-extrabold text-xs ${isItemDisabled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {cat.eq_name || cat.name}
                      </div>
                      {cat.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{cat.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 inline-flex items-center">
                        {total}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 inline-flex items-center">
                        {available}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">
                      <span className={`px-2 py-0.5 rounded-lg border inline-flex items-center ${
                        reserved > 0 ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold" : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}>
                        {reserved}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">
                      <span className={`px-2 py-0.5 rounded-lg border inline-flex items-center ${
                        released > 0 ? "bg-blue-50 border-blue-200 text-blue-700 font-extrabold" : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}>
                        {released}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-700">
                      <span className={`px-2 py-0.5 rounded-lg border inline-flex items-center ${
                        damaged > 0 ? "bg-rose-50 border-rose-200 text-rose-700 font-extrabold" : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}>
                        {damaged}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-700">
                      <span className={`px-2 py-0.5 rounded-lg border inline-flex items-center ${
                        lost > 0 ? "bg-amber-50 border-amber-200 text-amber-700 font-extrabold" : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}>
                        {lost}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right relative">
                      <div className="relative action-menu-container inline-block">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionId(openActionId === cat.id ? null : cat.id);
                          }}
                          className={`p-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                            isOpen
                              ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                          title="Actions"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {isOpen && (
                          <div className={`absolute right-0 ${isNearBottom ? "bottom-full mb-1.5" : "top-full mt-1.5"} w-48 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 z-[9999] animate-in fade-in zoom-in-95 backdrop-blur-md text-left`}>
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
                                setDisableTarget({ id: cat.id, name: cat.eq_name || cat.name, status: cat.status });
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Ban size={13} className="text-rose-500" />
                              <span>{isItemDisabled ? "Enable Category" : "Disable Category"}</span>
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
            <span className="font-mono font-bold text-slate-900">{categories.length}</span> categories
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-mono font-bold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Equipment Category Modal */}
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
              {/* Photo Upload */}
              <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner shrink-0 relative">
                  {(form.photo || form.avatar) ? (
                    <img src={form.photo || form.avatar} alt="Preview" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Package size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block font-bold text-slate-900 text-xs mb-1">Category Photo</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer shadow-2xs transition-all">
                      <Camera size={13} />
                      <span>{(form.photo || form.avatar) ? "Change Photo" : "Upload Photo"}</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                    {(form.photo || form.avatar) && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, photo: "", avatar: "" })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 font-bold text-xs cursor-pointer shadow-2xs transition-all"
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    )}
                  </div>
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>{editItem ? "Save Changes" : "Save"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!disableTarget}
        onClose={() => setDisableTarget(null)}
        onConfirm={confirmToggleDisable}
        title={disableTarget?.status === "disabled" ? "Enable Equipment Category" : "Disable Equipment Category"}
        message={`Are you sure you want to ${disableTarget?.status === "disabled" ? 'enable' : 'disable'} category "${disableTarget?.name}"?`}
        confirmText={disableTarget?.status === "disabled" ? "Enable" : "Disable"}
        variant={disableTarget?.status === "disabled" ? "primary" : "danger"}
      />
    </div>
  );
}
