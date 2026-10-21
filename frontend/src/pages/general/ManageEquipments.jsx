import { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import { fetchWithCache, invalidateCache } from "@/lib/apiCache";
import {
  PackageOpen, Plus, Search, Filter, Edit3, Ban, CheckCircle2,
  AlertTriangle, Barcode, Eye, Copy, Check,
  ChevronLeft, ChevronRight, LayoutGrid, Loader2, MoreVertical,
  CircleCheck, Layers, PackageCheck, ArrowUpDown, Download, Upload,
  FileSpreadsheet, ChevronDown
} from "lucide-react";
import EquipmentDetailModal from "./components/EquipmentDetailModal";
import EquipmentModal, { generateSequentialBarcodes } from "./components/EquipmentModal";
import EquipmentImportModal from "./components/EquipmentImportModal";
import { exportEquipmentList } from "./equipmentExportHelper";
import ActionPopover from "@/components/ui/action-popover";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { PageLoader } from "@/components/ui/page-loader";
import { StatusBadge } from "@/components/ui/status-badge";
import { usePermissions } from "@/hooks/usePermissions";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import ExportModal, { filterRecordsByBounds } from "@/components/ui/ExportModal";
import ExportButton from "@/components/ui/ExportButton";
import FilterDropdown from "@/components/ui/FilterDropdown";

const getUnitSeqNumber = (item) => {
  if (item?.seq_no !== null && item?.seq_no !== undefined && String(item.seq_no).trim() !== "") {
    const match = String(item.seq_no).trim().match(/\d+/);
    if (match) return parseInt(match[0], 10);
  }
  // Fallback for legacy units where seq_no was embedded in name or model (e.g. "#1", "PHILIPS #001")
  const fallbackStr = `${item?.name || ""} ${item?.model || ""}`;
  const match = fallbackStr.match(/#(\d+)/);
  if (match) return parseInt(match[1], 10);
  return null;
};

export default function ManageEquipments() {
  const { hasPermission } = usePermissions();
  const context = useOutletContext();
  const location = useLocation();

  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeStatus, setActiveStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get("search") || p.get("barcode") || "";
    } catch {
      return "";
    }
  });

  const [highlightBarcode, setHighlightBarcode] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get("barcode") || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("search") || params.get("barcode") || location.state?.search;
    const hl = params.get("barcode") || location.state?.highlightBarcode || (params.get("search") && !params.get("search").includes(" ") ? params.get("search") : null);
    if (q) {
      setSearchQuery(q);
      setActiveCategory("all");
      setActiveStatus("all");
    }
    if (hl) {
      setHighlightBarcode(String(hl).trim());
      const timer = setTimeout(() => {
        setHighlightBarcode(null);
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [location.search, location.state]);
  const [sortOrder, setSortOrder] = useState("seq_asc"); // "seq_asc" | "seq_desc" | "oldest" | "newest"
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

  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async ({ timeframe, format, bounds, customStart, customEnd }) => {
    setIsExporting(true);
    try {
      const filteredUnitsToExport = filterRecordsByBounds(
        units,
        bounds,
        (u) => u.purchased_at || u.created_at || u.date_purchased
      );
      if (filteredUnitsToExport.length === 0) {
        notify.warning("No Records Found", "No equipment units match the selected timeframe.");
        return;
      }
      await exportEquipmentList(filteredUnitsToExport, format);
      notify.success(`Exported ${filteredUnitsToExport.length} equipment units as ${format.toUpperCase()}.`);
      setShowExportModal(false);
    } catch (e) {
      console.error(e);
      notify.error("Failed to export equipment units.");
    } finally {
      setIsExporting(false);
    }
  };

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
    seq_no: "",
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
    seq_no: "",
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
      invalidateCache("equipment_units");
      const [catData, unitRes] = await Promise.all([
        fetchWithCache("equipment_types_list", () => api.get('/general/equipment-types').then(r => r.data).catch(() => [])),
        api.get(`/general/equipment-units?_t=${Date.now()}`).catch(() => ({ data: [] })),
      ]);

      const catList = Array.isArray(catData) ? catData : [];
      const unitData = Array.isArray(unitRes.data) ? unitRes.data : [];

      setCategories(catList);

      // Identify all child units assigned to parents
      const childIdSet = new Set();
      unitData.forEach(p => {
        let raw = p.built_in_units;
        if (typeof raw === 'string') {
          try { raw = JSON.parse(raw); } catch { raw = []; }
        }
        if (Array.isArray(raw)) {
          raw.forEach(id => {
            if (id) {
              if (typeof id === 'object' && id !== null && id.id) {
                childIdSet.add(String(id.id).trim().toLowerCase());
              } else {
                childIdSet.add(String(id).trim().toLowerCase());
              }
            }
          });
        }
      });

      const allMappedUnits = unitData.map((u, idx) => {
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

        const isChild = childIdSet.has(String(u.id).toLowerCase()) ||
          (u.barcode && childIdSet.has(String(u.barcode).trim().toLowerCase())) ||
          (u.serial_number && childIdSet.has(String(u.serial_number).trim().toLowerCase()));

        let dbStatus = dbStatusRaw;
        // Damaged / Lost / Repair takes precedence
        if (
          ['lost', 'damaged', 'under repair', 'worn', 'minor wear'].includes(conditionLabel.toLowerCase()) ||
          ['damaged', 'maintenance', 'under_maintenance', 'decommissioned', 'unavailable', 'lost'].includes(dbStatusRaw)
        ) {
          dbStatus = 'unavailable';
        } else if (isChild || dbStatusRaw === 'built-in' || dbStatusRaw === 'built_in') {
          dbStatus = 'Built-in';
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
          seq_no: u.seq_no || '',
          serial_number: u.serial_number || u.barcode || bCode,
          barcode: bCode,
          name: derivedName,
          category: catName,
          office_id: eqType?.office_id || u.office_id || null,
          office_name: eqType?.office?.name || 'AVR Office I',
          status: dbStatus,
          condition: conditionLabel,
          is_child: isChild,
          available_count: dbStatus === 'Available' ? 1 : 0,
          total_count: 1,
          date_purchased: u.purchased_at ? u.purchased_at.substring(0, 10) : '2026-01-15',
          lifespan_years: u.eq_lifespan || 5,
          description: u.description || '',
          is_disabled: !!u.is_disabled,
          raw_status: dbStatusRaw,
          raw_condition: dbCondition,
          created_at: u.created_at || null,
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
      });

      // Parent units with built-in child units remain available
      setUnits(allMappedUnits);

    } catch {
      setUnits([]);
      setCategories([]);
    } finally {
      setLoading(false);
      if (!isSilent) setIsSyncing(false);
    }
  }, []);

  useRealtimeSync(fetchEquipments, {
    interval: 30000,
    enabled: !showAddModal && !editingItem,
  });

  useEffect(() => {
    const handleSync = () => {
      invalidateCache("equipment_types_list");
      fetchEquipments(true);
    };
    window.addEventListener("equipment_updated", handleSync);
    window.addEventListener("equipment_inventory_updated", handleSync);
    window.addEventListener("equipment_categories_updated", handleSync);
    const handleStorage = (e) => {
      if (
        (e.key && e.key.includes("equipment")) ||
        e.key === "fsuu_category_updated_ping"
      ) {
        handleSync();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("equipment_updated", handleSync);
      window.removeEventListener("equipment_inventory_updated", handleSync);
      window.removeEventListener("equipment_categories_updated", handleSync);
      window.removeEventListener("storage", handleStorage);
    };
  }, [fetchEquipments]);

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
      seq_no: "",
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

    const matchedCat = categories.find(c =>
      (c.eq_name || c.name || "").toLowerCase() === (formData.category || "").toLowerCase()
    ) || categories[0];

    if (!matchedCat || !matchedCat.id) {
      notify.error("Category Error", "Please select or create an Equipment Category before adding units.");
      return;
    }

    // Duplicate check for Seq No. within the SAME Equipment Category
    const enteredSeqNo = (formData.seq_no || "").trim();
    if (enteredSeqNo) {
      const isSameCategory = (u) => {
        const uCat = String(u.category || u.equipment_type?.eq_name || u.equipment_type?.name || "").trim().toLowerCase();
        const targetCat = String(formData.category || matchedCat.eq_name || matchedCat.name || "").trim().toLowerCase();
        if (uCat && uCat === targetCat) return true;
        if (matchedCat && matchedCat.id && u.equipment_type_id && String(u.equipment_type_id) === String(matchedCat.id)) return true;
        return false;
      };

      const duplicateSeq = units.find(u =>
        u.seq_no !== null &&
        u.seq_no !== undefined &&
        String(u.seq_no).trim() !== "" &&
        String(u.seq_no).trim().toLowerCase() === enteredSeqNo.toLowerCase() &&
        isSameCategory(u)
      );

      if (duplicateSeq) {
        notify.error(
          "Duplicate Seq. No.",
          `Seq. No. "${enteredSeqNo}" already exists in "${formData.category || matchedCat.eq_name || matchedCat.name}". Seq. No. must be unique within the same Equipment Category.`
        );
        return;
      }
    }

    setIsSubmitting(true);

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
      seq_no: formData.seq_no || "",
      serial_number: enteredSerial || `SN-${Date.now().toString().slice(-6)}`,
      barcode: enteredSerial || `SN-${Date.now().toString().slice(-6)}`,
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
      created_at: new Date().toISOString(),
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
        seq_no: formData.seq_no || undefined,
        serial_number: enteredSerial || undefined,
        barcode: enteredSerial || undefined,
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
                seq_no: saved.seq_no || optimisticUnit.seq_no,
                serial_number: saved.serial_number || optimisticUnit.serial_number,
                barcode: saved.barcode || optimisticUnit.barcode,
                built_in_units: Array.isArray(saved.built_in_units) ? saved.built_in_units : validBuiltIns,
                created_at: saved.created_at || optimisticUnit.created_at,
                _optimistic: false,
              }
            : u
        ));
      }

      invalidateCache("equipment_types_list");
      invalidateCache("dashboard");
      invalidateCache();
      try { localStorage.removeItem("fsuu_cache_admin_dashboard"); } catch {}
      try { localStorage.removeItem("fsuu_equipment_types"); } catch {}
      window.dispatchEvent(new Event("equipment_updated"));
      window.dispatchEvent(new Event("equipment_inventory_updated"));
      try { localStorage.setItem("fsuu_equipment_updated_ping", Date.now().toString()); } catch {}

      notify.success(
        "Equipment Unit Added",
        `Physical unit "${unitDisplayName}" registered under ${matchedCat.eq_name || matchedCat.name}.`
      );

      setFormData({
        brand: "",
        model: "",
        seq_no: "",
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

    // Duplicate check for Serial No.
    if (enteredSerial) {
      const duplicateSerial = units.find(u =>
        String(u.id) !== String(editingItem.id) &&
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

    const matchedCat = categories.find(c =>
      (c.eq_name || c.name || "").toLowerCase() === (editFormData.category || "").toLowerCase()
    ) || categories[0];

    // Duplicate check for Seq No. within the SAME Equipment Category
    const enteredSeqNo = (editFormData.seq_no || "").trim();
    if (enteredSeqNo) {
      const isSameCategory = (u) => {
        const uCat = String(u.category || u.equipment_type?.eq_name || u.equipment_type?.name || "").trim().toLowerCase();
        const targetCat = String(editFormData.category || matchedCat?.eq_name || matchedCat?.name || "").trim().toLowerCase();
        if (uCat && uCat === targetCat) return true;
        if (matchedCat && matchedCat.id && u.equipment_type_id && String(u.equipment_type_id) === String(matchedCat.id)) return true;
        return false;
      };

      const duplicateSeq = units.find(u =>
        String(u.id) !== String(editingItem.id) &&
        u.seq_no !== null &&
        u.seq_no !== undefined &&
        String(u.seq_no).trim() !== "" &&
        String(u.seq_no).trim().toLowerCase() === enteredSeqNo.toLowerCase() &&
        isSameCategory(u)
      );

      if (duplicateSeq) {
        notify.error(
          "Duplicate Seq. No.",
          `Seq. No. "${enteredSeqNo}" already exists in "${editFormData.category || matchedCat?.eq_name || matchedCat?.name}". Seq. No. must be unique within the same Equipment Category.`
        );
        return;
      }
    }

    setIsSubmitting(true);

    const brandModel = [editFormData.brand, editFormData.model].filter(Boolean).join(' ');
    const unitDisplayName = brandModel || matchedCat.eq_name || matchedCat.name || 'Unit';
    const validBuiltIns = (editFormData.built_in_units || []).filter(Boolean);

    // ── OPTIMISTIC: update row immediately ────────────────────────────────────
    const prevUnits = units;
    const optimisticChanges = {
      name: unitDisplayName,
      brand: editFormData.brand || "",
      model: editFormData.model || "",
      seq_no: editFormData.seq_no || "",
      serial_number: enteredSerial || editFormData.serial_number,
      barcode: enteredSerial || editFormData.serial_number,
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
        seq_no: editFormData.seq_no || undefined,
        serial_number: enteredSerial || undefined,
        barcode: enteredSerial || undefined,
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
      invalidateCache();
      try { localStorage.removeItem("fsuu_cache_admin_dashboard"); } catch {}
      try { localStorage.removeItem("fsuu_equipment_types"); } catch {}
      window.dispatchEvent(new Event("equipment_updated"));
      window.dispatchEvent(new Event("equipment_inventory_updated"));
      try { localStorage.setItem("fsuu_equipment_updated_ping", Date.now().toString()); } catch {}
      notify.success("Equipment Updated", `"${unitDisplayName}" saved successfully.`);
      fetchEquipments(true);
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
      invalidateCache();
      try { localStorage.removeItem("fsuu_cache_admin_dashboard"); } catch {}
      try { localStorage.removeItem("fsuu_equipment_types"); } catch {}
      window.dispatchEvent(new Event("equipment_updated"));
      window.dispatchEvent(new Event("equipment_inventory_updated"));
      try { localStorage.setItem("fsuu_equipment_updated_ping", Date.now().toString()); } catch {}
      notify.info("Unit Disabled", `"${name}" has been disabled and appears greyed out.`);
      setDisableModalTarget(null);
      fetchEquipments(true);
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
      invalidateCache();
      try { localStorage.removeItem("fsuu_cache_admin_dashboard"); } catch {}
      try { localStorage.removeItem("fsuu_equipment_types"); } catch {}
      window.dispatchEvent(new Event("equipment_updated"));
      window.dispatchEvent(new Event("equipment_inventory_updated"));
      try { localStorage.setItem("fsuu_equipment_updated_ping", Date.now().toString()); } catch {}
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
    const list = units.filter(item => {
      if (selectedOfficeId && selectedOfficeId !== "all") {
        const offId = item.office_id || item.equipment_type?.office_id || item.equipmentType?.office_id;
        const offName = item.office_name || item.office?.name;
        if (offId && String(offId) !== String(selectedOfficeId)) return false;
        if (offName && officeScope && officeScope !== "All Offices" && !offName.toLowerCase().includes(officeScope.toLowerCase())) {
          return false;
        }
      }
      const matchCategory = activeCategory === "all" || (item.category || "").toLowerCase() === activeCategory.toLowerCase();
      const matchStatus = activeStatus === "all" || (() => {
        const uStatus = String(item.status || "available").toLowerCase();
        const uCond = String(item.condition || "good").toLowerCase();
        const sel = activeStatus.toLowerCase();
        if (sel === "available") return uStatus === "available" && uCond !== "damaged" && uCond !== "lost" && uCond !== "under repair";
        if (sel === "released") return ["released", "in_use", "borrowed", "in-use"].includes(uStatus);
        if (sel === "reserved") return uStatus === "reserved";
        if (sel === "damaged") return uStatus === "damaged" || uCond === "damaged";
        if (sel === "under repair") return uCond === "under repair" || uCond === "maintenance" || uStatus === "maintenance";
        if (sel === "lost") return uStatus === "lost" || uCond === "lost" || uStatus === "decommissioned";
        if (sel === "unavailable") return ["damaged", "lost", "unavailable", "maintenance", "decommissioned"].includes(uStatus) || ["damaged", "lost", "under repair"].includes(uCond);
        return uStatus.includes(sel) || uCond.includes(sel);
      })();
      const q = searchQuery.toLowerCase();
      const matchSearch = !searchQuery ||
        (item.name || "").toLowerCase().includes(q) ||
        (item.serial_number || "").toLowerCase().includes(q) ||
        (item.barcode || "").toLowerCase().includes(q) ||
        (item.seq_no && String(item.seq_no).toLowerCase().includes(q));
      return matchCategory && matchStatus && matchSearch;
    });

    return list.sort((a, b) => {
      if (sortOrder === "seq_asc" || sortOrder === "seq_desc") {
        // 1. Group by Category first (alphabetically)
        const catA = (a.category || "").toLowerCase();
        const catB = (b.category || "").toLowerCase();
        if (catA !== catB) {
          return catA.localeCompare(catB);
        }

        // 2. Sort by Sequence Number starting from 001 within this category
        const numA = getUnitSeqNumber(a);
        const numB = getUnitSeqNumber(b);

        if (numA !== null && numB !== null) {
          if (numA !== numB) {
            return sortOrder === "seq_desc" ? numB - numA : numA - numB;
          }
        } else if (numA !== null) {
          return -1; // Numbered units come first (starting from 001)
        } else if (numB !== null) {
          return 1;
        }

        // 3. Tie-breaker for identical or missing seq_no: creation time then id
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (timeA && timeB && timeA !== timeB) return timeA - timeB;
        return (a.id || 0) - (b.id || 0);
      }

      // Traditional date sorting (Oldest to Newest / Newest to Oldest)
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;

      let diff = 0;
      if (timeA && timeB && timeA !== timeB) {
        diff = timeA - timeB;
      } else {
        const idA = typeof a.id === "number" ? a.id : (parseInt(String(a.id).replace(/\D/g, ""), 10) || 0);
        const idB = typeof b.id === "number" ? b.id : (parseInt(String(b.id).replace(/\D/g, ""), 10) || 0);
        diff = idA - idB;
      }

      return sortOrder === "newest" ? -diff : diff;
    });
  }, [units, selectedOfficeId, officeScope, activeCategory, activeStatus, searchQuery, sortOrder]);

  const parentUnitMap = useMemo(() => {
    const map = new Map();
    units.forEach((parent) => {
      let rawList = parent.built_in_units;
      if (typeof rawList === "string") {
        try { rawList = JSON.parse(rawList); } catch { rawList = []; }
      }
      if (Array.isArray(rawList)) {
        rawList.forEach((childRef) => {
          if (!childRef) return;
          const childId = (typeof childRef === "object" && childRef !== null && childRef.id)
            ? String(childRef.id).trim()
            : String(childRef).trim();
          map.set(childId, parent);
          map.set(childId.toLowerCase(), parent);

          const matchedChild = units.find(u =>
            String(u.id) === childId ||
            (u.serial_number && String(u.serial_number).trim().toLowerCase() === childId.toLowerCase()) ||
            (u.barcode && String(u.barcode).trim().toLowerCase() === childId.toLowerCase())
          );
          if (matchedChild) {
            map.set(String(matchedChild.id), parent);
            map.set(String(matchedChild.id).toLowerCase(), parent);
            if (matchedChild.barcode) {
              map.set(String(matchedChild.barcode).trim(), parent);
              map.set(String(matchedChild.barcode).trim().toLowerCase(), parent);
            }
            if (matchedChild.serial_number) {
              map.set(String(matchedChild.serial_number).trim(), parent);
              map.set(String(matchedChild.serial_number).trim().toLowerCase(), parent);
            }
          }
        });
      }
    });
    return map;
  }, [units]);

  const resolveBundledUnits = useCallback((item) => {
    let rawList = item.built_in_units;
    if (typeof rawList === "string") {
      try { rawList = JSON.parse(rawList); } catch { rawList = []; }
    }
    if (!Array.isArray(rawList) || rawList.length === 0) return [];
    return rawList.map(ref => {
      if (!ref) return null;
      if (typeof ref === "object" && ref !== null) {
        return ref;
      }
      const strRef = String(ref).trim();
      const matched = units.find(u => 
        String(u.id) === strRef ||
        (u.serial_number && String(u.serial_number).trim().toLowerCase() === strRef.toLowerCase()) ||
        (u.barcode && String(u.barcode).trim().toLowerCase() === strRef.toLowerCase())
      );
      if (matched) return matched;
      return { id: strRef, barcode: strRef, serial_number: strRef, name: strRef };
    }).filter(Boolean);
  }, [units]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery, sortOrder]);

  useEffect(() => {
    if (!highlightBarcode || filtered.length === 0) return;
    const targetIdx = filtered.findIndex(u =>
      (u.barcode && String(u.barcode).toLowerCase() === highlightBarcode.toLowerCase()) ||
      (u.serial_number && String(u.serial_number).toLowerCase() === highlightBarcode.toLowerCase())
    );
    if (targetIdx !== -1) {
      const targetPage = Math.floor(targetIdx / ITEMS_PER_PAGE) + 1;
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      }
    }
  }, [highlightBarcode, filtered, currentPage]);

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

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="flex items-center justify-end gap-2.5">
        {/* Unified Institutional Export Button */}
        <ExportButton
          disabled={units.length === 0}
          loading={isExporting}
          onClick={() => setShowExportModal(true)}
          title="Export Equipment Inventory to Excel or CSV"
        />

        {/* Import Button */}
        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
        >
          <Upload size={15} className="text-blue-600" />
          <span>Import</span>
        </button>

        {/* Add Equipment Button */}
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs"
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
        <div className="fixed bottom-6 right-6 z-[3000] bg-slate-900 text-white text-xs font-extrabold px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-sm animate-in slide-in-from-bottom-5 duration-300 border border-slate-700 max-w-md">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#111827] p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Category Filter Dropdown (Capped at 5 visible items with scroll) */}
          <FilterDropdown
            value={activeCategory}
            onChange={setActiveCategory}
            options={categoryList.map((t) => ({ value: t.id, label: t.label }))}
            icon={Layers}
            label=""
            title="Filter by Equipment Category"
            className="w-full sm:w-auto"
          />

          {/* Status Filter Dropdown (Capped at 5 visible items with scroll) */}
          <FilterDropdown
            value={activeStatus}
            onChange={setActiveStatus}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "available", label: "Available" },
              { value: "released", label: "Released" },
              { value: "reserved", label: "Reserved" },
              { value: "damaged", label: "Damaged" },
              { value: "under repair", label: "Under Repair" },
              { value: "lost", label: "Lost" },
              { value: "unavailable", label: "Unavailable" },
            ]}
            icon={Filter}
            label="Status:"
            title="Filter by Status"
            className="w-full sm:w-auto"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          {/* Sort Filter Dropdown */}
          <FilterDropdown
            value={sortOrder}
            onChange={setSortOrder}
            options={[
              { value: "seq_asc", label: "Sequence (Ascending)" },
              { value: "seq_desc", label: "Sequence (Descending)" },
              { value: "oldest", label: "Date (Oldest First)" },
              { value: "newest", label: "Date (Newest First)" },
            ]}
            icon={ArrowUpDown}
            label="Sort:"
            title="Sort Equipment"
            className="w-full sm:w-auto"
          />

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
      </div>

      {/* Physical Units Table */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
                {["#", "Serial No.", "Seq No.", "Equipment Unit Name", "Built-In", "Status", "Date Purchased", "Lifespan vs Current", "Action"].map((h, i) => (
                  <th key={h} className={`px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap ${i === 0 ? 'rounded-tl-2xl' : i === 8 ? 'rounded-tr-2xl' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
              {loading && units.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <Loader2 size={20} className="animate-spin inline mr-2" /> Loading equipment units...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
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
                  const isHighlighted = Boolean(
                    highlightBarcode && (
                      (item.barcode && String(item.barcode).toLowerCase() === highlightBarcode.toLowerCase()) ||
                      (item.serial_number && String(item.serial_number).toLowerCase() === highlightBarcode.toLowerCase())
                    )
                  );

                  return (
                    <tr
                      key={item.id}
                      ref={isHighlighted ? (el) => {
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      } : undefined}
                      className={`transition-all duration-300 ${
                        isHighlighted
                          ? 'bg-rose-50/95 dark:bg-rose-950/60 ring-2 ring-rose-500 shadow-sm relative z-20 font-bold'
                          : isOpen
                          ? 'relative z-30'
                          : item.is_disabled
                          ? 'opacity-50 grayscale bg-slate-50 dark:bg-slate-900/50'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="px-4 py-3.5 font-bold text-slate-400 dark:text-slate-500">{displayIndex}</td>
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{item.serial_number || item.barcode}</span>
                          {isHighlighted && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-600 text-white shadow-xs animate-pulse">
                              <AlertTriangle size={10} /> Flagged Unit
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {(() => {
                          if (item.seq_no && String(item.seq_no).trim() !== "") {
                            const trimmed = String(item.seq_no).trim();
                            return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
                          }
                          const num = getUnitSeqNumber(item);
                          if (num !== null) {
                            return `#${String(num).padStart(3, "0")}`;
                          }
                          return <span className="text-slate-300 dark:text-slate-600 font-bold">—</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3.5 max-w-[280px]">
                        <span className="font-extrabold text-slate-900 dark:text-white truncate block text-xs" title={item.name}>
                          {item.name}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate block mt-0.5">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300 max-w-[180px]">
                        {(() => {
                          const parent = parentUnitMap.get(String(item.id)) ||
                            (item.barcode ? parentUnitMap.get(String(item.barcode)) : null) ||
                            (item.serial_number ? parentUnitMap.get(String(item.serial_number)) : null);
                          return parent
                            ? <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block" title={parent.name}>{parent.name}</span>
                            : <span className="text-slate-300 dark:text-slate-600">—</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {(() => {
                          const st = String(item.status || 'Available').toLowerCase();
                          const cond = String(item.condition || item.raw_condition || '').toLowerCase();
                          const parent = parentUnitMap.get(String(item.id)) ||
                            (item.barcode ? parentUnitMap.get(String(item.barcode)) : null) ||
                            (item.serial_number ? parentUnitMap.get(String(item.serial_number)) : null);
                          const isBuiltIn = Boolean(item.is_child) || st === 'built-in' || st === 'built_in' || Boolean(parent);

                          if (['lost', 'decommissioned'].includes(cond) || st === 'lost' || st === 'decommissioned') {
                            return <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400">Lost</span>;
                          }
                          if (['damaged', 'under repair', 'worn', 'minor wear'].includes(cond) || ['damaged', 'maintenance', 'under_maintenance'].includes(st)) {
                            return <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400">Damaged</span>;
                          }

                          // If unit is a built-in child whose parent is damaged or lost:
                          if (isBuiltIn && parent) {
                            const pCond = String(parent.condition || parent.raw_condition || '').toLowerCase();
                            const pSt = String(parent.status || parent.raw_status || '').toLowerCase();
                            const isParentBroken = ['damaged', 'lost', 'decommissioned', 'under repair'].includes(pCond) || ['damaged', 'lost', 'decommissioned', 'maintenance', 'under_maintenance'].includes(pSt);
                            if (isParentBroken || st === 'unavailable') {
                              return <span className="text-[11px] font-bold text-amber-500 dark:text-amber-400" title="Parent kit damaged">Unavailable</span>;
                            }
                            return <span className="text-[11px] font-bold text-violet-500 dark:text-violet-400">Built-in</span>;
                          }

                          if (st === 'available') {
                            return <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Available</span>;
                          }
                          if (st === 'released' || st === 'in-use' || st === 'in_use') {
                            return <span className="text-[11px] font-bold text-blue-500 dark:text-blue-400">Released</span>;
                          }
                          if (st === 'reserved') {
                            return <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400">Reserved</span>;
                          }
                          return <span className="text-[11px] font-bold text-amber-500 dark:text-amber-400">Unavailable</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap text-xs">
                        {item.date_purchased || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap text-xs">
                        {ageYears.toFixed(1)} / {lifespanYears} yrs
                      </td>
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
                                  seq_no: item.seq_no || "",
                                  serial_number: item.serial_number || item.barcode || "",
                                  barcode: item.barcode || "",
                                  category: item.category || "",
                                  date_purchased: item.date_purchased || "",
                                  lifespan_years: String(item.lifespan_years || 5),
                                  status: parentUnitMap.has(String(item.id)) || String(item.status).toLowerCase() === "built-in" ? "built-in" : (item.status || "available"),
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
        onCategoryCreated={() => {
          fetchEquipments(true);
        }}
      />

      {/* Detail Modal */}
      <EquipmentDetailModal
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        allUnits={units}
        handleOpenEditModal={(item) => {
          setSelectedItem(null);
          setEditingItem(item);
          setEditFormData({
            brand: item.brand || "",
            model: item.model || "",
            seq_no: item.seq_no || "",
            serial_number: item.serial_number || item.barcode || "",
            category: item.category || "",
            status: item.status ? String(item.status).toLowerCase() : "available",
            condition: item.condition || "Good",
            date_purchased: item.date_purchased || "",
            lifespan_years: item.lifespan_years || 5,
            built_in_units: Array.isArray(item.built_in_units) ? item.built_in_units : [],
            built_in_models: item.built_in_models || {},
            description: item.description || "",
          });
        }}
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

      {/* Equipment Batch Import Modal */}
      <EquipmentImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => fetchEquipments(true)}
      />

      {/* Reusable Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Equipment Inventory"
        subtitle="Choose timeframe and format to export physical equipment units."
        formats={["xlsx", "csv"]}
        defaultFormat="xlsx"
        records={units}
        dateAccessor={(u) => u.purchased_at || u.created_at || u.date_purchased}
        onExport={handleExport}
        isExporting={isExporting}
      />
    </div>
  );
}
