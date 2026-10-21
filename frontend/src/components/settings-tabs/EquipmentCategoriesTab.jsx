import { useState, useEffect } from "react";
import { Plus, Pencil, Ban, Power, CheckCircle2, X, Package, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight, Camera, MoreVertical, Send, HelpCircle, AlertCircle, Eye, EyeOff, Trash2, Layers } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import api, { clearApiCache } from "@/lib/axios";
import { invalidateCache } from "@/lib/apiCache";
import { resolveStorageUrl } from "@/lib/utils";
import notify from "@/lib/notify";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ActionPopover from "@/components/ui/action-popover";
import IosToggle from "@/components/ui/ios-toggle";
import CategoryChecklistSelector from "@/components/ui/CategoryChecklistSelector";

export default function EquipmentCategoriesTab({ showMsg }) {
  const { isSuperAdmin, hasPermission, isStudentAssistant } = usePermissions();
  const canAdd = isSuperAdmin || hasPermission("settings.equipment") || hasPermission("settings.add") || hasPermission("manage_equipments.add");
  const canEdit = isSuperAdmin || hasPermission("settings.equipment") || hasPermission("settings.edit") || hasPermission("manage_equipments.edit");
  const canDisable = isSuperAdmin || hasPermission("settings.equipment") || hasPermission("settings.disable") || hasPermission("manage_equipments.disable");
  const canDelete = isSuperAdmin || hasPermission("settings.equipment") || hasPermission("settings.delete") || hasPermission("manage_equipments.delete");
  const canDirectEdit = canAdd;

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingPublicId, setTogglingPublicId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ proposed_name: "", reason: "" });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const handleRequestClose = () => {
    if (isFormDirty) {
      setShowDiscardModal(true);
    } else {
      setShowModal(false);
    }
  };

  const updateForm = (val) => {
    setIsFormDirty(true);
    setForm(val);
  };

  const [editItem, setEditItem] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);
  const [actionAnchorEl, setActionAnchorEl] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [disableTarget, setDisableTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [deleting, setDeleting] = useState(false);

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
    is_public: true,
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
      updateForm((prev) => ({ ...prev, photo: reader.result, avatar: reader.result }));
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
      is_public: true,
      description: "",
      built_in_units: [],
    });
    setPreviewFit("contain");
    setPreviewScale(100);
    setFormError("");
    setIsFormDirty(false);
    setShowModal(true);
  };

  const handleOpenEditModal = (cat) => {
    setEditItem(cat);
    const photoVal = cat.photo || cat.avatar || "";
    setPreviewFit(cat.photo_fit || "contain");
    setPreviewScale(cat.photo_scale ? Number(cat.photo_scale) : 100);
    setForm({
      eq_name: cat.eq_name || cat.name || cat.equipment_types_name || "",
      eq_type: cat.eq_type || "AV Equipment",
      photo: photoVal,
      avatar: photoVal,
      total_quantity: cat.total_quantity || 0,
      available_count: cat.available_count || 0,
      status: cat.status || "available",
      is_public: cat.is_public !== undefined ? Boolean(cat.is_public) : true,
      description: cat.description || "",
      built_in_units: Array.isArray(cat.built_in_units) ? cat.built_in_units.map(String) : [],
    });
    setFormError("");
    setIsFormDirty(false);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.eq_name.trim()) return;

    setFormLoading(true);
    setFormError("");
    const photoData = form.photo || form.avatar;
    const payload = {
      eq_name: form.eq_name.trim(),
      name: form.eq_name.trim(),
      equipment_types_name: form.eq_name.trim(),
      eq_type: form.eq_type,
      photo: photoData,
      avatar: photoData,
      photo_fit: previewFit,
      photo_scale: previewScale,
      description: form.description,
      status: form.status || "available",
      is_public: form.is_public !== undefined ? Boolean(form.is_public) : true,
      built_in_units: form.built_in_units || [],
    };

    if (editItem) {
      try {
        const res = await api.put(`/general/equipment-types/${editItem.id}`, payload);
        const saved = res.data?.equipment_type || res.data;
        const updated = categories.map(c => c.id === editItem.id ? { ...c, ...saved } : c);
        setCategories(updated);
        try {
          localStorage.setItem("fsuu_equipment_types", JSON.stringify(updated));
          localStorage.setItem("fsuu_equipment_updated_ping", Date.now().toString());
          localStorage.setItem("fsuu_category_updated_ping", Date.now().toString());
        } catch {}
        invalidateCache("equipment_types_list");
        clearApiCache();
        window.dispatchEvent(new Event("equipment_updated"));
        window.dispatchEvent(new Event("equipment_categories_updated"));
        notify.success("Category Updated", "Equipment category successfully updated.");
        setIsFormDirty(false);
        setShowModal(false);
      } catch (err) {
        const errMsg = err.response?.data?.errors?.eq_name?.[0] || err.response?.data?.message || "Failed to update category.";
        setFormError(errMsg);
      } finally {
        setFormLoading(false);
      }
    } else {
      try {
        const res = await api.post("/general/equipment-types", payload);
        const actualCat = res.data?.equipment_type || res.data;
        const nextCats = [actualCat, ...categories];
        setCategories(nextCats);
        try {
          localStorage.setItem("fsuu_equipment_types", JSON.stringify(nextCats));
          localStorage.setItem("fsuu_equipment_updated_ping", Date.now().toString());
          localStorage.setItem("fsuu_category_updated_ping", Date.now().toString());
        } catch {}
        invalidateCache("equipment_types_list");
        clearApiCache();
        window.dispatchEvent(new Event("equipment_updated"));
        window.dispatchEvent(new Event("equipment_categories_updated"));
        notify.success("Category Created", "New equipment category successfully registered.");
        setIsFormDirty(false);
        setShowModal(false);
      } catch (err) {
        const errMsg = err.response?.data?.errors?.eq_name?.[0] || err.response?.data?.message || "Failed to create category.";
        setFormError(errMsg);
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
        localStorage.setItem("fsuu_equipment_updated_ping", Date.now().toString());
        localStorage.setItem("fsuu_category_updated_ping", Date.now().toString());
      } catch {}
      invalidateCache("equipment_types_list");
      clearApiCache();
      window.dispatchEvent(new Event("equipment_updated"));
      window.dispatchEvent(new Event("equipment_categories_updated"));
      notify.success("Category Updated", `Equipment category "${name}" has been ${isCurrentlyDisabled ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setCategories(prevCats);
      notify.error("Action Failed", err.response?.data?.message || `Failed to update "${name}".`);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/general/equipment-types/${deleteTarget.id}`);
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      clearApiCache();
      invalidateCache("equipment_types");
      invalidateCache("equipment_types_list");
      window.dispatchEvent(new Event("equipment_updated"));
      window.dispatchEvent(new Event("equipment_categories_updated"));
      notify.success("Category Deleted", `Category "${deleteTarget.name}" has been deleted successfully.`);
      setDeleteTarget(null);
    } catch (err) {
      notify.error("Cannot Delete", err.response?.data?.message || `Failed to delete category "${deleteTarget.name}".`);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const togglePublicVisibility = async (cat) => {
    if (!canEdit) return;
    const catId = cat.id;
    const currentVal = cat.is_public !== undefined ? Boolean(cat.is_public) : true;
    const nextVal = !currentVal;
    const catName = cat.eq_name || cat.name;

    const prevCats = categories;
    const updated = prevCats.map(c => c.id === catId ? { ...c, is_public: nextVal } : c);
    setCategories(updated);
    setTogglingPublicId(catId);

    try {
      await api.put(`/general/equipment-types/${catId}`, { is_public: nextVal });
      try {
        localStorage.setItem("fsuu_equipment_types", JSON.stringify(updated));
        localStorage.setItem("fsuu_equipment_updated_ping", Date.now().toString());
        localStorage.setItem("fsuu_category_updated_ping", Date.now().toString());
      } catch {}
      invalidateCache("equipment_types_list");
      clearApiCache();
      window.dispatchEvent(new Event("equipment_updated"));
      window.dispatchEvent(new Event("equipment_inventory_updated"));
      window.dispatchEvent(new Event("equipment_categories_updated"));
      notify.success(
        nextVal ? "Category Visible in Public" : "Category Hidden from Public",
        `"${catName}" will ${nextVal ? 'now appear' : 'no longer appear'} on the public equipment borrowing catalog.`
      );
    } catch (err) {
      setCategories(prevCats);
      notify.error("Update Failed", err.response?.data?.message || "Could not update public view visibility.");
    } finally {
      setTogglingPublicId(null);
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

      {/* Table: [Photo, Category, Public View, Status, Action] */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-x-auto w-full">
        <table className="w-full text-xs text-left min-w-[650px]">
          <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-3.5 w-16">Photo</th>
              <th className="px-4 py-3.5">Category Name</th>
              <th className="px-4 py-3.5 text-center w-32">Public View</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right w-24">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400 dark:text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-blue-600" />
                    <span>Loading equipment categories...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedCategories.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400 dark:text-slate-500">
                  📦 No equipment categories registered yet. Click "Add Category" to get started.
                </td>
              </tr>
            ) : (
              paginatedCategories.map((cat) => {
                const rawPhoto = cat.photo || cat.avatar;
                const resolved = resolveStorageUrl(rawPhoto) || rawPhoto;
                const displayPhoto = resolved && !resolved.startsWith("data:")
                  ? `${resolved}${resolved.includes("?") ? "&" : "?"}v=${cat.updated_at ? new Date(cat.updated_at).getTime() : "1"}`
                  : resolved;
                const isItemDisabled = cat.status === "disabled" || cat.status === "inactive" || cat.status === "unavailable";
                const isPublic = cat.is_public !== undefined ? Boolean(cat.is_public) : true;
                const isToggling = togglingPublicId === cat.id;

                return (
                  <tr key={cat.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shadow-inner shrink-0">
                        {displayPhoto ? (
                          <img
                            src={displayPhoto}
                            alt={cat.eq_name || cat.name}
                            className="w-full h-full object-contain p-0.5"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
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
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <label 
                        onClick={(e) => e.stopPropagation()} 
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all select-none ${
                          canEdit 
                            ? 'cursor-pointer hover:shadow-xs' 
                            : 'cursor-not-allowed opacity-80'
                        } ${
                          isPublic
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                        title={
                          canEdit
                            ? (isPublic ? "Click to Hide from Public Equipment Borrowing" : "Click to Show in Public Equipment Borrowing")
                            : "Public visibility status"
                        }
                      >
                        {isToggling ? (
                          <Loader2 size={13} className="animate-spin text-blue-600" />
                        ) : (
                          <input
                            type="checkbox"
                            checked={isPublic}
                            disabled={!canEdit || isToggling}
                            onChange={() => togglePublicVisibility(cat)}
                            className="accent-blue-600 w-3.5 h-3.5 rounded cursor-pointer shrink-0"
                          />
                        )}
                        <span className="text-[11px] font-bold">
                          {isPublic ? "Visible" : "Hidden"}
                        </span>
                      </label>
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
                    <td className="px-4 py-3 text-right w-24">
                      {canEdit || canDisable || canDelete ? (
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openActionId === cat.id) {
                                setOpenActionId(null);
                                setActionAnchorEl(null);
                              } else {
                                setOpenActionId(cat.id);
                                setActionAnchorEl(e.currentTarget);
                              }
                            }}
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                              openActionId === cat.id
                                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                            }`}
                            title="Actions"
                          >
                            <MoreVertical size={14} />
                          </button>

                          <ActionPopover
                            isOpen={openActionId === cat.id}
                            anchorEl={actionAnchorEl}
                            onClose={() => {
                              setOpenActionId(null);
                              setActionAnchorEl(null);
                            }}
                            width={160}
                          >
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  setActionAnchorEl(null);
                                  handleOpenEditModal(cat);
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer rounded-xl"
                              >
                                <Pencil size={13} className="text-slate-500" />
                                <span>Edit Category</span>
                              </button>
                            )}

                            {canDisable && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  setActionAnchorEl(null);
                                  setDisableTarget({ id: cat.id, name: cat.eq_name || cat.name, status: cat.status });
                                }}
                                className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer rounded-xl ${
                                  !isItemDisabled
                                    ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                    : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                }`}
                              >
                                {!isItemDisabled ? (
                                  <>
                                    <Ban size={13} className="text-rose-500" />
                                    <span>Disable Category</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={13} className="text-emerald-500" />
                                    <span>Enable Category</span>
                                  </>
                                )}
                              </button>
                            )}

                            {canDelete && (
                              <>
                                <div className="border-t border-slate-100 dark:border-slate-800 my-1 mx-1"></div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionId(null);
                                    setActionAnchorEl(null);
                                    setDeleteTarget({ id: cat.id, name: cat.eq_name || cat.name });
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2.5 transition-colors cursor-pointer rounded-xl"
                                >
                                  <Trash2 size={13} className="text-rose-500" />
                                  <span>Delete Category</span>
                                </button>
                              </>
                            )}
                          </ActionPopover>
                        </div>
                      ) : (
                        <span className="text-[10.5px] font-bold text-slate-400 italic">View Only</span>
                      )}
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[1500] flex items-center justify-center p-3 sm:p-5 overflow-y-auto scrollbar-hover animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 sm:p-6 max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col my-auto space-y-4">
            {/* Header (styled matching Reference Screenshot 3) */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Package size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                      {editItem ? "Edit Equipment Category" : "Add Equipment Category"}
                    </h3>
                    {editItem && (
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {editItem.eq_name || editItem.name || "Category"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                    Configure equipment category specifications, photo representation, and built-in links.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto scrollbar-hover pr-1 space-y-4 text-xs flex flex-col">
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                {/* ── Left Column: Form Details & Built-in Linkage ── */}
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Projector, Wireless Microphone, Sound System"
                      value={form.eq_name}
                      onChange={(e) => updateForm({ ...form, eq_name: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 text-xs shadow-2xs transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Description / Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Optional details or specifications for this equipment category..."
                      value={form.description}
                      onChange={(e) => updateForm({ ...form, description: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-normal text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 text-xs shadow-2xs transition-all resize-none"
                    />
                  </div>

                  {/* Built-in Equipment Categories (Using Shared Component with Whitespace & Hover Scroll) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Layers size={13} className="text-blue-600 dark:text-blue-400" />
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                          Built-in Categories
                        </label>
                      </div>
                      {form.built_in_units?.length > 0 && (
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                          {form.built_in_units.length} linked
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 font-normal">
                      Select equipment categories bundled or built-in for this equipment category.
                    </p>

                    <CategoryChecklistSelector
                      items={categories.filter((cat) => !editItem || String(cat.id) !== String(editItem.id))}
                      selectedIds={form.built_in_units || []}
                      withMaxQty={false}
                      onToggle={(cat) => {
                        const catId = cat.id;
                        const catIdStr = String(cat.id);
                        const catName = cat.eq_name || cat.name;
                        const isChecked = (form.built_in_units || []).some(
                          (item) => String(item) === catIdStr || String(item).toLowerCase() === String(catName).toLowerCase()
                        );
                        const next = isChecked
                          ? (form.built_in_units || []).filter(
                              (item) => String(item) !== catIdStr && String(item).toLowerCase() !== String(catName).toLowerCase()
                            )
                          : [...(form.built_in_units || []), catId];
                        updateForm({ ...form, built_in_units: next });
                      }}
                      emptyMessage="No other equipment categories found."
                      maxHeight="max-h-48"
                    />
                  </div>
                </div>

                {/* ── Right Column: Side-by-side Photo & Visibility + Card Preview ── */}
                <div className="space-y-3">
                  {/* Side-by-side: Allow in Public Borrowing & Category Photo */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    {/* Left Side: Category Photo */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                        {(() => {
                          const rawModal = form.photo || form.avatar;
                          if (!rawModal) return <Package size={18} className="text-slate-400" />;
                          const resolvedModal = resolveStorageUrl(rawModal) || rawModal;
                          return <img src={resolvedModal} alt="Preview" className="w-full h-full object-contain p-1" onError={(e) => { e.currentTarget.style.display = "none"; }} />;
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs mb-1">
                          Category Photo
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] cursor-pointer transition-all shadow-2xs">
                            <Camera size={11} />
                            <span>{(form.photo || form.avatar) ? "Change" : "Upload"}</span>
                            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                          </label>
                          {(form.photo || form.avatar) && (
                            <button
                              type="button"
                              onClick={() => updateForm({ ...form, photo: "", avatar: "" })}
                              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-800 hover:bg-red-50 text-red-600 dark:text-red-400 font-medium text-[11px] cursor-pointer transition-all"
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Allow Public View (Clean & compact) */}
                    <div className="border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 pt-2.5 sm:pt-0 sm:pl-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(form.is_public)}
                          onChange={(e) => updateForm({ ...form, is_public: e.target.checked })}
                          className="accent-blue-600 w-3.5 h-3.5 rounded cursor-pointer shrink-0"
                        />
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                          Allow Public View
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Live Public View Preview Card */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Public View Card Preview
                      </span>
                      {/* Photo Resize & Fit Controls */}
                      {(form.photo || form.avatar) && (
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewFit((f) => (f === "contain" ? "cover" : "contain"));
                              setIsFormDirty(true);
                            }}
                            className="px-1.5 py-0.5 text-[10px] font-semibold rounded text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Toggle Fit (Contain / Cover)"
                          >
                            {previewFit === "contain" ? "Contain" : "Cover"}
                          </button>
                          <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-1">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewScale((s) => Math.max(50, s - 10));
                                setIsFormDirty(true);
                              }}
                              className="w-4 h-4 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                              title="Zoom out"
                            >
                              -
                            </button>
                            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 w-6 text-center">
                              {previewScale}%
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewScale((s) => Math.min(150, s + 10));
                                setIsFormDirty(true);
                              }}
                              className="w-4 h-4 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                              title="Zoom in"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900 shadow-2xs">
                      <div className="w-full aspect-video bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden flex items-center justify-center p-1">
                        {(() => {
                          const rawModal = form.photo || form.avatar;
                          if (!rawModal) {
                            return (
                              <div className="flex flex-col items-center justify-center text-center p-2">
                                <Package size={24} className="text-slate-300 dark:text-slate-600 mb-1" />
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                  {form.eq_name || "EQUIPMENT NAME"}
                                </span>
                              </div>
                            );
                          }
                          const resolvedModal = resolveStorageUrl(rawModal) || rawModal;
                          return (
                            <div className="w-full h-full overflow-hidden flex items-center justify-center">
                              <img
                                src={resolvedModal}
                                alt="Public Preview"
                                className={`w-full h-full transition-transform duration-200 ${previewFit === "cover" ? "object-cover" : "object-contain"}`}
                                style={{ transform: `scale(${previewScale / 100})` }}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            </div>
                          );
                        })()}
                      </div>
                      <div className="mt-2.5 space-y-1">
                        <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {form.eq_name || "Equipment Name"}
                        </p>
                        <div>
                          {form.is_public ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Public View Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <EyeOff size={10} className="text-slate-400" />
                              Hidden in Public
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions (matching Reference Screenshot 3) */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-50"
                >
                  {formLoading && <Loader2 size={13} className="animate-spin" />}
                  <span>{editItem ? "Update Category" : "Create Category"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discard Changes Confirmation Modal */}
      <ConfirmModal
        open={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        onConfirm={() => {
          setShowDiscardModal(false);
          setIsFormDirty(false);
          setShowModal(false);
        }}
        variant="warning"
        title="Discard Unsaved Changes?"
        message="You have unsaved entries in this equipment category form. Are you sure you want to close without saving?"
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
      />

      {/* Student Assistant / Staff Category Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-sm border border-slate-200 animate-in fade-in zoom-in-95">
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

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteCategory}
        title="Delete Equipment Category"
        message={`Are you sure you want to permanently delete equipment category "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="delete"
        loading={deleting}
      />
    </div>
  );
}
