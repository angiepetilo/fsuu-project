import { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import { fetchWithCache, invalidateCache } from "@/lib/apiCache";
import {
  Save, Loader2, CheckCircle2,
  Barcode, Copy, Check, MoreVertical, Eye,
  ChevronLeft, ChevronRight, Search, Filter, Package,
  Layers, PackageCheck
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import EquipmentDetailModal from "../components/EquipmentDetailModal";
import ActionPopover from "@/components/ui/action-popover";

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
        const expected = item.total_quantity ?? item.expected_total ?? 0;
        const available = item.available_count ?? item.present_count ?? 0;
        const maint = item.maintenance ?? item.damaged_count ?? item.damaged ?? 0;
        const lost = item.decommissioned ?? item.lost_count ?? item.lost ?? 0;

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

  // ── Bottom Table (Physical Equipment Units) — declared early so handleSubmitInventoryReport can call fetchUnits ──
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);
  const [actionAnchorEl, setActionAnchorEl] = useState(null);
  const [copiedBarcode, setCopiedBarcode] = useState(null);
  const [unitPage, setUnitPage] = useState(1);
  const UNIT_ITEMS_PER_PAGE = 10;

  const fetchUnits = useCallback(async () => {
    setUnitsLoading(true);
    try {
      const [catData, unitRes] = await Promise.all([
        api.get('/general/equipment-types').then(r => r.data).catch(() => []),
        api.get('/general/equipment-units').catch(() => ({ data: [] })),
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
          serial_number: u.serial_number || u.barcode || bCode,
          barcode: bCode,
          name: derivedName,
          category: catName,
          office_id: eqType?.office_id || u.office_id || null,
          office_name: eqType?.office?.name || 'AVR Office I',
          status: dbStatus,
          condition: conditionLabel,
          is_child: isChild,
          is_disabled: !!u.is_disabled,
          available_count: dbStatus === 'Available' ? 1 : 0,
          total_count: 1,
          date_purchased: u.purchased_at ? u.purchased_at.substring(0, 10) : '2026-01-15',
          lifespan_years: u.eq_lifespan || 5,
          description: u.description || '',
          raw_status: dbStatusRaw,
          raw_condition: dbCondition,
          built_in_units: Array.isArray(u.built_in_units)
            ? u.built_in_units
            : (typeof u.built_in_units === 'string'
                ? (() => { try { return JSON.parse(u.built_in_units); } catch { return []; } })()
                : []),
        };
      });

      // Parent units with built-in child units are counted as available (they are kit packages ready for use)
      setUnits(allMappedUnits);
    } catch {
      setUnits([]);
      setCategories([]);
    } finally {
      setUnitsLoading(false);
    }
  }, []);


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

            return api.put(`/general/equipment-types/${item.id}`, {
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

      // Invalidate any TTL caches for equipment data so next fetch is fresh
      invalidateCache('equipment');
      invalidateCache('academic_terms');

      setFeedback("Equipment stock report saved successfully!");
      setTimeout(() => setFeedback(null), 3000);

      // Trigger silent background refresh of both parent report data and local unit list
      if (fetchReportsData) fetchReportsData({ isSilent: true });
      fetchUnits();

      // Notify other components listening for inventory changes
      window.dispatchEvent(new CustomEvent('equipment_inventory_updated'));
    } catch {
      setFeedback("Failed to update stock backend.");
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsSubmitting(false);
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



  useEffect(() => {
    fetchUnits();
    const handleSync = () => {
      fetchUnits();
      if (fetchReportsData) fetchReportsData({ isSilent: true });
    };
    window.addEventListener("equipment_inventory_updated", handleSync);
    window.addEventListener("equipment_updated", handleSync);
    const handleStorage = (e) => {
      if (e.key && e.key.includes("equipment")) {
        handleSync();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("equipment_inventory_updated", handleSync);
      window.removeEventListener("equipment_updated", handleSync);
      window.removeEventListener("storage", handleStorage);
    };
  }, [fetchUnits, fetchReportsData]);

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

  const computeCategoryStats = useCallback((item) => {
    const categoryName = item.eq_name || item.name || item.category || item.eq_type || "General";
    const matchingUnits = (units || []).filter(u => 
      String(u.equipment_type_id) === String(item.id) || 
      String(u.category || '').trim().toLowerCase() === String(categoryName).trim().toLowerCase()
    );

    let expectedQty = 0;
    let availablePresent = 0;
    let currentReleased = 0;
    let reservedCount = 0;
    let builtInCount = 0;
    let unavailableCount = 0;
    let currentDamaged = 0;
    let currentLost = 0;

    if (matchingUnits.length > 0) {
      expectedQty = matchingUnits.length;

      matchingUnits.forEach(u => {
        const cond = String(u.condition || u.raw_condition || '').toLowerCase();
        const st = String(u.status || u.raw_status || '').toLowerCase();

        // 1. Defective / Lost / Decommissioned check FIRST
        if (['lost', 'decommissioned'].includes(cond) || st === 'lost' || st === 'decommissioned') {
          currentLost++;
          return;
        }
        if (['damaged', 'under repair', 'worn', 'minor wear'].includes(cond) || ['damaged', 'maintenance', 'under_maintenance'].includes(st)) {
          currentDamaged++;
          return;
        }

        // 2. Built-in child check
        const parent = parentUnitMap.get(String(u.id)) ||
          parentUnitMap.get(String(u.id).toLowerCase()) ||
          (u.serial_number && (parentUnitMap.get(String(u.serial_number).trim()) || parentUnitMap.get(String(u.serial_number).trim().toLowerCase()))) ||
          (u.barcode && (parentUnitMap.get(String(u.barcode).trim()) || parentUnitMap.get(String(u.barcode).trim().toLowerCase())));

        const isChild = Boolean(u.is_child) ||
          st === 'built-in' ||
          st === 'built_in' ||
          Boolean(parent);

        if (isChild) {
          // If parent unit is damaged or lost, or unit is marked unavailable:
          // A good child component whose parent is damaged is placed ONLY in Unavailable column, never in Damaged!
          if (parent) {
            const pCond = String(parent.condition || parent.raw_condition || '').toLowerCase();
            const pSt = String(parent.status || parent.raw_status || '').toLowerCase();
            const isParentBroken = ['damaged', 'lost', 'decommissioned', 'under repair'].includes(pCond) || ['damaged', 'lost', 'decommissioned', 'maintenance', 'under_maintenance'].includes(pSt);
            if (isParentBroken || st === 'unavailable') {
              unavailableCount++;
              return;
            }
          } else if (st === 'unavailable') {
            unavailableCount++;
            return;
          }

          // Every healthy built-in child of another unit is NEVER counted as available, but as built-in
          if (['released', 'in_use', 'in-use'].includes(st)) {
            currentReleased++;
          } else if (st === 'reserved') {
            reservedCount++;
          } else {
            builtInCount++;
          }
          return;
        }

        // 3. Standalone unit or Parent unit who has built-in child
        if (['released', 'in_use', 'in-use'].includes(st)) {
          currentReleased++;
        } else if (st === 'reserved') {
          reservedCount++;
        } else if (st === 'unavailable') {
          unavailableCount++;
        } else {
          // Check if any of this parent unit's children are damaged or lost
          let rawList = u.built_in_units;
          if (typeof rawList === "string") {
            try { rawList = JSON.parse(rawList); } catch { rawList = []; }
          }
          let hasBrokenChild = false;
          if (Array.isArray(rawList) && rawList.length > 0) {
            hasBrokenChild = rawList.some(childRef => {
              if (!childRef) return false;
              const childId = (typeof childRef === "object" && childRef !== null && childRef.id) ? String(childRef.id) : String(childRef);
              const matchedChild = units.find(ch => String(ch.id) === childId || String(ch.barcode) === childId || String(ch.serial_number) === childId);
              if (matchedChild) {
                const cCond = String(matchedChild.condition || '').toLowerCase();
                const cSt = String(matchedChild.status || '').toLowerCase();
                return ['damaged', 'lost', 'decommissioned', 'under repair'].includes(cCond) || ['damaged', 'lost', 'decommissioned', 'maintenance'].includes(cSt);
              }
              return false;
            });
          }

          if (hasBrokenChild) {
            unavailableCount++;
          } else {
            // Parent unit who has built-in child is counted ONLY as available!
            availablePresent++;
          }
        }
      });
    } else {
      expectedQty = Math.max(0, typeof item.total_quantity === 'number' ? item.total_quantity : (item.total_units || 0));
      currentDamaged = item.damaged_count || 0;
      currentLost = item.lost_count || 0;
      currentReleased = item.released_count || 0;
      reservedCount = item.reserved_count || 0;
      builtInCount = item.built_in_count ?? item.bundled_count ?? 0;
      unavailableCount = item.unavailable_count || 0;
      availablePresent = typeof item.available_count === 'number'
        ? item.available_count
        : Math.max(0, expectedQty - builtInCount - unavailableCount - currentReleased - reservedCount - currentDamaged - currentLost);
    }

    return {
      expectedQty,
      availablePresent,
      builtInCount,
      unavailableCount,
      reservedCount,
      currentReleased,
      currentDamaged,
      currentLost,
    };
  }, [units, parentUnitMap]);

  const resolveBundledUnits = useCallback((item) => {
    let rawList = item.built_in_units;
    if (typeof rawList === "string") {
      try { rawList = JSON.parse(rawList); } catch { rawList = []; }
    }
    if (!Array.isArray(rawList) || rawList.length === 0) return [];
    return rawList.map(ref => {
      if (!ref) return null;
      if (typeof ref === "object" && ref !== null) return ref;
      const strRef = String(ref).trim();
      const matched = units.find(u => 
        String(u.id) === strRef ||
        (u.serial_number && String(u.serial_number).trim().toLowerCase() === strRef.toLowerCase()) ||
        (u.barcode && String(u.barcode).trim().toLowerCase() === strRef.toLowerCase())
      );
      return matched ? {
        id: matched.id,
        name: matched.name,
        category: matched.category,
        barcode: matched.barcode,
        serial_number: matched.serial_number || matched.barcode
      } : { id: strRef, barcode: strRef, name: `Unit #${strRef}` };
    }).filter(Boolean);
  }, [units]);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
              Stock by Category
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
              Aggregated stock balance of physical units across equipment categories
            </p>
          </div>
        </div>

        {feedback && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-2xs">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Category Audit Table with Mobile Responsive Card Grid */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="px-4 py-3.5 w-16">Photo</th>
                  <th className="px-4 py-3.5">Category Name</th>
                  <th className="px-4 py-3.5 text-center">Total</th>
                  <th className="px-4 py-3.5 text-center">Available</th>
                  <th className="px-4 py-3.5 text-center">Built-In</th>
                  <th className="px-4 py-3.5 text-center">Unavailable</th>
                  <th className="px-4 py-3.5 text-center">Reserved</th>
                  <th className="px-4 py-3.5 text-center">Released</th>
                  <th className="px-4 py-3.5 text-center">Damaged</th>
                  <th className="px-4 py-3.5 text-center">Lost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400 dark:text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={18} className="animate-spin text-blue-600" />
                        <span>Loading inventory items...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400 dark:text-slate-500">
                      📦 No inventory items registered yet.
                    </td>
                  </tr>
                ) : (
                  paginatedInventory.map((item, idx) => {
                    const key = item.id;
                    const categoryName = item.eq_name || item.name || item.category || item.eq_type || "General";
                    const displayPhoto = item.photo || item.avatar;
                    const stats = computeCategoryStats(item);

                    return (
                      <tr key={key || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shadow-inner shrink-0">
                            {displayPhoto ? (
                              <img src={displayPhoto} alt={categoryName} className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <Package size={18} className="text-slate-400" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {categoryName}
                          </div>
                          {item.description && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs">{item.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-extrabold text-slate-700 dark:text-slate-200">
                          {stats.expectedQty}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                          {stats.availablePresent}
                        </td>
                        <td className={`px-4 py-3 text-center font-mono font-extrabold ${
                          stats.builtInCount > 0 ? "text-violet-600 dark:text-violet-400" : "text-slate-400 dark:text-slate-600"
                        }`}>
                          {stats.builtInCount}
                        </td>
                        <td className={`px-4 py-3 text-center font-mono font-extrabold ${
                          stats.unavailableCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-600"
                        }`}>
                          {stats.unavailableCount}
                        </td>
                        <td className={`px-4 py-3 text-center font-mono font-extrabold ${
                          stats.reservedCount > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-600"
                        }`}>
                          {stats.reservedCount}
                        </td>
                        <td className={`px-4 py-3 text-center font-mono font-extrabold ${
                          stats.currentReleased > 0 ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-600"
                        }`}>
                          {stats.currentReleased}
                        </td>
                        <td className={`px-4 py-3 text-center font-mono font-extrabold ${
                          stats.currentDamaged > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-600"
                        }`}>
                          {stats.currentDamaged}
                        </td>
                        <td className={`px-4 py-3 text-center font-mono font-extrabold ${
                          stats.currentLost > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-600"
                        }`}>
                          {stats.currentLost}
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
                <Loader2 size={18} className="animate-spin inline mr-2 text-blue-600" /> Loading inventory items...
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No inventory items registered yet.
              </div>
            ) : (
              paginatedInventory.map((item, idx) => {
                const categoryName = item.eq_name || item.name || item.category || "General";
                const displayPhoto = item.photo || item.avatar;
                const stats = computeCategoryStats(item);

                return (
                  <div key={`mob-stock-${item.id || idx}`} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner shrink-0">
                        {displayPhoto ? (
                          <img src={displayPhoto} alt={categoryName} className="w-full h-full object-contain p-0.5" />
                        ) : (
                          <Package size={18} className="text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-extrabold text-sm text-slate-900 block truncate">{categoryName}</span>
                        {item.description && (
                          <span className="text-[11px] text-slate-400 block truncate">{item.description}</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase">Total</span>
                        <span className="font-extrabold text-slate-900">{stats.expectedQty}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                        <span className="block text-[9px] text-emerald-600 font-bold uppercase">Available</span>
                        <span className="font-extrabold text-emerald-700">{stats.availablePresent}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-violet-50 border border-violet-100">
                        <span className="block text-[9px] text-violet-600 font-bold uppercase">Built-In</span>
                        <span className="font-extrabold text-violet-700">{stats.builtInCount}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                        <span className="block text-[9px] text-amber-600 font-bold uppercase">Unavail</span>
                        <span className="font-extrabold text-amber-700">{stats.unavailableCount}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
                        <span className="block text-[9px] text-indigo-600 font-bold uppercase">Reserved</span>
                        <span className="font-extrabold text-indigo-700">{stats.reservedCount}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
                        <span className="block text-[9px] text-blue-600 font-bold uppercase">Released</span>
                        <span className="font-extrabold text-blue-700">{stats.currentReleased}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                        <span className="block text-[9px] text-rose-600 font-bold uppercase">Damaged</span>
                        <span className="font-extrabold text-rose-700">{stats.currentDamaged}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                        <span className="block text-[9px] text-amber-700 font-bold uppercase">Lost</span>
                        <span className="font-extrabold text-amber-800">{stats.currentLost}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          {filteredInventory.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <div>
                Showing <span className="font-extrabold text-slate-900 dark:text-white">{startCategoryIndex + 1}</span> to{" "}
                <span className="font-extrabold text-slate-900 dark:text-white">{Math.min(startCategoryIndex + CATEGORY_ITEMS_PER_PAGE, filteredInventory.length)}</span> of{" "}
                <span className="font-extrabold text-slate-900 dark:text-white">{filteredInventory.length}</span> inventory stock items
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-bold mr-2">
                  Page {categoryPage} of {totalCategoryPages}
                </span>
                <button
                  type="button"
                  disabled={categoryPage === 1}
                  onClick={() => setCategoryPage(prev => Math.max(prev - 1, 1))}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                <button
                  type="button"
                  disabled={categoryPage >= totalCategoryPages}
                  onClick={() => setCategoryPage(prev => Math.min(prev + 1, totalCategoryPages))}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
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
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Physical Equipment Units</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
              Individual serialized units, barcodes, and current operational conditions
            </p>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#111827] p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
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
              placeholder="Search unit name, barcode..."
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
                  {["#", "Serial No.", "Equipment Unit Name", "Built-In", "Status", "Date Purchased", "Lifespan vs Current", "Action"].map((h, i) => (
                    <th key={h} className={`px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap ${i === 0 ? 'rounded-tl-2xl' : i === 7 ? 'rounded-tr-2xl' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
                {unitsLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <Loader2 size={20} className="animate-spin inline mr-2" /> Loading equipment units...
                    </td>
                  </tr>
                ) : filteredUnits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
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
                      <tr key={item.id} className={`transition-colors ${isOpen ? 'relative z-30' : ''} ${item.is_disabled ? 'opacity-50 grayscale bg-slate-50 dark:bg-slate-900/50' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/50'}`}>
                        <td className="px-4 py-3.5 font-bold text-slate-400 dark:text-slate-500">{displayIndex}</td>
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {item.serial_number || item.barcode}
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
          {filteredUnits.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <div>
                Showing <span className="font-extrabold text-slate-900 dark:text-white">{startUnitIndex + 1}</span> to{" "}
                <span className="font-extrabold text-slate-900 dark:text-white">{Math.min(startUnitIndex + UNIT_ITEMS_PER_PAGE, filteredUnits.length)}</span> of{" "}
                <span className="font-extrabold text-slate-900 dark:text-white">{filteredUnits.length}</span> equipment units
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-bold mr-2">
                  Page {unitPage} of {totalUnitPages}
                </span>
                <button
                  type="button"
                  disabled={unitPage === 1}
                  onClick={() => setUnitPage(prev => Math.max(prev - 1, 1))}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                <button
                  type="button"
                  disabled={unitPage >= totalUnitPages}
                  onClick={() => setUnitPage(prev => Math.min(prev + 1, totalUnitPages))}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
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
