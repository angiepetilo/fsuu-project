import { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import { fetchWithCache } from "@/lib/apiCache";
import {
  Save, Loader2, CheckCircle2,
  Barcode, Copy, Check, MoreVertical, Eye,
  ChevronLeft, ChevronRight, Search, Filter
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import EquipmentDetailModal from "../components/EquipmentDetailModal";

export default function EquipmentStockTab({
  filteredInventory = [],
  setInventoryItems,
  loading = false,
  fetchReportsData,
  isStaff = false,
}) {
  const context = useOutletContext();
  const selectedOfficeId = context?.selectedOfficeId;
  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // ── Top Table (Category Stock Audit) Pagination & State ──
  const [categoryPage, setCategoryPage] = useState(1);
  const CATEGORY_ITEMS_PER_PAGE = 10;
  const [inventoryDrafts, setInventoryDrafts] = useState({});

  useEffect(() => {
    setCategoryPage(1);
  }, [filteredInventory.length]);

  const totalCategoryPages = Math.ceil(filteredInventory.length / CATEGORY_ITEMS_PER_PAGE) || 1;
  const startCategoryIndex = (categoryPage - 1) * CATEGORY_ITEMS_PER_PAGE;
  const paginatedInventory = filteredInventory.slice(startCategoryIndex, startCategoryIndex + CATEGORY_ITEMS_PER_PAGE);

  useEffect(() => {
    if (filteredInventory && filteredInventory.length > 0) {
      const drafts = {};
      filteredInventory.forEach((item) => {
        const key = item.id;
        const expected = item.expected_total || item.total_quantity || 1;
        const available = item.available_count ?? item.available ?? expected;
        const maint = item.maintenance ?? item.damaged ?? 0;
        const lost = item.decommissioned ?? item.lost ?? 0;

        let cond = "Good";
        if (maint > 0) cond = "Worn";
        if (lost > 0) cond = "Lost";

        drafts[key] = {
          qty_expected: expected,
          qty_present: available,
          qty_released: item.released_count ?? 0,
          qty_damaged: item.damaged_count ?? 0,
          qty_lost: item.lost_count ?? 0,
          condition: cond,
        };
      });
      setInventoryDrafts(drafts);
    }
  }, [filteredInventory]);



  const handleSubmitInventoryReport = async () => {
    setIsSubmitting(true);
    try {
      await Promise.all(
        filteredInventory.map(item => {
          const draft = inventoryDrafts[item.id];
          if (!draft) return Promise.resolve();
          const mappedStatus = draft.condition === 'Worn' ? 'maintenance' : (draft.condition === 'Damaged' ? 'damaged' : (draft.condition === 'Lost' ? 'decommissioned' : 'available'));

          if (typeof item.id === 'number' && item.id < 1000000) {
            const finalReleased = draft.qty_released ?? (item.released_count || 0);
            const finalDamaged = draft.qty_damaged ?? (item.damaged_count || 0);
            const finalLost = draft.qty_lost ?? (item.lost_count || 0);
            const total = item.calculated_total ?? item.total_quantity ?? 0;
            const newAvailable = Math.max(0, total - finalReleased - finalDamaged - finalLost);

            return api.put(`/admin/equipment-types/${item.id}`, {
              available_count: newAvailable,
              damaged_count: finalDamaged,
              lost_count: finalLost,
              released_count: finalReleased,
              status: mappedStatus,
            }).catch(() => null);
          }
          return Promise.resolve();
        })
      );

      setFeedback("Equipment stock report saved successfully!");
      setTimeout(() => setFeedback(null), 3000);
      if (fetchReportsData) fetchReportsData();
    } catch {
      setFeedback("Failed to update stock backend.");
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Bottom Table (Physical Equipment Units) ──
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);
  const [copiedBarcode, setCopiedBarcode] = useState(null);
  const [unitPage, setUnitPage] = useState(1);
  const UNIT_ITEMS_PER_PAGE = 10;

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

  const fetchUnits = useCallback(async () => {
    setUnitsLoading(true);
    try {
      const [catData, unitRes] = await Promise.all([
        api.get('/admin/equipment-types').then(r => r.data).catch(() => []),
        api.get('/admin/equipment-units').catch(() => ({ data: [] })),
      ]);

      const catList = Array.isArray(catData) ? catData : [];
      const unitData = Array.isArray(unitRes.data) ? unitRes.data : [];

      setCategories(catList);

      setUnits(unitData.map((u, idx) => {
        const bCode = String(u.unit_code || u.barcode || `BC-EQP-2026-00${idx + 1}`).trim();
        const dbStatusRaw = (u.status || 'available').toLowerCase();
        const dbCondition = u.condition || '';
        const condLower = dbCondition.toLowerCase();

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
        };
      }));
    } catch {
      setUnits([]);
      setCategories([]);
    } finally {
      setUnitsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
    const handleInventoryUpdate = () => fetchUnits();
    window.addEventListener("equipment_inventory_updated", handleInventoryUpdate);
    return () => window.removeEventListener("equipment_inventory_updated", handleInventoryUpdate);
  }, [fetchUnits]);

  const filteredUnits = useMemo(() => {
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
      const matchSearch = !searchQuery || (item.name || "").toLowerCase().includes(q) || (item.barcode || "").toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [units, selectedOfficeId, officeScope, activeCategory, searchQuery]);

  useEffect(() => {
    setUnitPage(1);
  }, [activeCategory, searchQuery]);

  const totalUnitPages = Math.ceil(filteredUnits.length / UNIT_ITEMS_PER_PAGE) || 1;
  const startUnitIndex = (unitPage - 1) * UNIT_ITEMS_PER_PAGE;
  const paginatedUnits = filteredUnits.slice(startUnitIndex, startUnitIndex + UNIT_ITEMS_PER_PAGE);

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

  return (
    <div className="space-y-8">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TOP SECTION: CATEGORY STOCK AUDIT TABLE ───────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Equipment Inventory &amp; Stock Audit Tab
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Real-time tracking of expected units, released equipment, and damaged/lost items.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmitInventoryReport}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            <span>Save Stock Report</span>
          </button>
        </div>

        {feedback && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-2xs">
            <CheckCircle2 size={16} className="text-emerald-600" />
            {feedback}
          </div>
        )}

        {/* Category Audit Table with Mobile Responsive Card Grid */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">ITEM NO.</th>
                  <th className="py-3 px-4">CATEGORY</th>
                  <th className="py-3 px-4 text-center">QTY EXPECTED</th>
                  <th className="py-3 px-4 text-center">QTY PRESENT</th>
                  <th className="py-3 px-4 text-center">RELEASED</th>
                  <th className="py-3 px-4 text-center">RESERVED (EVENTS)</th>
                  <th className="py-3 px-4 text-center">DAMAGED</th>
                  <th className="py-3 px-4 text-center">LOST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <Loader2 size={20} className="animate-spin inline mr-2" /> Loading inventory items...
                    </td>
                  </tr>
                ) : filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      No inventory items registered yet.
                    </td>
                  </tr>
                ) : (
                  paginatedInventory.map((item, idx) => {
                    const key = item.id;
                    const itemCode = `EQ-00${startCategoryIndex + idx + 1}`;
                    const categoryName = item.eq_name || item.name || item.category || item.eq_type || "General";
                    const realTotal = typeof item.calculated_total === 'number'
                      ? item.calculated_total
                      : (typeof item.total_quantity === 'number' ? item.total_quantity : 0);

                    const expectedQty = Math.max(0, realTotal);
                    const initialReleased = Math.max(0, typeof item.released_count === 'number' ? item.released_count : 0);
                    const reservedCount = Math.max(0, typeof item.reserved_count === 'number' ? item.reserved_count : 0);
                    const totalDamaged = Math.max(0, typeof item.damaged_count === 'number' ? item.damaged_count : 0);
                    const totalLost = Math.max(0, typeof item.lost_count === 'number' ? item.lost_count : 0);

                    const currentReleased = typeof item.released_count === 'number' ? item.released_count : (draft.qty_released ?? initialReleased);
                    const currentDamaged = typeof item.damaged_count === 'number' ? item.damaged_count : (draft.qty_damaged ?? totalDamaged);
                    const currentLost = typeof item.lost_count === 'number' ? item.lost_count : (draft.qty_lost ?? totalLost);

                    const availablePresent = typeof item.present_count === 'number'
                      ? item.present_count
                      : (typeof item.available_count === 'number' ? item.available_count : Math.max(0, expectedQty - currentReleased - currentDamaged - currentLost));

                    const currentDraft = {
                      qty_released: currentReleased,
                      qty_damaged: currentDamaged,
                      qty_lost: currentLost,
                    };

                    return (
                      <tr key={key || idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600 whitespace-nowrap">{itemCode}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[220px] truncate" title={categoryName}>{categoryName}</td>
                        <td className="py-3.5 px-4 text-center font-extrabold text-slate-900 text-sm">{expectedQty}</td>
                        
                        <td className="py-3.5 px-4 text-center font-extrabold text-sm text-emerald-600">
                          {availablePresent}
                        </td>

                        {/* RELEASED */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                            currentDraft.qty_released > 0
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-50 text-slate-400 border-slate-200"
                          }`}>{currentDraft.qty_released}</span>
                        </td>

                        {/* RESERVED */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                            reservedCount > 0
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-50 text-slate-400 border-slate-200"
                          }`}>
                            {reservedCount}
                          </span>
                        </td>

                        {/* DAMAGED */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                            currentDraft.qty_damaged > 0
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-slate-50 text-slate-400 border-slate-200"
                          }`}>{currentDraft.qty_damaged}</span>
                        </td>

                        {/* LOST */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                            currentDraft.qty_lost > 0
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-50 text-slate-400 border-slate-200"
                          }`}>{currentDraft.qty_lost}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View (< 768px) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Loader2 size={18} className="animate-spin inline mr-2" /> Loading inventory items...
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No inventory items registered yet.
              </div>
            ) : (
              paginatedInventory.map((item, idx) => {
                const itemCode = `EQ-00${startCategoryIndex + idx + 1}`;
                const categoryName = item.eq_name || item.name || item.category || "General";
                const expectedQty = Math.max(0, typeof item.total_quantity === 'number' ? item.total_quantity : 0);
                const available = typeof item.available_count === 'number' ? item.available_count : expectedQty;
                const released = item.released_count || 0;
                const reserved = item.reserved_count || 0;
                const damaged = item.damaged_count || 0;
                const lost = item.lost_count || 0;

                return (
                  <div key={`mob-stock-${item.id || idx}`} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-500">{itemCode}</span>
                      <span className="font-extrabold text-sm text-slate-900">{categoryName}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase">Expected</span>
                        <span className="font-extrabold text-slate-900">{expectedQty}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                        <span className="block text-[10px] text-emerald-600 font-bold uppercase">Present</span>
                        <span className="font-extrabold text-emerald-700">{available}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
                        <span className="block text-[10px] text-blue-600 font-bold uppercase">Released</span>
                        <span className="font-extrabold text-blue-700">{released}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                        <span className="block text-[10px] text-amber-700 font-bold uppercase">Reserved</span>
                        <span className="font-extrabold text-amber-800">{reserved}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                        <span className="block text-[10px] text-rose-600 font-bold uppercase">Damaged</span>
                        <span className="font-extrabold text-rose-700">{damaged}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="block text-[10px] text-slate-500 font-bold uppercase">Lost</span>
                        <span className="font-extrabold text-slate-700">{lost}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          {filteredInventory.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 text-xs font-semibold text-slate-600">
              <div>
                Showing <span className="font-extrabold text-slate-900">{startCategoryIndex + 1}</span> to{" "}
                <span className="font-extrabold text-slate-900">{Math.min(startCategoryIndex + CATEGORY_ITEMS_PER_PAGE, filteredInventory.length)}</span> of{" "}
                <span className="font-extrabold text-slate-900">{filteredInventory.length}</span> inventory stock items
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold mr-2">
                  Page {categoryPage} of {totalCategoryPages}
                </span>
                <button
                  type="button"
                  disabled={categoryPage === 1}
                  onClick={() => setCategoryPage(prev => Math.max(prev - 1, 1))}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                <button
                  type="button"
                  disabled={categoryPage >= totalCategoryPages}
                  onClick={() => setCategoryPage(prev => Math.min(prev + 1, totalCategoryPages))}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── BOTTOM SECTION: PHYSICAL EQUIPMENT UNITS TABLE ─────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm">Physical Equipment Units Inventory</h4>
            <p className="text-xs text-slate-500 font-medium">Individual barcode-tracked units, active conditions, and lifespan statuses.</p>
          </div>
        </div>

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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  {["#", "UNIT BARCODE", "EQUIPMENT UNIT NAME", "ASSIGNED CATEGORY", "STATUS", "CONDITION", "DATE PURCHASED", "LIFESPAN VS CURRENT", "ACTION"].map((h, i) => (
                    <th key={h} className={`px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap ${i === 0 ? 'rounded-tl-2xl' : i === 8 ? 'rounded-tr-2xl' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {unitsLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      <Loader2 size={20} className="animate-spin inline mr-2" /> Loading equipment units...
                    </td>
                  </tr>
                ) : filteredUnits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      📦 No physical equipment units found.
                    </td>
                  </tr>
                ) : (
                  paginatedUnits.map((item, index) => {
                    const lifespanYears = item.lifespan_years || 5;
                    const purchaseYear = item.date_purchased ? parseInt(item.date_purchased.split("-")[0], 10) : 2026;
                    const currentYear = new Date().getFullYear();
                    const ageYears = Math.max(0.5, currentYear - purchaseYear + 0.2);
                    const displayIndex = startUnitIndex + index + 1;
                    const isNearBottom = index >= Math.max(1, paginatedUnits.length - 2);
                    const isOpen = openActionId === item.id;

                    return (
                      <tr key={item.id} className={`hover:bg-slate-50/60 transition-colors ${isOpen ? 'relative z-30' : ''}`}>
                        <td className="px-4 py-3.5 font-bold text-slate-400">{displayIndex}</td>
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-blue-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1.5 bg-blue-50/60 border border-blue-200/60 px-2.5 py-1 rounded-xl w-fit">
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
                        <td className="px-4 py-3.5 font-extrabold text-slate-900 max-w-[200px] truncate" title={item.name}>
                          {item.name}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-blue-700 max-w-[180px]">
                          <span className="bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60 block w-fit max-w-full truncate text-xs" title={item.category}>
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
                              className={`p-1.5 rounded-full border transition-all cursor-pointer shadow-2xs ${
                                isOpen
                                  ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                              title="Actions"
                            >
                              <MoreVertical size={15} />
                            </button>

                            {isOpen && (
                              <div className={`absolute right-0 ${isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} w-40 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-md`}>
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
          {filteredUnits.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 text-xs font-semibold text-slate-600">
              <div>
                Showing <span className="font-extrabold text-slate-900">{startUnitIndex + 1}</span> to{" "}
                <span className="font-extrabold text-slate-900">{Math.min(startUnitIndex + UNIT_ITEMS_PER_PAGE, filteredUnits.length)}</span> of{" "}
                <span className="font-extrabold text-slate-900">{filteredUnits.length}</span> equipment units
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold mr-2">
                  Page {unitPage} of {totalUnitPages}
                </span>
                <button
                  type="button"
                  disabled={unitPage === 1}
                  onClick={() => setUnitPage(prev => Math.max(prev - 1, 1))}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                <button
                  type="button"
                  disabled={unitPage >= totalUnitPages}
                  onClick={() => setUnitPage(prev => Math.min(prev + 1, totalUnitPages))}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <EquipmentDetailModal
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
      />
    </div>
  );
}
