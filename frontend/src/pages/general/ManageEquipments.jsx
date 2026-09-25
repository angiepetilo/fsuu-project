import { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import { fetchWithCache, invalidateCache } from "@/lib/apiCache";
import {
  PackageOpen, Plus, Search, Filter, Edit3, Ban, CheckCircle2,
  AlertTriangle, Barcode, Eye, Copy, Check,
  ChevronLeft, ChevronRight, LayoutGrid, Loader2, MoreVertical,
  CircleCheck, Layers, PackageCheck
} from "lucide-react";
import EquipmentDetailModal from "./components/EquipmentDetailModal";
import EquipmentModal, { generateSequentialBarcodes } from "./components/EquipmentModal";
import ActionPopover from "@/components/ui/action-popover";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { PageLoader } from "@/components/ui/page-loader";
import { StatusBadge } from "@/components/ui/status-badge";
import { usePermissions } from "@/hooks/usePermissions";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export default function ManageEquipments() {
  const { hasPermission } = usePermissions();
  const context = useOutletContext();

  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  if (!hasPermission("manage_equipments")) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3 mt-12 bg-white rounded-3xl border border-slate-200 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-sm font-extrabold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 font-medium">
          You do not have permission to view or configure Equipment Inventory.
        </p>
      </div>
    );
  }
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);
  const [actionAnchorEl, setActionAnchorEl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copiedBarcode, setCopiedBarcode] = useState(null);
  const [disableModalTarget, setDisableModalTarget] = useState(null);
  const [isDisabling, setIsDisabling] = useState(false);
  const [enableModalTarget, setEnableModalTarget] = useState(null);
  const [isEnabling, setIsEnabling] = useState(false);
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

  const handleCopyBarcode = (barcode) => {
    if (!barcode) return;
    navigator.clipboard.writeText(barcode);
    setCopiedBarcode(barcode);
    setTimeout(() => setCopiedBarcode(null), 2000);
  };

  // Form State
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    serial_number: "",
    barcode: "",
    category: "",
    date_purchased: new Date().toISOString().split("T")[0],
    lifespan_years: "5",
    status: "available",
    condition: "Good",
    description: "",
    built_in_units: [""],
    built_in_models: {},
  });

  const [editFormData, setEditFormData] = useState({
    brand: "",
    model: "",
    serial_number: "",
    barcode: "",
    category: "",
    date_purchased: "2026-03-15",
    lifespan_years: "5",
    status: "available",
    condition: "Good",
    description: "",
    built_in_units: [""],
    built_in_models: {},
  });

  const [isSyncing, setIsSyncing] = useState(false);

  const fetchEquipments = useCallback(async (opts = false) => {
    const isSilent = typeof opts === "object" && opts !== null
      ? Boolean(opts.isSilent || opts.silent || opts.showLoading === false)
      : Boolean(opts);

    if (!isSilent) setIsSyncing(true);
    try {
      const [catData, unitRes] = await Promise.all([
        fetchWithCache("equipment_types_list", () => api.get('/general/equipment-types').then(r => r.data).catch(() => [])),
        api.get('/general/equipment-units').catch(() => ({ data: [] })),
      ]);

      const catList = Array.isArray(catData) ? catData : [];
      const unitData = Array.isArray(unitRes.data) ? unitRes.data : [];

      setCategories(catList);

      setUnits(unitData.map((u, idx) => {
        const bCode = String(u.barcode || `BC-EQP-2026-00${idx + 1}`).trim();
        const dbStatusRaw = (u.status || 'available').toLowerCase();
        const dbCondition = u.condition || '';
        const condLower = dbCondition.toLowerCase();

        // Derive human-readable condition from DB value
        let conditionLabel;
        if (condLower === 'good' || condLower === 'good condition') conditionLabel = 'Good';
        else if (condLower === 'damaged') conditionLabel = 'Damaged';
        else if (condLower === 'lost') conditionLabel = 'Lost';
        else if (condLower === 'maintenance' || condLower === 'under_maintenance' || condLower === 'under repair') conditionLabel = 'Under Repair';
        else if (condLower === 'worn' || condLower === 'minor wear') conditionLabel = 'Minor Wear';
        else if (dbStatusRaw === 'damaged') conditionLabel = 'Damaged';
        else if (dbStatusRaw === 'maintenance' || dbStatusRaw === 'under_maintenance') conditionLabel = 'Under Repair';
        else if (dbStatusRaw === 'decommissioned' || dbStatusRaw === 'lost') conditionLabel = 'Lost';
        else conditionLabel = 'Good';

        let dbStatus = dbStatusRaw;
        if (
          ['lost', 'damaged', 'under repair', 'worn', 'minor wear'].includes(conditionLabel.toLowerCase()) ||
          ['damaged', 'maintenance', 'under_maintenance', 'decommissioned', 'unavailable', 'lost'].includes(dbStatusRaw)
        ) {
          dbStatus = 'unavailable';
        } else if (dbStatusRaw === 'released' || dbStatusRaw === 'in-use' || dbStatusRaw === 'released / in-use' || dbStatusRaw === 'release / in - use') {
          dbStatus = 'Released';
        } else if (dbStatusRaw === 'reserved') {
          dbStatus = 'Reserved';
        } else {
          dbStatus = 'Available';
        }

        const eqType = u.equipment_type || u.equipmentType || catList.find(c => String(c.id) === String(u.equipment_type_id));
        const catName = eqType?.eq_name || eqType?.name || eqType?.eq_type || 'AV Equipment';
        const brandModel = [u.brand, u.model].filter(Boolean).join(' ');
        const derivedName = brandModel || catName || 'Equipment Unit';

        return {
          id: u.id || idx + 1,
          equipment_type_id: u.equipment_type_id,
          brand: u.brand || '',
          model: u.model || '',
          serial_number: u.serial_number || u.barcode || '',
          barcode: bCode,
          name: derivedName,
          category: catName,
          office_id: eqType?.office_id || u.office_id || null,
          office_name: eqType?.office?.name || 'AVR Office I',
          status: dbStatus,
          condition: conditionLabel,
          available_count: dbStatus === 'Available' ? 1 : 0,
          total_count: 1,
          date_purchased: u.purchased_at ? u.purchased_at.substring(0, 10) : '2026-01-15',
          lifespan_years: u.eq_lifespan || 5,
          description: u.description || '',
          is_disabled: !!u.is_disabled,
          built_in_units: Array.isArray(u.built_in_units)
            ? u.built_in_units
            : (typeof u.built_in_units === 'string'
                ? (() => { try { return JSON.parse(u.built_in_units); } catch { return []; } })()
                : []),
          built_in_models: (u.built_in_models && typeof u.built_in_models === 'object')
            ? u.built_in_models
            : (typeof u.built_in_models === 'string'
                ? (() => { try { return JSON.parse(u.built_in_models); } catch { return {}; } })()
                : {}),
        };
      }));

      if (catData.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: catData[0].eq_name || catData[0].name }));
      }
    } catch {
      setUnits([]);
      setCategories([]);
    } finally {
      setLoading(false);
      if (!isSilent) setIsSyncing(false);
    }
  }, []);

  useRealtimeSync(fetchEquipments, { interval: 30000 });

  const handleOpenAddModal = async () => {
    let activeCats = categories;
    if (!activeCats || activeCats.length === 0) {
      try {
        const res = await api.get('/general/equipment-types');
        activeCats = Array.isArray(res.data) ? res.data : [];
        setCategories(activeCats);
      } catch {
        activeCats = [];
      }
    }

    if (activeCats.length === 0) {
      alert("⚠️ No Equipment Category created yet! Please create an Equipment Category first in Settings -> Equipment Catalog before adding equipment units.");
      return;
    }

    const defaultCatName = activeCats[0]?.eq_name || activeCats[0]?.name || "";
    setFormData({
      brand: "",
      model: "",
      serial_number: "",
      barcode: "",
      category: defaultCatName,
      status: "available",
      condition: "Good",
      date_purchased: new Date().toISOString().split("T")[0],
      lifespan_years: 5,
      description: "",
      built_in_units: [""],
      built_in_models: {},
    });

    setIsSubmitting(false);
    setShowAddModal(true);
  };

  const handleAddEquipment = async (e) => {
    e.preventDefault();
    if (categories.length === 0) {
      alert("No equipment categories created yet. Please create an Equipment Category in Settings -> Equipment Catalog first.");
      return;
    }

    const enteredSerial = (formData.serial_number || formData.barcode || "").trim();
    const enteredBarcode = (formData.barcode || "").trim();

    // Duplicate check for Serial No.
    if (enteredSerial) {
      const duplicateSerial = units.find(u =>
        (u.serial_number || u.barcode || "").trim().toLowerCase() === enteredSerial.toLowerCase()
      );
      if (duplicateSerial) {
        notify.error(
          "Duplicate Serial No.",
          `Serial No. "${enteredSerial}" is already assigned to an equipment unit. Every unit must have a unique Serial No.`
        );
        return;
      }
    }

    // Duplicate check for Barcode (if provided)
    if (enteredBarcode) {
      const duplicateBarcode = units.find(u =>
        (u.barcode || "").trim().toLowerCase() === enteredBarcode.toLowerCase()
      );
      if (duplicateBarcode) {
        notify.error(
          "Duplicate Barcode",
          `Barcode "${enteredBarcode}" is already assigned to an equipment unit. Every unit must have a unique barcode.`
        );
        return;
      }
    }

    setIsSubmitting(true);

    const matchedCat = categories.find(c =>
      (c.eq_name || c.name || "").toLowerCase() === (formData.category || "").toLowerCase()
    ) || categories[0];

    if (!matchedCat || !matchedCat.id) {
      setIsSubmitting(false);
      notify.error("Category Error", "Please select or create an Equipment Category before adding units.");
      return;
    }

    const brandModel = [formData.brand, formData.model].filter(Boolean).join(' ');
    const unitDisplayName = brandModel || matchedCat.eq_name || matchedCat.name || 'Unit';
    const validBuiltIns = (formData.built_in_units || []).filter(Boolean);

    // ── OPTIMISTIC: add placeholder row immediately ─────────────────────────
    const tempId = `temp-${Date.now()}`;
    const optimisticUnit = {
      id: tempId,
      equipment_type_id: matchedCat.id,
      brand: formData.brand || "",
      model: formData.model || "",
      serial_number: enteredSerial || `SN-${Date.now().toString().slice(-6)}`,
      barcode: enteredBarcode || "",
      name: unitDisplayName,
      category: matchedCat.eq_name || matchedCat.name || "AV Equipment",
      status: "Available",
      condition: formData.condition || "Good",
      available_count: 1,
      total_count: 1,
      date_purchased: formData.date_purchased,
      lifespan_years: parseInt(formData.lifespan_years, 10) || 5,
      description: "",
      built_in_units: validBuiltIns,
      _optimistic: true,
    };

    const prevUnits = units;
    setUnits(prev => [...prev, optimisticUnit]);
    setShowAddModal(false);
    // ─────────────────────────────────────────────────────────────────────────

    try {
      const payload = {
        equipment_type_id: matchedCat.id,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        serial_number: enteredSerial || undefined,
        barcode: enteredBarcode || undefined,
        purchased_at: formData.date_purchased || undefined,
        eq_lifespan: parseInt(formData.lifespan_years, 10) || 5,
        status: formData.status || "available",
        condition: formData.condition || "Good",
        built_in_units: validBuiltIns,
        built_in_models: formData.built_in_models || {},
      };

      const res = await api.post("/general/equipment-units", payload);
      const saved = res.data;

      if (saved?.id) {
        setUnits(prev => prev.map(u =>
          u.id === tempId
            ? {
                ...optimisticUnit,
                id: saved.id,
                serial_number: saved.serial_number || optimisticUnit.serial_number,
                barcode: saved.barcode || optimisticUnit.barcode,
                built_in_units: Array.isArray(saved.built_in_units) ? saved.built_in_units : validBuiltIns,
                _optimistic: false,
              }
            : u
        ));
      }

      notify.success(
        "Equipment Unit Added",
        `Physical unit "${unitDisplayName}" registered under ${matchedCat.eq_name || matchedCat.name}.`
      );

      setFormData({
        brand: "",
        model: "",
        serial_number: "",
        barcode: "",
        category: matchedCat.eq_name || matchedCat.name || "",
        status: "available",
        condition: "Good",
        date_purchased: new Date().toISOString().split("T")[0],
        lifespan_years: 5,
        description: "",
        built_in_units: [""],
        built_in_models: {},
      });

      // Background sync
      fetchEquipments(true);
    } catch (err) {
      // Rollback
      setUnits(prevUnits);
      setShowAddModal(true);
      const errDetails = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(" ")
        : (err.response?.data?.message ?? "An error occurred. Changes were reverted.");
      notify.error("Failed to Save Unit", errDetails);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEquipmentSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    const enteredSerial = (editFormData.serial_number || editFormData.barcode || "").trim();
    const enteredBarcode = (editFormData.barcode || "").trim();

    // Duplicate check for Serial No.
    if (enteredSerial) {
      const duplicateSerial = units.find(u =>
        u.id !== editingItem.id &&
        (u.serial_number || u.barcode || "").trim().toLowerCase() === enteredSerial.toLowerCase()
      );
      if (duplicateSerial) {
        notify.error(
          "Duplicate Serial No.",
          `Serial No. "${enteredSerial}" is already assigned to "${duplicateSerial.name || duplicateSerial.brand || 'another unit'}". Every unit must have a unique Serial No.`
        );
        return;
      }
    }

    // Duplicate check for Barcode (if provided)
    if (enteredBarcode) {
      const duplicateUnit = units.find(u =>
        u.id !== editingItem.id && (u.barcode || "").trim().toLowerCase() === enteredBarcode.toLowerCase()
      );
      if (duplicateUnit) {
        notify.error(
          "Duplicate Barcode",
          `Barcode "${enteredBarcode}" is already assigned to "${duplicateUnit.name || duplicateUnit.brand || 'another unit'}". Every unit must have a unique barcode.`
        );
        return;
      }
    }

    setIsSubmitting(true);

    const matchedCat = categories.find(c =>
      (c.eq_name || c.name || "").toLowerCase() === (editFormData.category || "").toLowerCase()
    ) || categories[0];

    const brandModel = [editFormData.brand, editFormData.model].filter(Boolean).join(' ');
    const unitDisplayName = brandModel || matchedCat.eq_name || matchedCat.name || 'Unit';
    const validBuiltIns = (editFormData.built_in_units || []).filter(Boolean);

    // ── OPTIMISTIC: update row immediately ────────────────────────────────────
    const prevUnits = units;
    const optimisticChanges = {
      name: unitDisplayName,
      brand: editFormData.brand || "",
      model: editFormData.model || "",
      serial_number: enteredSerial || editFormData.serial_number,
      barcode: enteredBarcode,
      category: matchedCat.eq_name || matchedCat.name || editingItem.category,
      status: editFormData.status === "available" ? "Available" : "Unavailable",
      condition: editFormData.condition || "Good",
      date_purchased: editFormData.date_purchased,
      lifespan_years: parseInt(editFormData.lifespan_years, 10) || 5,
      built_in_units: validBuiltIns,
      built_in_models: editFormData.built_in_models || {},
      description: editFormData.description,
      _optimistic: true,
    };
    setUnits(prev => prev.map(u => u.id === editingItem.id ? { ...u, ...optimisticChanges } : u));
    setEditingItem(null);
    // ─────────────────────────────────────────────────────────────────────────

    try {
      const payload = {
        equipment_type_id: matchedCat.id,
        brand: editFormData.brand || undefined,
        model: editFormData.model || undefined,
        serial_number: enteredSerial || undefined,
        barcode: enteredBarcode || undefined,
        purchased_at: editFormData.date_purchased,
        eq_lifespan: parseInt(editFormData.lifespan_years, 10) || 5,
        status: editFormData.status || "available",
        condition: editFormData.condition || "Good",
        built_in_units: validBuiltIns,
        built_in_models: editFormData.built_in_models || {},
        description: editFormData.description,
        reason: editFormData.reason || undefined,
      };
      await api.put(`/general/equipment-units/${editingItem.id}`, payload);
      // Confirm: remove optimistic flag
      setUnits(prev => prev.map(u => u.id === editingItem.id ? { ...u, _optimistic: false } : u));
      invalidateCache("equipment_types_list");
      invalidateCache("dashboard");
      try { localStorage.removeItem("fsuu_cache_admin_dashboard"); } catch {}
      notify.success("Equipment Updated", `"${unitDisplayName}" saved successfully.`);
    } catch (err) {
      // Rollback
      setUnits(prevUnits);
      const errDetails = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(" ")
        : (err.response?.data?.message ?? "Changes were reverted.");
      notify.error("Update Failed", errDetails);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisableEquipment = (id, name) => {
    setDisableModalTarget({ id, name });
  };

  const confirmDisableEquipment = async () => {
    if (!disableModalTarget) return;
    const { id, name } = disableModalTarget;
    setIsDisabling(true);

    // Optimistic: mark greyed-out immediately (don't remove)
    const prevUnits = units;
    setUnits(prev => prev.map(u => u.id === id ? { ...u, is_disabled: true } : u));
    setOpenActionId(null);

    try {
      await api.delete(`/general/equipment-units/${id}`);
      invalidateCache("equipment_types_list");
      invalidateCache("dashboard");
      try { localStorage.removeItem("fsuu_cache_admin_dashboard"); } catch {}
      notify.info("Unit Disabled", `"${name}" has been disabled and appears greyed out.`);
      setDisableModalTarget(null);
    } catch {
      setUnits(prevUnits); // Rollback
      notify.error("Disable Failed", "Failed to disable the equipment unit.");
    } finally {
      setIsDisabling(false);
    }
  };

  const handleEnableEquipment = (id, name) => {
    setEnableModalTarget({ id, name });
  };

  const confirmEnableEquipment = async () => {
    if (!enableModalTarget) return;
    const { id, name } = enableModalTarget;
    setIsEnabling(true);

    // Optimistic: un-grey immediately
    const prevUnits = units;
    setUnits(prev => prev.map(u => u.id === id ? { ...u, is_disabled: false } : u));
    setOpenActionId(null);

    try {
      await api.post(`/general/equipment-units/${id}/enable`);
      invalidateCache("equipment_types_list");
      invalidateCache("dashboard");
      try { localStorage.removeItem("fsuu_cache_admin_dashboard"); } catch {}
      notify.success("Unit Enabled", `"${name}" has been re-enabled and is back in active inventory.`);
      setEnableModalTarget(null);
      fetchEquipments(true);
    } catch {
      setUnits(prevUnits); // Rollback
      notify.error("Enable Failed", "Failed to re-enable the equipment unit.");
    } finally {
      setIsEnabling(false);
    }
  };

  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";
  const selectedOfficeId = context?.selectedOfficeId;

  const filtered = useMemo(() => {
    return units.filter(item => {
      if (selectedOfficeId && selectedOfficeId !== "all") {
        const offId = item.office_id || item.equipment_type?.office_id || item.equipmentType?.office_id;
        const offName = item.office_name || item.office?.name;
        if (offId && String(offId) !== String(selectedOfficeId)) return false;
        if (offName && officeScope && officeScope !== "All Offices" && !offName.toLowerCase().includes(officeScope.toLowerCase())) {
          return false;
        }
      }
      const matchCategory = activeCategory === "all" || (item.category || "").toLowerCase() === activeCategory.toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchSearch = !searchQuery ||
        (item.name || "").toLowerCase().includes(q) ||
        (item.serial_number || "").toLowerCase().includes(q) ||
        (item.barcode || "").toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [units, selectedOfficeId, officeScope, activeCategory, searchQuery]);

  const parentUnitMap = useMemo(() => {
    const map = new Map();
    units.forEach((parent) => {
      let rawList = parent.built_in_units;
      if (typeof rawList === "string") {
        try { rawList = JSON.parse(rawList); } catch { rawList = []; }
      }
      if (Array.isArray(rawList)) {
        rawList.forEach((childId) => {
          if (childId) {
            map.set(String(childId), parent);
          }
        });
      }
    });
    return map;
  }, [units]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE)), [filtered.length]);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUnits = useMemo(() => {
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filtered, startIndex]);

  const filteredCategories = useMemo(() => {
    if (!selectedOfficeId || selectedOfficeId === "all") return categories;
    return categories.filter(c => {
      const offId = c.office_id || c.office?.id;
      const offName = c.office?.name || c.office_name;
      if (offId) return String(offId) === String(selectedOfficeId);
      if (offName && officeScope && officeScope !== "All Offices") {
        return offName.toLowerCase().includes(officeScope.toLowerCase());
      }
      return true;
    });
  }, [categories, selectedOfficeId, officeScope]);

  const categoryNames = useMemo(() => {
    return Array.from(new Set(filteredCategories.map(c => c.eq_name || c.name || c.eq_type).filter(Boolean)));
  }, [filteredCategories]);

  const categoryList = useMemo(() => [
    { id: "all", label: "All Categories" },
    ...categoryNames.map(c => ({ id: c, label: c }))
  ], [categoryNames]);

  if (loading && units.length === 0) return <PageLoader message="Loading Equipment Inventory..." />;

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Equipment</span>
        </button>
      </div>

      {/* Warning Banner if No Category Exists */}
      {categories.length === 0 && !loading && (
        <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl text-amber-900 text-xs font-semibold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <span>
              <strong>No Equipment Category Created Yet:</strong> You cannot add physical equipment units until an Equipment Category is created in <strong>Settings → Equipment Catalog</strong>.
            </span>
          </div>
        </div>
      )}

      {feedback && (
        <div className="fixed bottom-6 right-6 z-[3000] bg-slate-900 text-white text-xs font-extrabold px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 border border-slate-700 max-w-md">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#111827] p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs text-xs font-bold text-slate-700 dark:text-slate-200">
          <Filter size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer text-xs pr-2"
          >
            {categoryList.map(t => (
              <option key={t.id} value={t.id} className="dark:bg-slate-900">{t.label}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search unit name, serial no., barcode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Physical Units Table */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
                {["#", "Serial No.", "Equipment Unit Name", "Assigned Category", "Date Purchased", "Lifespan vs Current", "Action"].map((h, i) => (
                  <th key={h} className={`px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap ${i === 0 ? 'rounded-tl-2xl' : i === 6 ? 'rounded-tr-2xl' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
              {loading && units.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Loader2 size={20} className="animate-spin inline mr-2" /> Loading equipment units...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    {categories.length === 0
                      ? "⚠️ Create an Equipment Category in Settings first before adding physical equipment units."
                      : "📦 No physical equipment units added yet. Click 'Add Equipment' to add units to a category."}
                  </td>
                </tr>
              ) : (
                paginatedUnits.map((item, index) => {
                  const lifespanYears = item.lifespan_years || 5;
                  const purchaseYear = item.date_purchased ? parseInt(item.date_purchased.split("-")[0], 10) : 2026;
                  const currentYear = new Date().getFullYear();
                  const ageYears = Math.max(0.5, currentYear - purchaseYear + 0.2);
                  const displayIndex = startIndex + index + 1;
                  const isNearBottom = index >= Math.max(1, paginatedUnits.length - 2);
                  const isOpen = openActionId === item.id;

                  return (
                    <tr key={item.id} className={`transition-colors ${isOpen ? 'relative z-30' : ''} ${item.is_disabled ? 'opacity-50 grayscale bg-slate-50 dark:bg-slate-900/50' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/50'}`}>
                      <td className="px-4 py-3.5 font-bold text-slate-400 dark:text-slate-500">{displayIndex}</td>
                      <td className="px-4 py-3.5 font-mono text-xs font-bold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 bg-blue-50/80 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg w-fit text-blue-700 dark:text-blue-300 font-bold shadow-2xs">
                              <Barcode size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                              <span>{item.serial_number || item.barcode}</span>
                            </div>
                            {item.barcode && item.serial_number && item.barcode !== item.serial_number && (
                              <span className="text-[10px] text-slate-400 font-mono pl-1">BC: {item.barcode}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyBarcode(item.serial_number || item.barcode)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                            title="Copy Serial / Barcode"
                          >
                            {copiedBarcode === (item.serial_number || item.barcode) ? (
                              <Check size={13} className="text-emerald-600 font-extrabold" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 max-w-[240px]">
                        {(() => {
                          const parentUnit =
                            parentUnitMap.get(String(item.id)) ||
                            (item.barcode ? parentUnitMap.get(String(item.barcode)) : null) ||
                            (item.serial_number ? parentUnitMap.get(String(item.serial_number)) : null);

                          return (
                            <div className="flex flex-col gap-1">
                              <span className="font-extrabold text-slate-900 dark:text-white truncate block" title={item.name}>
                                {item.name}
                              </span>
                              {parentUnit && (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs w-fit max-w-full"
                                  title={`Packaged inside ${parentUnit.name || parentUnit.category} [${parentUnit.serial_number || parentUnit.barcode || ''}]`}
                                >
                                  <Layers size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span className="truncate">Bundled with {parentUnit.name || parentUnit.category || "Parent Kit"}</span>
                                </span>
                              )}
                              {!parentUnit && Array.isArray(item.built_in_units) && item.built_in_units.length > 0 && (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 w-fit max-w-full"
                                  title={`Includes ${item.built_in_units.length} built-in component(s)`}
                                >
                                  <PackageCheck size={11} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                  <span className="truncate">Kit includes {item.built_in_units.length} built-in {item.built_in_units.length === 1 ? "unit" : "units"}</span>
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-blue-700 dark:text-blue-300 max-w-[180px]">
                        <span className="bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200/60 dark:border-blue-800/60 block w-fit max-w-full truncate" title={item.category}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{item.date_purchased}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{ageYears.toFixed(1)} / {lifespanYears} yrs</td>
                      <td className="px-4 py-3.5 relative">
                        <div className="relative action-menu-container inline-block">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openActionId === item.id) {
                                setOpenActionId(null);
                                setActionAnchorEl(null);
                              } else {
                                setOpenActionId(item.id);
                                setActionAnchorEl(e.currentTarget);
                              }
                            }}
                            className={`p-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                              isOpen
                                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                            }`}
                            title="Actions"
                          >
                            <MoreVertical size={15} />
                          </button>

                          <ActionPopover
                            isOpen={isOpen}
                            anchorEl={actionAnchorEl}
                            onClose={() => {
                              setOpenActionId(null);
                              setActionAnchorEl(null);
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionId(null);
                                setActionAnchorEl(null);
                                setSelectedItem(item);
                              }}
                              className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer rounded-xl group"
                            >
                              <Eye size={14} className="text-blue-500 group-hover:text-white transition-colors" />
                              <span className="transition-colors">View Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionId(null);
                                setActionAnchorEl(null);
                                setEditingItem(item);
                                setEditFormData({
                                  brand: item.brand || "",
                                  model: item.model || "",
                                  serial_number: item.serial_number || item.barcode || "",
                                  barcode: item.barcode || "",
                                  category: item.category || "",
                                  date_purchased: item.date_purchased || "",
                                  lifespan_years: String(item.lifespan_years || 5),
                                  status: item.status || "available",
                                  condition: item.condition || "Good",
                                  description: item.description || "",
                                  reason: "",
                                  built_in_units: Array.isArray(item.built_in_units) && item.built_in_units.length > 0 ? item.built_in_units : [""],
                                  built_in_models: item.built_in_models || {},
                                });
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Edit3 size={14} className="text-slate-500" />
                              <span>Edit Unit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionId(null);
                                setActionAnchorEl(null);
                                setEditingItem(item);
                                setEditFormData({
                                  brand: item.brand || "",
                                  model: item.model || "",
                                  serial_number: item.serial_number || item.barcode || "",
                                  barcode: item.barcode || "",
                                  category: item.category || "",
                                  date_purchased: item.date_purchased || "",
                                  lifespan_years: String(item.lifespan_years || 5),
                                  status: item.status || "available",
                                  condition: item.condition || "Good",
                                  description: item.description || "",
                                  reason: "",
                                  built_in_units: Array.isArray(item.built_in_units) && item.built_in_units.length > 0 ? item.built_in_units : [""],
                                  built_in_models: item.built_in_models || {},
                                });
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <PackageOpen size={14} className="text-blue-500" />
                              <span>Built-in Units {Array.isArray(item.built_in_units) && item.built_in_units.length > 0 ? `(${item.built_in_units.length})` : ""}</span>
                            </button>

                            <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>

                            {item.is_disabled ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  setActionAnchorEl(null);
                                  handleEnableEquipment(item.id, item.name);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <CircleCheck size={14} className="text-emerald-500" />
                                <span>Enable Unit</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  setActionAnchorEl(null);
                                  handleDisableEquipment(item.id, item.name);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Ban size={14} className="text-rose-500" />
                                <span>Disable Unit</span>
                              </button>
                            )}
                          </ActionPopover>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div>
              Showing <span className="font-extrabold text-slate-900 dark:text-white">{startIndex + 1}</span> to{" "}
              <span className="font-extrabold text-slate-900 dark:text-white">{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)}</span> of{" "}
              <span className="font-extrabold text-slate-900 dark:text-white">{filtered.length}</span> equipment units
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-bold mr-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Equipment Modal */}
      <EquipmentModal
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        formData={formData}
        setFormData={setFormData}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        handleAddEquipment={handleAddEquipment}
        handleEditEquipmentSubmit={handleEditEquipmentSubmit}
        isSubmitting={isSubmitting}
        categories={categories.length > 0 ? categories : categoryNames}
        existingUnits={units}
      />

      {/* Detail Modal */}
      <EquipmentDetailModal
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        allUnits={units}
      />

      {/* Disable Unit Confirmation Modal */}
      <ConfirmModal
        open={!!disableModalTarget}
        onClose={() => !isDisabling && setDisableModalTarget(null)}
        onConfirm={confirmDisableEquipment}
        variant="disable"
        title="Disable Equipment Unit"
        message={`Are you sure you want to disable physical unit "${disableModalTarget?.name}"? It will appear greyed out but can be re-enabled at any time.`}
        confirmLabel="Disable Unit"
        cancelLabel="Cancel"
        loading={isDisabling}
      />

      {/* Enable Unit Confirmation Modal */}
      <ConfirmModal
        open={!!enableModalTarget}
        onClose={() => !isEnabling && setEnableModalTarget(null)}
        onConfirm={confirmEnableEquipment}
        variant="enable"
        title="Enable Equipment Unit"
        message={`Re-enable physical unit "${enableModalTarget?.name}"? It will be restored to active inventory.`}
        confirmLabel="Enable Unit"
        cancelLabel="Cancel"
        loading={isEnabling}
      />
    </div>
  );
}
