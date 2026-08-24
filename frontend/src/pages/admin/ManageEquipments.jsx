import { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import notify from "@/lib/notify";
import { fetchWithCache, invalidateCache } from "@/lib/apiCache";
import {
  PackageOpen, Plus, Search, Filter, Edit3, Trash2, CheckCircle2,
  AlertTriangle, RefreshCw, Barcode, Eye, Copy, Check,
  ChevronLeft, ChevronRight, LayoutGrid, Loader2, MoreVertical
} from "lucide-react";
import EquipmentDetailModal from "./components/EquipmentDetailModal";
import EquipmentModal from "./components/EquipmentModal";
import { PageLoader } from "@/components/ui/page-loader";
import { StatusBadge } from "@/components/ui/status-badge";

export default function ManageEquipments() {
  const context = useOutletContext();

  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copiedBarcode, setCopiedBarcode] = useState(null);
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
    name: "",
    barcode: "",
    category: "",
    date_purchased: new Date().toISOString().split("T")[0],
    lifespan_years: "5",
    total_units: "1",
    status: "available",
    description: "",
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    barcode: "",
    category: "",
    date_purchased: "2026-03-15",
    lifespan_years: "5",
    total_units: "1",
    status: "available",
    description: "",
  });

  const fetchEquipments = useCallback(async () => {
    setLoading(true);
    try {
      const [catData, unitRes] = await Promise.all([
        fetchWithCache("equipment_types_list", () => api.get('/admin/equipment-types').then(r => r.data).catch(() => [])),
        api.get('/admin/equipment-units').catch(() => ({ data: [] })),
      ]);

      const catList = Array.isArray(catData) ? catData : [];
      const unitData = Array.isArray(unitRes.data) ? unitRes.data : [];

      setCategories(catList);

      setUnits(unitData.map((u, idx) => {
        const bCode = String(u.unit_code || u.barcode || `BC-EQP-2026-00${idx + 1}`).trim();
        const dbStatusRaw = (u.status || 'available').toLowerCase();
        let dbStatus = dbStatusRaw;
        if (['damaged', 'maintenance', 'under_maintenance', 'decommissioned', 'unavailable'].includes(dbStatusRaw)) {
          dbStatus = 'unavailable';
        } else if (dbStatusRaw === 'released' || dbStatusRaw === 'in-use' || dbStatusRaw === 'released / in-use' || dbStatusRaw === 'release / in - use') {
          dbStatus = 'Released';
        } else {
          dbStatus = 'Available';
        }

        const dbCondition = u.condition || '';

        // Derive human-readable condition from DB value
        let conditionLabel;
        const condLower = dbCondition.toLowerCase();
        if (condLower === 'good' || condLower === 'good condition') conditionLabel = 'Good';
        else if (condLower === 'damaged') conditionLabel = 'Damaged';
        else if (condLower === 'lost') conditionLabel = 'Lost';
        else if (condLower === 'maintenance' || condLower === 'under_maintenance' || condLower === 'under repair') conditionLabel = 'Under Repair';
        else if (condLower === 'worn' || condLower === 'minor wear') conditionLabel = 'Minor Wear';
        else if (dbStatusRaw === 'damaged') conditionLabel = 'Damaged';
        else if (dbStatusRaw === 'maintenance' || dbStatusRaw === 'under_maintenance') conditionLabel = 'Under Repair';
        else if (dbStatusRaw === 'decommissioned' || dbStatusRaw === 'lost') conditionLabel = 'Lost';
        else conditionLabel = 'Good';

        return {
          id: u.id || idx + 1,
          equipment_type_id: u.equipment_type_id,
          brand: u.brand || '',
          model: u.model || '',
          barcode: bCode,
          name: u.name || u.equipmentType?.eq_name || u.equipmentType?.name || 'Equipment Unit',
          category: u.equipmentType?.eq_name || u.equipmentType?.name || 'AV Equipment',
          office_id: u.equipmentType?.office_id || u.equipment_type?.office_id || u.office_id || null,
          office_name: u.equipmentType?.office?.name || u.equipment_type?.office?.name || 'AVR Office I',
          status: dbStatus,
          condition: conditionLabel,
          available_count: dbStatus === 'Available' ? 1 : 0,
          total_count: 1,
          date_purchased: u.purchased_at ? u.purchased_at.substring(0, 10) : '2026-01-15',
          lifespan_years: u.eq_lifespan || 5,
          description: u.description || '',
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
    }
  }, []);

  useEffect(() => {
    fetchEquipments();
    // Re-fetch when post-inspection syncs update unit condition/status
    const handleInventoryUpdate = () => fetchEquipments();
    window.addEventListener("equipment_inventory_updated", handleInventoryUpdate);
    return () => window.removeEventListener("equipment_inventory_updated", handleInventoryUpdate);
  }, [fetchEquipments]);

  const handleOpenAddModal = async () => {
    let activeCats = categories;
    if (!activeCats || activeCats.length === 0) {
      try {
        const res = await api.get('/admin/equipment-types');
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
      name: "",
      brand: "",
      model: "",
      barcode: "",
      category: defaultCatName,
      status: "available",
      condition: "Good",
      date_purchased: new Date().toISOString().split("T")[0],
      lifespan_years: 5,
      description: "",
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

    setIsSubmitting(true);

    const matchedCat = categories.find(c =>
      (c.eq_name || c.name || "").toLowerCase() === (formData.category || "").toLowerCase()
    ) || categories[0];

    const unitDisplayName = formData.name || `${formData.brand ? formData.brand + ' ' : ''}${formData.model || matchedCat.eq_name || 'Unit'}`;

    // ── OPTIMISTIC: add a placeholder row immediately ─────────────────────────
    const tempId = `temp-${Date.now()}`;
    const optimisticUnit = {
      id: tempId,
      equipment_type_id: matchedCat.id,
      brand: formData.brand || "",
      model: formData.model || "",
      barcode: formData.barcode || `BC-${Date.now().toString().slice(-6)}`,
      name: unitDisplayName,
      category: matchedCat.eq_name || matchedCat.name || "AV Equipment",
      status: "Available",
      condition: formData.condition || "Good",
      available_count: 1,
      total_count: 1,
      date_purchased: formData.date_purchased,
      lifespan_years: parseInt(formData.lifespan_years, 10) || 5,
      description: formData.description || "",
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
        name: unitDisplayName,
        unit_code: formData.barcode || optimisticUnit.barcode,
        purchased_at: formData.date_purchased || undefined,
        eq_lifespan: parseInt(formData.lifespan_years, 10) || 5,
        status: formData.status || "available",
        condition: formData.condition || "Good",
        description: formData.description || undefined,
      };

      const res = await api.post("/admin/equipment-units", payload);
      const saved = res.data;

      // Replace temp row with real data from server
      setUnits(prev => prev.map(u =>
        u.id === tempId
          ? { ...optimisticUnit, id: saved.id, barcode: saved.unit_code || saved.barcode || optimisticUnit.barcode, _optimistic: false }
          : u
      ));

      notify.success("Equipment Unit Added", `"${unitDisplayName}" registered under ${matchedCat.eq_name || matchedCat.name}.`);
      setFormData({ name: "", brand: "", model: "", barcode: "", category: matchedCat.eq_name || matchedCat.name || "", status: "available", condition: "Good", date_purchased: new Date().toISOString().split("T")[0], lifespan_years: 5, description: "" });
    } catch (err) {
      // Rollback
      setUnits(prevUnits);
      setShowAddModal(true);
      notify.error("Failed to Save Unit", err.response?.data?.message ?? "An error occurred. Changes were reverted.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEquipmentSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSubmitting(true);

    const matchedCat = categories.find(c =>
      (c.eq_name || c.name || "").toLowerCase() === (editFormData.category || "").toLowerCase()
    ) || categories[0];

    const unitDisplayName = editFormData.name || `${editFormData.brand ? editFormData.brand + ' ' : ''}${editFormData.model || matchedCat.eq_name || 'Unit'}`;

    // ── OPTIMISTIC: update row immediately ────────────────────────────────────
    const prevUnits = units;
    const optimisticChanges = {
      name: unitDisplayName,
      brand: editFormData.brand || "",
      model: editFormData.model || "",
      barcode: editFormData.barcode,
      category: matchedCat.eq_name || matchedCat.name || editingItem.category,
      status: editFormData.status === "available" ? "Available" : "Unavailable",
      condition: editFormData.condition || "Good",
      date_purchased: editFormData.date_purchased,
      lifespan_years: parseInt(editFormData.lifespan_years, 10) || 5,
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
        name: unitDisplayName,
        unit_code: editFormData.barcode,
        purchased_at: editFormData.date_purchased,
        eq_lifespan: parseInt(editFormData.lifespan_years, 10) || 5,
        status: editFormData.status || "available",
        condition: editFormData.condition || "Good",
        description: editFormData.description,
      };
      await api.put(`/admin/equipment-units/${editingItem.id}`, payload);
      // Confirm: remove optimistic flag
      setUnits(prev => prev.map(u => u.id === editingItem.id ? { ...u, _optimistic: false } : u));
      notify.success("Equipment Updated", `"${unitDisplayName}" saved successfully.`);
    } catch (err) {
      // Rollback
      setUnits(prevUnits);
      setEditingItem(editingItem);
      notify.error("Update Failed", err.response?.data?.message ?? "Changes were reverted.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEquipment = async (id, name) => {
    if (!confirm(`Archive physical unit "${name}"? Soft-delete will apply.`)) return;

    // ── OPTIMISTIC: remove row immediately ────────────────────────────────────
    const prevUnits = units;
    setUnits(prev => prev.filter(u => u.id !== id));
    setOpenActionId(null);
    // ─────────────────────────────────────────────────────────────────────────

    try {
      await api.delete(`/admin/equipment-units/${id}`);
      notify.info("Unit Archived", `"${name}" has been removed from active inventory.`);
    } catch {
      setUnits(prevUnits); // Rollback
      notify.error("Archive Failed", "Failed to archive the equipment unit.");
    }
  };

  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";
  const selectedOfficeId = context?.selectedOfficeId;

  const filtered = units.filter(item => {
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
    const matchSearch = !searchQuery || (item.name || "").toLowerCase().includes(q) || (item.barcode || "").toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUnits = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

  const categoryNames = Array.from(new Set(filteredCategories.map(c => c.eq_name || c.name || c.eq_type).filter(Boolean)));
  const categoryList = [
    { id: "all", label: "All Categories" },
    ...categoryNames.map(c => ({ id: c, label: c }))
  ];

  if (loading && units.length === 0) return <PageLoader message="Loading Equipment Inventory..." />;

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={fetchEquipments}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>

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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs text-xs font-bold text-slate-700">
          <Filter size={14} className="text-blue-600 flex-shrink-0" />
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer text-xs pr-2"
          >
            {categoryList.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search unit name, barcode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Physical Units Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {["#", "Unit Barcode", "Equipment Unit Name", "Assigned Category", "Status", "Condition", "Date Purchased", "Lifespan vs Current", "Action"].map((h, i) => (
                  <th key={h} className={`px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap ${i === 0 ? 'rounded-tl-2xl' : i === 8 ? 'rounded-tr-2xl' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {loading ? (
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

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/60 transition-colors ${isOpen ? 'relative z-30' : ''}`}>
                      <td className="px-4 py-3.5 font-bold text-slate-400">{displayIndex}</td>
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-blue-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1.5 bg-blue-50/60 border border-blue-200/60 px-2.5 py-1 rounded-lg w-fit">
                            <Barcode size={14} className="text-blue-500" />
                            <span>{item.barcode}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyBarcode(item.barcode)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                            title="Copy Barcode"
                          >
                            {copiedBarcode === item.barcode ? (
                              <Check size={13} className="text-emerald-600 font-extrabold" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-900 max-w-[200px] truncate" title={item.name}>{item.name}</td>
                      <td className="px-4 py-3.5 font-bold text-blue-700 max-w-[180px]">
                        <span className="bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 block w-fit max-w-full truncate" title={item.category}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          item.condition === "Damaged" || item.condition === "Lost"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : item.condition === "Under Repair" || item.condition === "Minor Wear"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {item.condition || "Good"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{item.date_purchased}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{ageYears.toFixed(1)} / {lifespanYears} yrs</td>
                      <td className="px-4 py-3.5 relative">
                        <div className="relative action-menu-container inline-block">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionId(openActionId === item.id ? null : item.id);
                            }}
                            className={`p-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                              isOpen
                                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                            title="Actions"
                          >
                            <MoreVertical size={15} />
                          </button>

                          {isOpen && (
                            <div className={`absolute right-0 ${isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} w-44 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-md`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  setSelectedItem(item);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Eye size={14} className="text-blue-500" />
                                <span>View Details</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  setEditingItem(item);
                                  setEditFormData({
                                    name: item.name || "",
                                    brand: item.brand || "",
                                    model: item.model || "",
                                    barcode: item.barcode || "",
                                    category: item.category || "",
                                    date_purchased: item.date_purchased || "",
                                    lifespan_years: String(item.lifespan_years || 5),
                                    total_units: "1",
                                    status: item.status || "available",
                                    condition: item.condition || "Good",
                                    description: item.description || "",
                                  });
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Edit3 size={14} className="text-slate-500" />
                                <span>Edit Unit</span>
                              </button>

                              <div className="border-t border-slate-100 my-1"></div>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  handleDeleteEquipment(item.id, item.name);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} className="text-rose-500" />
                                <span>Archive Unit</span>
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

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 text-xs font-semibold text-slate-600">
            <div>
              Showing <span className="font-extrabold text-slate-900">{startIndex + 1}</span> to{" "}
              <span className="font-extrabold text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)}</span> of{" "}
              <span className="font-extrabold text-slate-900">{filtered.length}</span> equipment units
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
      />

      {/* Detail Modal */}
      <EquipmentDetailModal
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
      />
    </div>
  );
}
