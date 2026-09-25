import { useState, useEffect } from "react";
import { Plus, Pencil, Ban, Power, CheckCircle2, X, Package, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight, Camera, MoreVertical, Send, HelpCircle } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ActionPopover from "@/components/ui/action-popover";
import IosToggle from "@/components/ui/ios-toggle";

export default function EquipmentCategoriesTab({ showMsg }) {
  const { isSuperAdmin, hasPermission, isStudentAssistant } = usePermissions();
  const canAdd = isSuperAdmin || hasPermission("settings.equipment") || hasPermission("settings.add") || hasPermission("manage_equipments.add");
  const canEdit = isSuperAdmin || hasPermission("settings.equipment") || hasPermission("settings.edit") || hasPermission("manage_equipments.edit");
  const canDisable = isSuperAdmin || hasPermission("settings.equipment") || hasPermission("settings.disable") || hasPermission("manage_equipments.disable");
  const canDirectEdit = canAdd;

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ proposed_name: "", reason: "" });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const [editItem, setEditItem] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);
  const [actionAnchorEl, setActionAnchorEl] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [disableTarget, setDisableTarget] = useState(null);

  const [previewScale, setPreviewScale] = useState(100);
  const [previewFit, setPreviewFit] = useState("contain");

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
    built_in_units: [],
  });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const catRes = await api.get("/general/equipment-types");
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
      built_in_units: [],
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
      built_in_units: Array.isArray(cat.built_in_units) ? cat.built_in_units.map(String) : [],
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
      built_in_units: form.built_in_units || [],
    };

    if (editItem) {
      // ── OPTIMISTIC EDIT ─────────────────────────────────────────────────
      const prevCats = categories;
      const updated = prevCats.map(c => c.id === editItem.id ? { ...c, ...payload } : c);
      setCategories(updated);
      setShowModal(false);

      try {
        const res = await api.put(`/general/equipment-types/${editItem.id}`, payload);
        const saved = res.data?.equipment_type || res.data;
        setCategories(prev => prev.map(c => c.id === editItem.id ? { ...c, ...saved } : c));
        try {
          localStorage.setItem("fsuu_equipment_types", JSON.stringify(updated));
        } catch {}
        window.dispatchEvent(new Event("equipment_updated"));
        notify.success("Category Updated", "Equipment category successfully updated.");
      } catch (err) {
        setCategories(prevCats);
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
        const res = await api.post("/general/equipment-types", payload);
        const actualCat = res.data?.equipment_type || res.data || newCatTemp;
        setCategories(prev => prev.map(c => c.id === tempId ? { ...actualCat, id: actualCat.id || tempId } : c));
        try {
          localStorage.setItem("fsuu_equipment_types", JSON.stringify(nextCats));
        } catch {}
        window.dispatchEvent(new Event("equipment_updated"));
        notify.success("Category Created", "New equipment category successfully registered.");
      } catch (err) {
        setCategories(categories);
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
      await api.put(`/general/equipment-types/${id}`, { status: newStatus });
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

  const handleCategoryRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestForm.proposed_name.trim()) return;

    setSubmittingRequest(true);
    try {
      await api.post("/general/category-requests", {
        proposed_name: requestForm.proposed_name.trim(),
        reason: requestForm.reason.trim(),
      });
      notify.success("Request Submitted", `Category request for "${requestForm.proposed_name}" sent to Super Admin for review.`);
      setShowRequestModal(false);
      setRequestForm({ proposed_name: "", reason: "" });
    } catch (err) {
      notify.error("Request Failed", err.response?.data?.message || "Failed to submit category request.");
    } finally {
      setSubmittingRequest(false);
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
            {canDirectEdit 
              ? "Manage equipment categories, photos, and inventory specifications."
              : "Active equipment categories directory. Propose a new category for Super Admin approval."}
          </p>
        </div>
        {canDirectEdit ? (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer transition-all"
          >
            <Plus size={16} /> Add Category
          </button>
        ) : (
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer transition-all"
          >
            <Send size={14} /> Request New Category
          </button>
        )}
      </div>

      {/* Table: [Photo, Category, Status, Action] */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-x-auto w-full">
        <table className="w-full text-xs text-left min-w-[600px]">
          <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-3.5 w-16">Photo</th>
              <th className="px-4 py-3.5">Category Name</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-slate-400 dark:text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-blue-600" />
                    <span>Loading equipment categories...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedCategories.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-slate-400 dark:text-slate-500">
                  📦 No equipment categories registered yet. Click "Add Category" to get started.
                </td>
              </tr>
            ) : (
              paginatedCategories.map((cat) => {
                const displayPhoto = cat.photo || cat.avatar;
                const isItemDisabled = cat.status === "disabled" || cat.status === "inactive" || cat.status === "unavailable";

                return (
                  <tr key={cat.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shadow-inner shrink-0">
                        {displayPhoto ? (
                          <img src={displayPhoto} alt={cat.eq_name || cat.name} className="w-full h-full object-contain p-0.5" />
                        ) : (
                          <Package size={18} className="text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-extrabold text-xs ${isItemDisabled ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                        {cat.eq_name || cat.name}
                      </div>
                      {Array.isArray(cat.built_in_units) && cat.built_in_units.length > 0 && (
                        <div className="mt-0.5">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                            {cat.built_in_units.length} Built-in
                          </span>
                        </div>
                      )}
                      {cat.description && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs">{cat.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10.5px] font-bold ${
                        !isItemDisabled
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      }`}>
                        {isItemDisabled && <Ban size={10} className="mr-1 text-rose-500 dark:text-rose-400/80" />}
                        {!isItemDisabled ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canDisable && (
                          <button
                            type="button"
                            onClick={() => {
                              setDisableTarget({ id: cat.id, name: cat.eq_name || cat.name, status: cat.status });
                            }}
                            className={`p-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                              !isItemDisabled
                                ? "text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100 dark:text-rose-400/80 dark:bg-rose-950/40 dark:border-rose-900/40 hover:dark:bg-rose-900/40 hover:dark:text-rose-300"
                                : "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:text-emerald-400/80 dark:bg-emerald-950/40 dark:border-emerald-900/40 hover:dark:bg-emerald-900/40 hover:dark:text-emerald-300"
                            }`}
                            title={isItemDisabled ? "Click to Enable Category" : "Click to Disable Category"}
                          >
                            {!isItemDisabled ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                          </button>
                        )}

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(cat)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-300 transition-all cursor-pointer shadow-2xs"
                            title="Edit Category"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {!canEdit && !canDisable && (
                          <span className="text-[10.5px] font-bold text-slate-400 italic">View Only</span>
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-[#111827] rounded-xl">
          <div>
            Showing <span className="font-mono font-bold text-slate-900 dark:text-white">{startIndex + 1}</span> to{" "}
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {Math.min(startIndex + ITEMS_PER_PAGE, categories.length)}
            </span> of{" "}
            <span className="font-mono font-bold text-slate-900 dark:text-white">{categories.length}</span> categories
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-mono font-bold text-slate-700 dark:text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Equipment Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-[1500] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-5 max-w-3xl w-full shadow-xl border border-slate-200 max-h-[90vh] flex flex-col my-auto space-y-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">
                  {editItem ? "Edit Equipment Category" : "Add Equipment Category"}
                </h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Configure equipment category specifications, photo representation, and built-in links.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                {/* Left Column: Form Details & Built-in Linkage */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Category Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Projector, Wireless Microphone, Sound System"
                      value={form.eq_name}
                      onChange={(e) => setForm({ ...form, eq_name: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-normal text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Description / Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Optional details or specifications for this equipment category..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-normal text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                    />
                  </div>

                  {/* Built-in Equipment Categories */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-700">Built-in</label>
                      {form.built_in_units?.length > 0 && (
                        <span className="text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          {form.built_in_units.length} {form.built_in_units.length === 1 ? 'Linked' : 'Linked'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-1.5 font-normal">
                      Select equipment categories built-in for this equipment category.
                    </p>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg max-h-44 overflow-y-auto space-y-1.5">
                      {categories
                        .filter((cat) => !editItem || String(cat.id) !== String(editItem.id))
                        .map((cat) => {
                          const catName = cat.eq_name || cat.name;
                          const catIdStr = String(cat.id);
                          const isChecked = (form.built_in_units || []).some(
                            (item) => String(item) === catIdStr || String(item).toLowerCase() === String(catName).toLowerCase()
                          );

                          return (
                            <div
                              key={cat.id}
                              className="flex items-center justify-between p-1.5 rounded-md bg-white border border-slate-200 hover:border-slate-300 transition-colors"
                            >
                              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 select-none">
                                <input
                                  type="checkbox"
                                  className="accent-blue-600 w-3.5 h-3.5 shrink-0 rounded cursor-pointer"
                                  checked={isChecked}
                                  onChange={() => {
                                    const next = isChecked
                                      ? (form.built_in_units || []).filter(
                                          (item) => String(item) !== catIdStr && String(item).toLowerCase() !== String(catName).toLowerCase()
                                        )
                                      : [...(form.built_in_units || []), cat.id];
                                    setForm({ ...form, built_in_units: next });
                                  }}
                                />
                                <span className="text-xs font-normal text-slate-800 truncate">
                                  {catName}
                                </span>
                              </label>
                            </div>
                          );
                        })}
                      {categories.filter((cat) => !editItem || String(cat.id) !== String(editItem.id)).length === 0 && (
                        <span className="text-xs text-slate-400 italic font-normal">No other equipment categories found.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Photo Upload & Card Preview */}
                <div className="space-y-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {(form.photo || form.avatar) ? (
                          <img src={form.photo || form.avatar} alt="Preview" className="w-full h-full object-contain p-1" />
                        ) : (
                          <Package size={20} className="text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="block font-medium text-slate-700 text-xs mb-1">Category Photo</label>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-normal text-xs cursor-pointer transition-all">
                            <Camera size={12} />
                            <span>{(form.photo || form.avatar) ? "Change Photo" : "Upload Photo"}</span>
                            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                          </label>
                          {(form.photo || form.avatar) && (
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, photo: "", avatar: "" })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-red-200 bg-white hover:bg-red-50 text-red-600 font-normal text-xs cursor-pointer transition-all"
                            >
                              <X size={12} />
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Live Public View Preview */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-slate-500">
                          Public View Card Preview
                        </span>
                        {/* Photo Resize & Fit Controls */}
                        {(form.photo || form.avatar) && (
                          <div className="flex items-center gap-1.5 bg-white p-0.5 rounded border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setPreviewFit((f) => (f === "contain" ? "cover" : "contain"))}
                              className="px-1.5 py-0.5 text-[10px] font-normal rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                              title="Toggle Fit (Contain / Cover)"
                            >
                              {previewFit === "contain" ? "Contain" : "Cover"}
                            </button>
                            <div className="flex items-center gap-1 border-l border-slate-200 pl-1">
                              <button
                                type="button"
                                onClick={() => setPreviewScale((s) => Math.max(50, s - 10))}
                                className="w-4 h-4 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                                title="Zoom out"
                              >
                                -
                              </button>
                              <span className="text-[10px] font-mono text-slate-600 w-6 text-center">
                                {previewScale}%
                              </span>
                              <button
                                type="button"
                                onClick={() => setPreviewScale((s) => Math.min(150, s + 10))}
                                className="w-4 h-4 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                                title="Zoom in"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="max-w-[200px] mx-auto border border-slate-200 rounded-lg p-2.5 bg-white">
                        <div className="w-full aspect-video bg-slate-50 border border-slate-100 rounded overflow-hidden flex items-center justify-center p-1">
                          {(form.photo || form.avatar) ? (
                            <div className="w-full h-full overflow-hidden flex items-center justify-center">
                              <img
                                src={form.photo || form.avatar}
                                alt="Public Preview"
                                className={`w-full h-full transition-transform duration-200 ${previewFit === "cover" ? "object-cover" : "object-contain"}`}
                                style={{ transform: `scale(${previewScale / 100})` }}
                              />
                            </div>
                          ) : (
                            <span className="text-[10px] font-normal text-slate-400">
                              {form.eq_name || "Preview"}
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <p className="font-medium text-xs text-slate-900 truncate">
                            {form.eq_name || "Equipment Name"}
                          </p>
                          <div className="mt-0.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-normal text-emerald-700 bg-emerald-50">
                              <span className="w-1 h-1 rounded-full bg-emerald-500" />
                              Public View
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-normal text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {formLoading && <Loader2 size={13} className="animate-spin" />}
                  <span>{editItem ? "Save Changes" : "Save"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Assistant / Staff Category Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Send size={15} className="text-blue-600" />
                  Request Equipment Category
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Propose a new equipment category to the Super Admin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCategoryRequestSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Proposed Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Presenter, HDMI Extender, Audio Mixer"
                  value={requestForm.proposed_name}
                  onChange={(e) => setRequestForm({ ...requestForm, proposed_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Reason / Operational Need
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this category is needed (e.g. new inventory arrival, requested by CAS department)..."
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-blue-600 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {submittingRequest && <Loader2 size={14} className="animate-spin" />}
                  <span>Submit Request</span>
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
