import { useState, useEffect } from "react";
import {
  Plus, Edit2, Ban, Power, CheckCircle2, X, Building, Loader2,
  Image as ImageIcon, Camera, AlertCircle, MoreVertical, Trash2, Pencil,
  Download, Upload, FileSpreadsheet, ChevronDown, ChevronLeft, MapPin, Users
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import api, { clearApiCache } from "@/lib/axios";
import notify from "@/lib/notify";
import { invalidateCache } from "@/lib/apiCache";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ActionPopover from "@/components/ui/action-popover";
import IosToggle from "@/components/ui/ios-toggle";
import VenueImportModal from "./VenueImportModal";
import { exportVenueList } from "@/pages/general/venueExportHelper";
import ExportModal from "@/components/ui/ExportModal";
import ExportButton from "@/components/ui/ExportButton";
import CategoryChecklistSelector from "@/components/ui/CategoryChecklistSelector";

export default function VenuesTab({ showMsg }) {
  const { isSuperAdmin, hasPermission } = usePermissions();
  const canAdd = isSuperAdmin || hasPermission("settings.venues") || hasPermission("settings.add") || hasPermission("manage_venues.add");
  const canEdit = isSuperAdmin || hasPermission("settings.venues") || hasPermission("settings.edit") || hasPermission("manage_venues.edit");
  const canDisable = isSuperAdmin || hasPermission("settings.venues") || hasPermission("settings.disable") || hasPermission("manage_venues.disable");
  const canDelete = isSuperAdmin || hasPermission("settings.venues") || hasPermission("settings.delete") || hasPermission("manage_venues.delete");

  const [venues, setVenues] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [equipmentCatalog, setEquipmentCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [disableTarget, setDisableTarget] = useState(null); // { id, name, status }
  const [openActionId, setOpenActionId] = useState(null);
  const [actionAnchorEl, setActionAnchorEl] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [deleting, setDeleting] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async ({ format }) => {
    setIsExporting(true);
    try {
      await exportVenueList(venues, format);
      notify.success(`Exported ${venues.length} venues as ${format.toUpperCase()}.`);
      setShowExportModal(false);
    } catch (e) {
      console.error(e);
      notify.error("Failed to export venues.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleRequestClose = () => {
    if (isFormDirty) {
      setShowDiscardModal(true);
    } else {
      setShowModal(false);
      setIsFormDirty(false);
    }
  };

  const updateForm = (updater) => {
    setIsFormDirty(true);
    setForm((prev) => (typeof updater === "function" ? updater(prev) : { ...prev, ...updater }));
  };

  const [previewScale, setPreviewScale] = useState(100);
  const [previewFit, setPreviewFit] = useState("contain");

  const [form, setForm] = useState({
    name: "",
    photo: "",
    avatar: "",
    status: "available",
    location: "",
    capacity: 100,
    min_capacity: 1,
    max_capacity: 100,
    allowed_equipment: [],
    equipment_max_qtys: {}, // { [equipId]: maxQty }
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [venueRes, equipRes] = await Promise.all([
        api.get("/general/venues").catch(() => api.get("/public/venues")),
        api.get("/general/equipment-types").catch(() => api.get("/public/equipment-types").catch(() => ({ data: [] }))),
      ]);
      const rawVenues = Array.isArray(venueRes.data) ? venueRes.data : [];
      const rawEquip = Array.isArray(equipRes.data) ? equipRes.data : (equipRes.data?.data || []);
      setVenues(rawVenues);
      setEquipmentCatalog(rawEquip);
      try {
        if (rawVenues.length > 0) {
          localStorage.setItem("fsuu_venues_catalog", JSON.stringify(rawVenues));
        }
        if (rawEquip.length > 0) {
          localStorage.setItem("fsuu_equipment_types", JSON.stringify(rawEquip));
        }
      } catch {}
    } catch {
      try {
        const savedVenues = JSON.parse(localStorage.getItem("fsuu_venues_catalog") || "[]");
        const savedEquip = JSON.parse(localStorage.getItem("fsuu_equipment_types") || "[]");
        setVenues(savedVenues);
        setEquipmentCatalog(savedEquip);
      } catch {
        setVenues([]);
        setEquipmentCatalog([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleCategoryUpdate = () => {
      invalidateCache("equipment_types_list");
      clearApiCache();
      api.get("/general/equipment-types")
        .catch(() => api.get("/public/equipment-types"))
        .then(res => {
          const rawEquip = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          if (rawEquip.length > 0) setEquipmentCatalog(rawEquip);
        })
        .catch(() => {});
    };

    window.addEventListener("equipment_categories_updated", handleCategoryUpdate);
    window.addEventListener("equipment_updated", handleCategoryUpdate);
    window.addEventListener("venues_updated", fetchData);

    const handleStorage = (e) => {
      if (e.key === "fsuu_venues_updated_ping") fetchData();
      if (e.key === "fsuu_category_updated_ping" || e.key === "fsuu_equipment_updated_ping") handleCategoryUpdate();
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("equipment_categories_updated", handleCategoryUpdate);
      window.removeEventListener("equipment_updated", handleCategoryUpdate);
      window.removeEventListener("venues_updated", fetchData);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(venues.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedVenues = venues.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateForm((prev) => ({ ...prev, photo: reader.result, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setFormLoading(true);
    setFormError("");
    const photoData = form.photo || form.avatar || "";
    const minCap = (form.min_capacity !== undefined && form.min_capacity !== "") ? Number(form.min_capacity) : 1;
    const maxCap = (form.max_capacity !== undefined && form.max_capacity !== "") ? Number(form.max_capacity) : ((form.capacity ? Number(form.capacity) : null) || 100);
    const payload = {
      name: (form.name || "").trim(),
      photo: photoData,
      avatar: photoData,
      status: form.status || "available",
      location: form.location || "",
      min_capacity: minCap,
      max_capacity: maxCap,
      capacity: maxCap,
      allowed_equipment: form.allowed_equipment || [],
      allowed_equipment_types_id: JSON.stringify(form.allowed_equipment || []),
      equipment_max_qtys: form.equipment_max_qtys || {},
    };

    if (editItem) {
      try {
        const res = await api.put(`/general/venues/${editItem.id}`, payload);
        const saved = res.data?.venue || res.data;
        const updated = venues.map(v => v.id === editItem.id ? { ...v, ...saved, min_capacity: minCap, max_capacity: maxCap, capacity: maxCap } : v);
        setVenues(updated);
        try {
          localStorage.setItem("fsuu_venues_catalog", JSON.stringify(updated));
          localStorage.setItem("fsuu_venues_updated_ping", Date.now().toString());
        } catch {}
        clearApiCache();
        invalidateCache("venues");
        window.dispatchEvent(new Event("venues_updated"));
        showMsg("Venue details updated successfully.");
        setIsFormDirty(false);
        setShowModal(false);
      } catch (err) {
        const errMsg = err.response?.data?.errors?.name?.[0] || err.response?.data?.message || "Failed to update venue.";
        setFormError(errMsg);
      } finally {
        setFormLoading(false);
      }
    } else {
      try {
        const res = await api.post("/general/venues", payload);
        const actualVenue = res.data?.venue || res.data;
        const venueObj = { ...actualVenue, min_capacity: minCap, max_capacity: maxCap, capacity: maxCap };
        const nextVenues = [venueObj, ...venues];
        setVenues(nextVenues);
        try {
          localStorage.setItem("fsuu_venues_catalog", JSON.stringify(nextVenues));
          localStorage.setItem("fsuu_venues_updated_ping", Date.now().toString());
        } catch {}
        clearApiCache();
        invalidateCache("venues");
        window.dispatchEvent(new Event("venues_updated"));
        showMsg("Venue created successfully.");
        setIsFormDirty(false);
        setShowModal(false);
      } catch (err) {
        const errMsg = err.response?.data?.errors?.name?.[0] || err.response?.data?.message || "Failed to create venue.";
        setFormError(errMsg);
      } finally {
        setFormLoading(false);
      }
    }
  };

  const handleEditClick = (v) => {
    setEditItem(v);
    const rawAllowed = v.allowed_equipment || v.allowed_equipment_types_id || [];
    let parsedAllowed = [];
    if (Array.isArray(rawAllowed)) {
      parsedAllowed = rawAllowed;
    } else if (typeof rawAllowed === "string") {
      try { parsedAllowed = JSON.parse(rawAllowed); } catch { parsedAllowed = []; }
    }

    const minCap = (v.min_capacity !== undefined && v.min_capacity !== null) ? Number(v.min_capacity) : 1;
    const maxCap = (v.max_capacity !== undefined && v.max_capacity !== null) ? Number(v.max_capacity) : (Number(v.capacity) || 100);

    setForm({
      name: v.name || "",
      photo: v.photo || v.avatar || "",
      avatar: v.photo || v.avatar || "",
      status: v.status || "available",
      location: v.location || "",
      capacity: maxCap,
      min_capacity: minCap,
      max_capacity: maxCap,
      allowed_equipment: parsedAllowed,
      equipment_max_qtys: v.equipment_max_qtys || {},
    });
    setFormError("");
    setIsFormDirty(false);
    setShowModal(true);
  };

  const confirmToggleDisable = async () => {
    if (!disableTarget) return;
    const { id, name, status } = disableTarget;
    const isCurrentlyDisabled = status === "disabled" || status === "inactive" || status === "unavailable";
    const newStatus = isCurrentlyDisabled ? "available" : "disabled";

    const prevVenues = venues;
    const updated = prevVenues.map(v => v.id === id ? { ...v, status: newStatus } : v);
    setVenues(updated);
    setDisableTarget(null);

    try {
      await api.put(`/general/venues/${id}`, { status: newStatus });
      try {
        localStorage.setItem("fsuu_venues_catalog", JSON.stringify(updated));
        localStorage.setItem("fsuu_venues_updated_ping", Date.now().toString());
      } catch {}
      clearApiCache();
      invalidateCache("venues");
      window.dispatchEvent(new Event("venues_updated"));
      showMsg(`Venue "${name}" has been ${isCurrentlyDisabled ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setVenues(prevVenues);
      showMsg(err.response?.data?.message || `Failed to update "${name}" status.`);
    }
  };

  const handleDeleteVenue = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/general/venues/${deleteTarget.id}`);
      setVenues((prev) => prev.filter((v) => v.id !== deleteTarget.id));
      clearApiCache();
      invalidateCache("venues");
      window.dispatchEvent(new Event("venues_updated"));
      showMsg(`Venue "${deleteTarget.name}" has been deleted successfully.`);
      setDeleteTarget(null);
    } catch (err) {
      showMsg(err.response?.data?.message || `Failed to delete venue "${deleteTarget.name}".`);
    } finally {
      setDeleting(false);
    }
  };

  const getAvailableStock = (eq) => {
    if (!eq) return 1;
    if (typeof eq.available_count === "number" && eq.available_count > 0) return eq.available_count;
    if (typeof eq.available_units === "number" && eq.available_units > 0) return eq.available_units;
    if (typeof eq.available === "number" && eq.available > 0) return eq.available;
    if (typeof eq.present_count === "number" && eq.present_count > 0) return eq.present_count;
    if (typeof eq.total_quantity === "number" && eq.total_quantity > 0) return eq.total_quantity;
    return 1;
  };

  const isItemChecked = (eq) => {
    if (!Array.isArray(form.allowed_equipment)) return false;
    const eqIdStr = String(eq.id);
    const eqNameLower = String(eq.name || eq.eq_name || "").trim().toLowerCase();
    return form.allowed_equipment.some(item => {
      const itemStr = String(item).trim();
      return itemStr === eqIdStr || (eqNameLower && itemStr.toLowerCase() === eqNameLower) || (Number(item) > 0 && Number(item) === Number(eq.id));
    });
  };

  const toggleEquipment = (eq) => {
    const checked = isItemChecked(eq);
    const eqId = Number(eq.id) || eq.id;
    const eqIdStr = String(eq.id);
    const eqNameLower = String(eq.name || eq.eq_name || "").trim().toLowerCase();
    const defaultAvailable = getAvailableStock(eq);

    if (checked) {
      updateForm((prev) => {
        const nextQtys = { ...prev.equipment_max_qtys };
        delete nextQtys[eqId];
        delete nextQtys[eqIdStr];
        return {
          ...prev,
          allowed_equipment: (prev.allowed_equipment || []).filter(item => {
            const itemStr = String(item).trim();
            return itemStr !== eqIdStr && itemStr.toLowerCase() !== eqNameLower && Number(item) !== Number(eq.id);
          }),
          equipment_max_qtys: nextQtys,
        };
      });
    } else {
      updateForm((prev) => ({
        ...prev,
        allowed_equipment: [...(prev.allowed_equipment || []), eqId],
        equipment_max_qtys: {
          ...prev.equipment_max_qtys,
          [eqId]: prev.equipment_max_qtys?.[eqId] ?? prev.equipment_max_qtys?.[eqIdStr] ?? defaultAvailable,
        }
      }));
    }
  };

  const handleMaxQtyChange = (eqId, qty) => {
    updateForm((prev) => ({
      ...prev,
      equipment_max_qtys: {
        ...prev.equipment_max_qtys,
        [eqId]: qty === "" ? "" : Math.max(1, Number(qty) || 1),
      }
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            Venue Creation
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Create and manage venue listings and configured allowed equipment for public bookings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Unified Institutional Export Button */}
          <ExportButton
            disabled={venues.length === 0}
            loading={isExporting}
            onClick={() => setShowExportModal(true)}
            title="Export Venues to Excel or CSV"
          />

          {/* Import Button */}
          {canAdd && (
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Upload size={15} className="text-indigo-600" />
              <span>Import</span>
            </button>
          )}

          {canAdd && (
            <button
              onClick={() => {
                setEditItem(null);
                setForm({
                  name: "",
                  photo: "",
                  avatar: "",
                  status: "available",
                  location: "",
                  capacity: 100,
                  min_capacity: 1,
                  max_capacity: 100,
                  allowed_equipment: [],
                  equipment_max_qtys: {},
                });
                setFormError("");
                setIsFormDirty(false);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-all shadow-xs"
            >
              <Plus size={16} /> Create Venue
            </button>
          )}
        </div>
      </div>

      {/* Table: [#, Photo, Venue, Status, Action] */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-x-auto w-full">
        <table className="w-full text-sm min-w-[750px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-16">Photo</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Venue</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-36">Status</th>
              <th className="px-4 py-3.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider w-24">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                    <span>Loading venues...</span>
                  </div>
                </td>
              </tr>
            ) : venues.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">
                  No venues found in catalog.
                </td>
              </tr>
            ) : (
              paginatedVenues.map((v, i) => {
                const isItemDisabled = v.status === "disabled" || v.status === "inactive" || v.status === "unavailable";
                const displayPhoto = v.photo || v.avatar;

                return (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono w-12">{startIndex + i + 1}</td>
                    
                    {/* Photo Column */}
                    <td className="px-4 py-3 w-16">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-2xs">
                        {displayPhoto ? (
                          <img src={displayPhoto} alt={v.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building size={16} className="text-slate-400" />
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-extrabold text-slate-900">{v.name}</div>
                      <div className="text-[11px] text-slate-400 font-medium">{v.location || "FSUU Main Campus"} • Cap: {v.min_capacity && Number(v.min_capacity) > 1 ? `${v.min_capacity} - ${v.max_capacity || v.capacity || 100}` : (v.max_capacity || v.capacity || 100)}</div>
                    </td>

                    <td className="px-4 py-3 w-36">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                        !isItemDisabled
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                          : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                      }`}>
                        {isItemDisabled && <Ban size={10} className="mr-1" />}
                        {!isItemDisabled ? "Available" : "Disabled"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right w-24">
                      {canEdit || canDisable || canDelete ? (
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openActionId === v.id) {
                                setOpenActionId(null);
                                setActionAnchorEl(null);
                              } else {
                                setOpenActionId(v.id);
                                setActionAnchorEl(e.currentTarget);
                              }
                            }}
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                              openActionId === v.id
                                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                            }`}
                            title="Actions"
                          >
                            <MoreVertical size={14} />
                          </button>

                          <ActionPopover
                            isOpen={openActionId === v.id}
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
                                  handleEditClick(v);
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer rounded-xl"
                              >
                                <Pencil size={13} className="text-slate-500" />
                                <span>Edit Venue</span>
                              </button>
                            )}

                            {canDisable && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  setActionAnchorEl(null);
                                  setDisableTarget({ id: v.id, name: v.name, status: v.status });
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
                                    <span>Disable Venue</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={13} className="text-emerald-500" />
                                    <span>Enable Venue</span>
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
                                    setDeleteTarget({ id: v.id, name: v.name });
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2.5 transition-colors cursor-pointer rounded-xl"
                                >
                                  <Trash2 size={13} className="text-rose-500" />
                                  <span>Delete Venue</span>
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

        {/* Pagination Controls Footer (Standard 10 items per page) */}
        {venues.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between p-4 border-t border-slate-200 text-xs text-slate-500 bg-slate-50/50">
            <span>
              Showing <strong className="text-slate-900">{startIndex + 1}</strong> to{" "}
              <strong className="text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, venues.length)}</strong> of{" "}
              <strong className="text-slate-900">{venues.length}</strong> venues
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer transition-colors shadow-2xs"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>
              <span className="px-2 font-bold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer transition-colors shadow-2xs"
              >
                <span>Next</span>
                <ChevronDown size={14} className="-rotate-90" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Venue / Edit Venue */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[1500] flex items-center justify-center p-3 sm:p-5 overflow-y-auto scrollbar-hover animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 sm:p-6 max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col my-auto space-y-4">
            {/* Header (styled matching Reference Screenshot 3) */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Building size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                      {editItem ? "Edit Venue" : "Create Venue"}
                    </h3>
                    {editItem && (
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {editItem.name || "Venue"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                    Configure venue specifications, location, capacity, and allowed equipment categories.
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

            {/* Scrollable Form Body */}
            <form id="venue-modal-form" onSubmit={handleSave} className="flex-1 overflow-y-auto scrollbar-hover pr-1 space-y-4 text-xs flex flex-col min-h-0">
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Top Row: Venue Specifications (Left) & Venue Photo (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-[1.05fr_1fr] gap-5 items-stretch">
                {/* Left: Basic Venue Form */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Venue Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AVR 1, Main Auditorium"
                      value={form.name || ""}
                      onChange={(e) => updateForm({ name: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-normal text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 text-xs shadow-2xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Location <span className="text-slate-400 font-normal">(Optional)</span></label>
                      <input
                        type="text"
                        placeholder="e.g. 2nd Floor, Main Building"
                        value={form.location || ""}
                        onChange={(e) => updateForm({ location: e.target.value })}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-normal text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 text-xs shadow-2xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Min. *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Min"
                          value={form.min_capacity ?? ""}
                          onChange={(e) => updateForm({ min_capacity: e.target.value })}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-normal text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 text-xs shadow-2xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Max. *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Max"
                          value={form.max_capacity ?? form.capacity ?? ""}
                          onChange={(e) => updateForm({ max_capacity: e.target.value, capacity: e.target.value })}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-normal text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 text-xs shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Venue Photo Upload (Level with form inputs on the left) */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                    {(form.photo || form.avatar) ? (
                      <img src={form.photo || form.avatar} alt="Preview" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Building size={20} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs mb-1">Venue Photo</label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] cursor-pointer transition-all shadow-2xs">
                        <Camera size={11} />
                        <span>{(form.photo || form.avatar) ? "Change Photo" : "Upload Photo"}</span>
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                      </label>
                      {(form.photo || form.avatar) && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, photo: "", avatar: "" })}
                          className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-800 hover:bg-red-50 text-red-600 dark:text-red-400 font-medium text-[11px] cursor-pointer transition-all"
                        >
                          <X size={11} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Allowed Equipment (Left) Perfectly Aligned with Public View Card Preview (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-[1.05fr_1fr] gap-5 items-start pt-1">
                {/* Left: Allowed Equipment & Max Qty */}
                <div className="space-y-1.5 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        Allowed Equipment &amp; Max Qty
                      </label>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal leading-snug">
                        Select categories allowed for this venue and set max requested quantity.
                      </p>
                    </div>
                    {form.allowed_equipment?.length > 0 && (
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full shrink-0">
                        {form.allowed_equipment.length} selected
                      </span>
                    )}
                  </div>

                  <CategoryChecklistSelector
                    items={equipmentCatalog}
                    selectedIds={form.allowed_equipment || []}
                    withMaxQty={true}
                    maxQtys={form.equipment_max_qtys || {}}
                    onToggle={toggleEquipment}
                    onMaxQtyChange={handleMaxQtyChange}
                    getStock={getAvailableStock}
                    emptyMessage="No equipment categories found."
                    maxHeight="max-h-[295px]"
                    className="flex-1"
                  />
                </div>

                {/* Right: Public View Card Preview */}
                <div className="space-y-1.5 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight block">
                        Public View Card Preview
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal leading-snug">
                        How this venue appears to applicants on the booking page
                      </p>
                    </div>

                    {/* Photo Resize & Fit Controls */}
                    {(form.photo || form.avatar) && (
                      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewFit((f) => (f === "contain" ? "cover" : "contain"))}
                          className="px-1.5 py-0.5 text-[10px] font-medium rounded text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Toggle Fit (Contain / Cover)"
                        >
                          {previewFit === "contain" ? "Contain" : "Cover"}
                        </button>
                        <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-1">
                          <button
                            type="button"
                            onClick={() => setPreviewScale((s) => Math.max(50, s - 10))}
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
                            onClick={() => setPreviewScale((s) => Math.min(150, s + 10))}
                            className="w-4 h-4 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                            title="Zoom in"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cohesive Public View Card Container */}
                  <div className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between flex-1">
                    <div>
                      {/* Image Container */}
                      <div className="w-full aspect-[16/9] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden flex flex-col items-center justify-center text-center relative group p-1">
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
                          <div className="p-4 flex flex-col items-center justify-center h-full w-full bg-slate-50 dark:bg-slate-800/40">
                            <Building size={28} className="text-slate-300 dark:text-slate-600 mb-1" />
                            <span className="text-slate-700 dark:text-slate-300 font-extrabold text-xs sm:text-sm leading-snug line-clamp-2 uppercase tracking-wide">
                              {form.name || "VENUE NAME"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="mt-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm leading-tight line-clamp-1">
                            {form.name || "Venue Name"}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shrink-0">
                            Available
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 flex items-center gap-1.5">
                          <MapPin size={11} className="shrink-0 text-slate-400" />
                          <span>{form.location || "Location not specified"}</span>
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                          <Users size={11} className="shrink-0 text-slate-400" />
                          <span>Min {form.min_capacity || 1} • Max {form.max_capacity || form.capacity || 100} guests</span>
                        </p>
                      </div>
                    </div>

                    {/* Interactive Public Action Button (Preview) */}
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        disabled
                        className="w-full h-8 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs opacity-95 cursor-default"
                      >
                        <span>Select Venue</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Modal Footer Actions: Pinned & Completely Intact (Never scrolls away) */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-[#111827]">
              <button
                type="button"
                onClick={handleRequestClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="venue-modal-form"
                disabled={formLoading}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-50"
              >
                {formLoading && <Loader2 size={13} className="animate-spin" />}
                <span>{editItem ? "Update Venue" : "Create Venue"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Confirmation Modal */}
      <ConfirmModal
        open={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        onConfirm={() => {
          setShowDiscardModal(false);
          setShowModal(false);
          setIsFormDirty(false);
        }}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes in this venue. Are you sure you want to close without saving?"
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        variant="danger"
      />

      <ConfirmModal
        open={!!disableTarget}
        onClose={() => setDisableTarget(null)}
        onConfirm={confirmToggleDisable}
        title={disableTarget?.status === "disabled" ? "Enable Venue" : "Disable Venue"}
        message={`Are you sure you want to ${disableTarget?.status === "disabled" ? 'enable' : 'disable'} venue "${disableTarget?.name}"?`}
        confirmText={disableTarget?.status === "disabled" ? "Enable" : "Disable"}
        variant={disableTarget?.status === "disabled" ? "primary" : "danger"}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteVenue}
        title="Delete Venue"
        message={`Are you sure you want to permanently delete venue "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="delete"
        loading={deleting}
      />

      {/* Venue Batch Import Modal */}
      <VenueImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchData}
      />

      {/* Reusable Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Venues Catalog"
        subtitle="Select format to export university venues and facilities."
        formats={["xlsx", "csv"]}
        defaultFormat="xlsx"
        records={venues}
        onExport={handleExport}
        isExporting={isExporting}
      />
    </div>
  );
}
