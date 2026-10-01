import React, { useState, useEffect, useRef } from "react";
import { PackageOpen, Wrench, Check, Search, ChevronDown, X, CheckCircle2, Plus, Minus, CheckCircle } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Typeable & Selectable Combobox for Physical Equipment Unit Slot
 * Displays Model Name, Brand, Barcode, and Built-in components
 */
function SlotBarcodeSelector({
  unitKey,
  uIdx,
  reqQty,
  categoryName,
  currentBarcode,
  availableUnits = [],
  allUnits = [],
  assignedUnitSelections = {},
  onSelectBarcode,
  hasStock,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  const getUnitModelName = (unit) => {
    return [unit.brand, unit.model].filter(Boolean).join(" ") || unit.name || categoryName || "Equipment Unit";
  };

  const getUnitBuiltIns = (unit) => {
    let rawList = Array.isArray(unit.built_in_units)
      ? unit.built_in_units
      : (typeof unit.built_in_units === "string" ? JSON.parse(unit.built_in_units || "[]") : []);
    if (!rawList.length) {
      const eqType = unit.equipmentType || unit.equipment_type;
      if (eqType?.built_in_units) {
        rawList = Array.isArray(eqType.built_in_units)
          ? eqType.built_in_units
          : (typeof eqType.built_in_units === "string" ? JSON.parse(eqType.built_in_units || "[]") : []);
      }
    }
    if (!Array.isArray(rawList) || rawList.length === 0) return [];
    return rawList.map((biId) => {
      const match = (allUnits || []).find((u) =>
        String(u.id) === String(biId) ||
        String(u.barcode || "").trim().toUpperCase() === String(biId).trim().toUpperCase()
      );
      return match ? (match.name || [match.brand, match.model].filter(Boolean).join(" ") || match.barcode || `Unit #${biId}`) : `Unit #${biId}`;
    });
  };

  const selectedUnit = (availableUnits || []).find(
    (u) => String(u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).trim().toUpperCase() === String(currentBarcode).trim().toUpperCase()
  );

  useEffect(() => {
    if (selectedUnit) {
      setSearchTerm(`${getUnitModelName(selectedUnit)} [${selectedUnit.barcode || `UNIT-${selectedUnit.id}`}]`);
    } else {
      setSearchTerm(currentBarcode || "");
    }
  }, [currentBarcode, selectedUnit]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Exclude barcodes already chosen in OTHER slots of this modal
  const otherSelectedBarcodes = Object.entries(assignedUnitSelections || {})
    .filter(([k, v]) => k !== unitKey && Boolean(v))
    .map(([_, v]) => String(v).trim().toUpperCase());

  // Filter available units based on slot uniqueness
  const slotEligibleUnits = availableUnits.filter((u) => {
    const bCode = String(u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).trim().toUpperCase();
    const isCurrent = bCode === String(currentBarcode).trim().toUpperCase();
    return isCurrent || !otherSelectedBarcodes.includes(bCode);
  });

  // Search filtered options
  const searchFiltered = slotEligibleUnits.filter((u) => {
    const bCode = String(u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).toLowerCase();
    const uModel = getUnitModelName(u).toLowerCase();
    const uBuiltIns = getUnitBuiltIns(u).join(" ").toLowerCase();
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return bCode.includes(q) || uModel.includes(q) || uBuiltIns.includes(q);
  });

  const handleChoose = (unit) => {
    const bCode = unit.barcode || unit.serial_number || unit.code || `UNIT-${unit.id}`;
    onSelectBarcode(bCode);
    setSearchTerm(`${getUnitModelName(unit)} [${bCode}]`);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelectBarcode("");
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);

    const exactMatch = slotEligibleUnits.find((u) => {
      const bCode = String(u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).trim().toUpperCase();
      return bCode === val.trim().toUpperCase() || getUnitModelName(u).toLowerCase() === val.trim().toLowerCase();
    });

    if (exactMatch) {
      const exactCode = exactMatch.barcode || exactMatch.serial_number || exactMatch.code || `UNIT-${exactMatch.id}`;
      onSelectBarcode(exactCode);
    } else if (!val) {
      onSelectBarcode("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchFiltered.length > 0) {
        handleChoose(searchFiltered[0]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Typeable Input + Dropdown Toggle Bar */}
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder={currentBarcode ? "Change unit model..." : "Select model or type barcode..."}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={`w-full py-1.5 pl-3 pr-14 bg-white border rounded text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors ${
            currentBarcode
              ? "border-slate-400 bg-slate-50/50"
              : "border-slate-300 focus:border-slate-500"
          }`}
        />

        <div className="absolute right-1.5 flex items-center gap-1">
          {currentBarcode && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Clear / Unassign slot"
            >
              <X size={13} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Toggle unit dropdown"
          >
            <ChevronDown size={14} className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Options Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-300 rounded py-1 text-xs shadow-sm">
          <div className="px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-600 bg-slate-50">
            <span>AVAILABLE MODELS FOR {String(categoryName).toUpperCase()}</span>
            <span className="font-normal text-slate-500">{searchFiltered.length} Available</span>
          </div>

          {searchFiltered.length === 0 ? (
            <div className="p-3 text-center text-slate-400 font-medium">
              {slotEligibleUnits.length === 0
                ? (hasStock
                    ? "All available units in this category are assigned to other slots."
                    : `No registered stock available for ${categoryName}.`)
                : `No unit model matching "${searchTerm}".`}
            </div>
          ) : (
            searchFiltered.map((unit, idx) => {
              const bCode = unit.barcode || unit.serial_number || unit.code || `UNIT-${unit.id}`;
              const uModel = getUnitModelName(unit);
              const builtIns = getUnitBuiltIns(unit);
              const isSelected = bCode === currentBarcode;

              return (
                <button
                  key={`slot-opt-${unit.id || idx}`}
                  type="button"
                  onClick={() => handleChoose(unit)}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors cursor-pointer border-b border-slate-100 last:border-0 ${
                    isSelected
                      ? "bg-slate-100 text-slate-900 font-bold"
                      : "hover:bg-slate-50 text-slate-800 font-normal"
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-xs truncate max-w-[220px]">
                        {uModel}
                      </span>
                      <span className="font-mono text-[10.5px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {bCode}
                      </span>
                    </div>
                    {builtIns.length > 0 && (
                      <div className="text-[10px] text-slate-500 font-normal flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="font-medium text-slate-600">Built-in:</span>
                        <span className="bg-slate-50 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                          {builtIns.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 shrink-0">
                      <Check size={12} className="stroke-[3]" /> Selected
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function VenueEquipmentChecklist({
  categoriesToRender = [],
  assignedUnitSelections = {},
  setAssignedUnitSelections,
  getAvailableUnitsForCategory,
  allUnits = [],
  unitReturnedConditions = {},
  setUnitReturnedConditions,
  equipmentInspectionNotes = "",
  setEquipmentInspectionNotes,
  isHistoryView = false,
  isSideBySide = false,
  isApproved = false,
  isPreEvent = false,
  isOverrideActive = false,
  setIsOverrideActive,
  overrideCategories = [],
  setOverrideCategories,
  overrideCategory = "Wired Microphone",
  setOverrideCategory,
  overrideQuantity = 1,
  setOverrideQuantity,
  dbEquipmentTypes = [],
}) {
  const isAssignmentMode = isApproved || isPreEvent || !isSideBySide;

  const { isSuperAdmin, isStaff } = usePermissions();
  const canOverride = isSuperAdmin || isStaff;

  // Helper to extract built-in physical units linked to an assigned unit
  const getBuiltInUnitsForBarcode = (barcodeVal) => {
    if (!barcodeVal || barcodeVal === "—") return [];
    const cleanBarcode = String(barcodeVal).trim().toUpperCase();

    const unit = (allUnits || []).find((u) => {
      const b = String(u.barcode || u.serial_number || u.code || u.id).trim().toUpperCase();
      return b === cleanBarcode;
    });

    if (!unit) return [];

    let rawList = Array.isArray(unit.built_in_units)
      ? unit.built_in_units
      : (typeof unit.built_in_units === "string" ? JSON.parse(unit.built_in_units || "[]") : []);

    if (!rawList.length) {
      const eqType = unit.equipmentType || unit.equipment_type;
      if (eqType?.built_in_units) {
        rawList = Array.isArray(eqType.built_in_units)
          ? eqType.built_in_units
          : (typeof eqType.built_in_units === "string" ? JSON.parse(eqType.built_in_units || "[]") : []);
      }
    }

    if (!Array.isArray(rawList) || rawList.length === 0) return [];

    return rawList.map((biId) => {
      const match = (allUnits || []).find((u) =>
        String(u.id) === String(biId) ||
        String(u.barcode || "").trim().toUpperCase() === String(biId).trim().toUpperCase()
      );
      if (match) {
        const catName = match.equipmentType?.eq_name || match.equipment_type?.eq_name || match.category || "";
        const uName = [match.brand, match.model].filter(Boolean).join(" ") || match.name || "Unit";
        return {
          id: match.id,
          barcode: match.barcode || `UNIT-${match.id}`,
          name: uName,
          category: catName,
        };
      }
      return {
        id: biId,
        barcode: String(biId),
        name: `Physical Unit #${biId}`,
        category: "",
      };
    }).filter(Boolean);
  };

  // Available categories for selection and editing
  const categoryOptions = React.useMemo(() => {
    const list = [];
    const seen = new Set();
    (dbEquipmentTypes || []).forEach(t => {
      const name = t.eq_name || t.name || t.category;
      if (name && !seen.has(name.toUpperCase())) {
        seen.add(name.toUpperCase());
        list.push({ id: t.id, name });
      }
    });
    (allUnits || []).forEach(u => {
      const name = u.equipmentType?.eq_name || u.equipment_type?.eq_name || u.category;
      if (name && !seen.has(name.toUpperCase())) {
        seen.add(name.toUpperCase());
        list.push({ id: u.equipment_type_id || null, name });
      }
    });
    return list;
  }, [dbEquipmentTypes, allUnits]);

  // Fallback to single category mode if multi array not provided
  const activeOverrideList = Array.isArray(overrideCategories) && overrideCategories.length > 0
    ? overrideCategories.filter(c => c.category && c.category !== "NONE")
    : (Array.isArray(categoriesToRender) ? categoriesToRender : []);

  const handleUpdateOverrideItem = (index, field, value) => {
    if (setOverrideCategories) {
      if (setIsOverrideActive) setIsOverrideActive(true);

      const baseList = activeOverrideList.length > 0 ? [...activeOverrideList] : [...categoriesToRender];
      const updated = [...baseList];
      if (!updated[index]) return;

      if (field === "category") {
        const matchedType = (dbEquipmentTypes || []).find(t => 
          (t.eq_name || t.name || t.category || "").toLowerCase() === String(value).toLowerCase()
        );
        const avail = getAvailableUnitsForCategory ? getAvailableUnitsForCategory(value, matchedType?.id).length : 0;
        const currentQty = updated[index]?.quantity || 1;
        const clampedQty = avail > 0 ? Math.min(Math.max(1, currentQty), avail) : Math.max(1, currentQty);

        // Clear assigned units for this category because category changed
        if (setAssignedUnitSelections) {
          setAssignedUnitSelections(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => {
              if (k.startsWith(`${index}-`) || k.startsWith(`${updated[index].category}-`)) {
                delete next[k];
              }
            });
            return next;
          });
        }

        updated[index] = {
          ...updated[index],
          category: value,
          equipment_type_id: matchedType?.id || null,
          quantity: clampedQty,
        };
      } else if (field === "quantity") {
        const cat = updated[index]?.category;
        const typeId = updated[index]?.equipment_type_id;
        const avail = cat === "NONE" ? 0 : (getAvailableUnitsForCategory ? getAvailableUnitsForCategory(cat, typeId).length : 0);
        const clampedVal = avail > 0 ? Math.min(Math.max(1, value), avail) : Math.max(1, value);
        updated[index] = { ...updated[index], quantity: clampedVal };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      setOverrideCategories(updated);
    }
  };

  const handleAddOverrideCategory = () => {
    const existingCatNames = new Set(activeOverrideList.map(c => String(c.category || "").toUpperCase()));
    const nextOpt = categoryOptions.find(opt => !existingCatNames.has(opt.name.toUpperCase())) || categoryOptions[0];
    const defaultCat = nextOpt?.name || "Projector";
    const avail = getAvailableUnitsForCategory ? getAvailableUnitsForCategory(defaultCat, nextOpt?.id).length : 0;

    const baseList = activeOverrideList.length > 0 ? [...activeOverrideList] : [...categoriesToRender];
    const updated = [...baseList, {
      category: defaultCat,
      quantity: avail > 0 ? 1 : 1,
      equipment_type_id: nextOpt?.id || null,
    }];
    if (setOverrideCategories) {
      setOverrideCategories(updated);
    }
    if (setIsOverrideActive) {
      setIsOverrideActive(true);
    }
  };

  const handleRemoveOverrideCategory = (index) => {
    if (setOverrideCategories) {
      if (setIsOverrideActive) setIsOverrideActive(true);
      const baseList = activeOverrideList.length > 0 ? [...activeOverrideList] : [...categoriesToRender];
      const targetCat = baseList[index]?.category;
      const updated = baseList.filter((_, i) => i !== index);
      // Clean up assigned units
      if (setAssignedUnitSelections) {
        setAssignedUnitSelections(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(k => {
            if (k.startsWith(`${index}-`) || (targetCat && k.startsWith(`${targetCat}-`))) {
              delete next[k];
            }
          });
          return next;
        });
      }
      setOverrideCategories(updated);
    }
  };

  // Check how many units have been assigned
  let totalRequestedUnits = 0;
  let totalAssignedUnits = 0;

  categoriesToRender.forEach((catObj, catIdx) => {
    const reqQty = parseInt(catObj.quantity, 10) || 1;
    totalRequestedUnits += reqQty;
    for (let uIdx = 0; uIdx < reqQty; uIdx++) {
      const idxKey = `${catIdx}-${uIdx}`;
      const catKey = `${catObj.category}-${uIdx}`;
      if (assignedUnitSelections[idxKey] || assignedUnitSelections[catKey]) {
        totalAssignedUnits++;
      }
    }
  });

  const allUnitsAssigned = totalRequestedUnits > 0 && totalAssignedUnits >= totalRequestedUnits;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2.5 gap-2 font-sans">
        <div>
          <h4 className="text-xs font-bold text-slate-900 tracking-normal flex items-center gap-2">
            <PackageOpen size={15} className="text-slate-700" />
            <span>{isApproved || isPreEvent ? "Equipment Unit Assignment" : "Post Equipment Inspection"}</span>
          </h4>
          <p className="text-[11px] font-medium text-slate-500 mt-0.5">
            {isApproved || isPreEvent
              ? "Select equipment category and assign physical equipment units."
              : "Verify returned equipment unit condition."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {totalRequestedUnits > 0 && (
            <span className="text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
              {totalAssignedUnits} of {totalRequestedUnits} units selected
            </span>
          )}

          {canOverride && setOverrideCategories && (
            <button
              type="button"
              onClick={handleAddOverrideCategory}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus size={13} />
              <span>Add Equipment Category</span>
            </button>
          )}
        </div>
      </div>

      {/* Equipment Cards */}
      {categoriesToRender.length === 0 ? (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center mx-auto border border-slate-200">
            <PackageOpen size={20} />
          </div>
          <div className="space-y-1">
            <h5 className="font-bold text-slate-900 text-xs">No Equipment Units Attached</h5>
            <p className="text-[11px] text-slate-500 font-medium max-w-sm mx-auto">
              No equipment units or built-ins requested for this venue reservation. You can select and attach equipment categories below.
            </p>
          </div>
          {canOverride && setOverrideCategories && (
            <button
              type="button"
              onClick={handleAddOverrideCategory}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-all cursor-pointer"
            >
              <Plus size={13} />
              <span>Add Equipment Category</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {categoriesToRender.map((item, catIdx) => {
            const reqQty = Math.max(1, item.quantity || 1);
            const availableUnits = getAvailableUnitsForCategory ? getAvailableUnitsForCategory(item.category, item.equipment_type_id) : [];
            const hasStock = availableUnits.length > 0;

            return (
              <div key={`cat-card-${catIdx}`} className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-3">
                {/* Category Selection & Quantity Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2.5 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Category:</span>
                    {canOverride && setOverrideCategories && isAssignmentMode ? (
                      <select
                        value={item.category}
                        onChange={(e) => handleUpdateOverrideItem(catIdx, "category", e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-500 cursor-pointer"
                      >
                        {!categoryOptions.some(opt => opt.name.toUpperCase() === String(item.category).toUpperCase()) && (
                          <option value={item.category}>{item.category}</option>
                        )}
                        {categoryOptions.map(opt => (
                          <option key={opt.id || opt.name} value={opt.name}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs font-bold text-slate-900 font-mono">{item.category}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Quantity:</span>
                    {canOverride && setOverrideCategories && isAssignmentMode ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateOverrideItem(catIdx, "quantity", Math.max(1, reqQty - 1))}
                          disabled={reqQty <= 1}
                          className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 cursor-pointer"
                          title="Decrease units (-1)"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="min-w-[20px] text-center font-mono text-xs font-bold text-slate-800">
                          {reqQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateOverrideItem(catIdx, "quantity", reqQty + 1)}
                          className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
                          title="Increase units (+1)"
                        >
                          <Plus size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveOverrideCategory(catIdx)}
                          className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer ml-1"
                          title="Remove category"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {reqQty}
                      </span>
                    )}
                  </div>
                </div>

                {!isAssignmentMode ? (
                  /* RETURNED UNIT CONDITION CHECKLIST (Post-event / side-by-side mode) */
                  <div className="space-y-2 pt-1">
                    {Array.from({ length: reqQty }).map((_, uIdx) => {
                      const unitKey = `${catIdx}-${uIdx}`;
                      const assignedBarcode = assignedUnitSelections[unitKey];
                      const cond = (assignedBarcode && unitReturnedConditions[assignedBarcode]) || unitReturnedConditions[unitKey] || "Good";
                      const slotBuiltIns = assignedBarcode ? getBuiltInUnitsForBarcode(assignedBarcode) : [];

                      return (
                        <div key={`ret-unit-${catIdx}-${uIdx}`} className="py-2 border-b border-slate-100 last:border-b-0 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-700">Unit #{uIdx + 1}</span>
                              {assignedBarcode && (
                                <span className="font-mono text-[10.5px] text-slate-500">
                                  [{assignedBarcode}]
                                </span>
                              )}
                            </div>

                            {isHistoryView ? (
                              <span className={`text-xs font-mono font-black uppercase ${
                                cond === "Damaged" ? "text-rose-600" : (cond === "Lost" ? "text-amber-600" : "text-emerald-600")
                              }`}>
                                {cond}
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setUnitReturnedConditions && setUnitReturnedConditions(prev => ({ ...prev, [unitKey]: "Good", ...(assignedBarcode ? { [assignedBarcode]: "Good" } : {}) }))}
                                  className={`px-2.5 py-1 rounded border text-xs font-semibold transition-colors cursor-pointer ${
                                    cond === "Good"
                                      ? "border-slate-800 bg-slate-900 text-white"
                                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  Good
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUnitReturnedConditions && setUnitReturnedConditions(prev => ({ ...prev, [unitKey]: "Damaged", ...(assignedBarcode ? { [assignedBarcode]: "Damaged" } : {}) }))}
                                  className={`px-2.5 py-1 rounded border text-xs font-semibold transition-colors cursor-pointer ${
                                    cond === "Damaged"
                                      ? "border-rose-700 bg-rose-700 text-white"
                                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  Damaged
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUnitReturnedConditions && setUnitReturnedConditions(prev => ({ ...prev, [unitKey]: "Lost", ...(assignedBarcode ? { [assignedBarcode]: "Lost" } : {}) }))}
                                  className={`px-2.5 py-1 rounded border text-xs font-semibold transition-colors cursor-pointer ${
                                    cond === "Lost"
                                      ? "border-amber-700 bg-amber-700 text-white"
                                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  Lost
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Built-ins in inspection mode */}
                          {slotBuiltIns.length > 0 && (
                            <div className="mt-1 p-2 rounded bg-slate-50 border border-slate-200 space-y-1">
                              <span className="text-[10px] font-bold text-slate-700 block">
                                Linked Built-in Components ({slotBuiltIns.length}):
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {slotBuiltIns.map((bi) => (
                                  <span key={bi.id || bi.barcode} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-300 text-[10px] font-medium text-slate-700">
                                    <span className="text-slate-400">•</span>
                                    <span>{bi.name}</span>
                                    <span className="font-mono text-[9px] text-slate-400">[{bi.barcode}]</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* UNIT ASSIGNMENT & PRE-EVENT INSPECTION */
                  <div className="space-y-3 pt-1">
                    {Array.from({ length: reqQty }).map((_, uIdx) => {
                      const unitKey = `${catIdx}-${uIdx}`;
                      const currentSelectedBarcode = assignedUnitSelections[unitKey] || "";
                      const cond = unitReturnedConditions[unitKey] || (currentSelectedBarcode ? unitReturnedConditions[currentSelectedBarcode] : "Good") || "Good";

                      const matchedUnit = (allUnits || []).find(u => String(u.barcode || u.serial_number || u.code || u.id).trim().toUpperCase() === String(currentSelectedBarcode).trim().toUpperCase());
                      const modelName = matchedUnit ? ([matchedUnit.brand, matchedUnit.model].filter(Boolean).join(" ") || matchedUnit.name) : "";
                      const slotBuiltIns = currentSelectedBarcode ? getBuiltInUnitsForBarcode(currentSelectedBarcode) : [];

                      return (
                        <div key={`unit-${catIdx}-${uIdx}`} className="py-2.5 border-b border-slate-100 last:border-b-0 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700">
                              Unit Slot #{uIdx + 1}
                            </span>
                            {currentSelectedBarcode ? (
                              <span className="text-xs font-mono font-semibold text-slate-700 flex items-center gap-1">
                                <Check size={12} className="stroke-[3] text-slate-600" /> {modelName ? `${modelName} [${currentSelectedBarcode}]` : `Assigned [${currentSelectedBarcode}]`}
                              </span>
                            ) : (
                              <span className="text-xs font-mono text-slate-400">
                                Unassigned
                              </span>
                            )}
                          </div>

                          {isHistoryView || (isSideBySide && isPreEvent) ? (
                            <div className="font-mono text-xs text-slate-800 py-1 flex items-center justify-between">
                              <span className="font-semibold text-slate-800">
                                {currentSelectedBarcode ? `Barcode: [${currentSelectedBarcode}]` : "Physical Unit Pre-Assigned"}
                              </span>
                              <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                Pre-Inspected (Good)
                              </span>
                            </div>
                          ) : (
                            <SlotBarcodeSelector
                              unitKey={unitKey}
                              uIdx={uIdx}
                              reqQty={reqQty}
                              categoryName={item.category}
                              currentBarcode={currentSelectedBarcode}
                              availableUnits={availableUnits}
                              allUnits={allUnits}
                              assignedUnitSelections={assignedUnitSelections}
                              onSelectBarcode={(newBarcode) => {
                                setAssignedUnitSelections(prev => ({
                                  ...prev,
                                  [unitKey]: newBarcode
                                }));
                              }}
                              hasStock={hasStock}
                            />
                          )}

                          {/* Built-in physical units linked to selected physical unit */}
                          {currentSelectedBarcode && slotBuiltIns.length > 0 && (
                            <div className="mt-1.5 p-2.5 rounded bg-slate-50 border border-slate-200 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                <span>Built-in to [{currentSelectedBarcode}]</span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {slotBuiltIns.length} {slotBuiltIns.length === 1 ? "Unit" : "Units"} Linked
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {slotBuiltIns.map((bi) => (
                                  <span key={bi.id || bi.barcode} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-slate-300 text-[11px] text-slate-700">
                                    <span className="text-slate-400">•</span>
                                    <span className="font-semibold">{bi.name}</span>
                                    <span className="font-mono text-[10px] text-slate-500">[{bi.barcode}]</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Pre-event physical unit condition inspection */}
                          {setUnitReturnedConditions && !isHistoryView && !isSideBySide && !isApproved && (
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10.5px] font-bold text-slate-500">Unit Condition:</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setUnitReturnedConditions(prev => ({ ...prev, [unitKey]: "Good", ...(currentSelectedBarcode ? { [currentSelectedBarcode]: "Good" } : {}) }))}
                                  className={`px-2 py-0.5 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
                                    cond === "Good"
                                      ? "border-slate-800 bg-slate-900 text-white"
                                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  Good
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUnitReturnedConditions(prev => ({ ...prev, [unitKey]: "Damaged", ...(currentSelectedBarcode ? { [currentSelectedBarcode]: "Damaged" } : {}) }))}
                                  className={`px-2 py-0.5 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
                                    cond === "Damaged"
                                      ? "border-rose-700 bg-rose-700 text-white"
                                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  Damaged
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUnitReturnedConditions(prev => ({ ...prev, [unitKey]: "Lost", ...(currentSelectedBarcode ? { [currentSelectedBarcode]: "Lost" } : {}) }))}
                                  className={`px-2 py-0.5 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
                                    cond === "Lost"
                                      ? "border-amber-700 bg-amber-700 text-white"
                                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  Lost
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Physical Unit Inspection Remarks */}
      {!isApproved && (
        <div className="space-y-1.5 pt-2 border-t border-slate-200">
          <label className="block text-[11px] font-bold text-slate-600 uppercase">
            Remarks
          </label>
          {isHistoryView || (isSideBySide && isPreEvent) ? (
            <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 min-h-[50px]">
              {isPreEvent
                ? "All physical units inspected and released in satisfactory condition before event."
                : (equipmentInspectionNotes || "All physical units inspected in satisfactory condition.")}
            </div>
          ) : (
            <textarea
              rows={2}
              placeholder="Provide additional details regarding unit condition, serial/barcode observations, or defects..."
              value={equipmentInspectionNotes || ""}
              onChange={(e) => setEquipmentInspectionNotes && setEquipmentInspectionNotes(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-400 transition-all"
            />
          )}
        </div>
      )}
    </div>
  );
}
