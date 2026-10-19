import { useState, useRef, useEffect, useMemo } from "react";
import { Loader2, Play, Mail, CheckCircle2, PackageCheck, AlertCircle, Smartphone, ChevronDown, X, Check } from "lucide-react";
import api from "@/lib/axios";

/**
 * Typeable & Selectable Combobox for Borrow Unit Slot (Model Selection + Built-in components)
 */
function BorrowSlotBarcodeSelector({
  unitKey,
  catKey,
  uIdx,
  categoryName,
  currentBarcode,
  availableUnits,
  allUnits = [],
  dbEquipmentTypes = [],
  currentReqCat = null,
  assignedUnitSelections,
  onSelectBarcode,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  const getUnitSeqNo = (unit) => {
    if (!unit) return null;
    const raw = unit.seq_no ?? unit.sequence_no;
    if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
      const trimmed = String(raw).trim();
      return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    }
    return null;
  };

  const getUnitBrand = (unit) => {
    return unit?.brand ? String(unit.brand).trim() : "";
  };

  const getUnitModel = (unit) => {
    return unit?.model ? String(unit.model).trim() : "";
  };

  const getUnitModelName = (unit) => {
    const brand = getUnitBrand(unit);
    const model = getUnitModel(unit);
    if (brand && model) return `${brand} • ${model}`;
    if (brand) return brand;
    if (model) return model;
    return unit?.name || categoryName || "Equipment Unit";
  };

  const getUnitBuiltIns = (unit) => {
    let rawList = [];
    if (Array.isArray(unit?.built_in_units)) {
      rawList = unit.built_in_units;
    } else if (typeof unit?.built_in_units === "string") {
      try { rawList = JSON.parse(unit.built_in_units || "[]"); } catch { rawList = []; }
    }

    if (!Array.isArray(rawList) || rawList.length === 0) {
      const eqT = unit?.equipmentType || unit?.equipment_type;
      if (Array.isArray(eqT?.built_in_units) && eqT.built_in_units.length > 0) {
        rawList = eqT.built_in_units;
      } else if (Array.isArray(eqT?.built_in_names) && eqT.built_in_names.length > 0) {
        rawList = eqT.built_in_names;
      }
    }

    if (!Array.isArray(rawList) || rawList.length === 0) {
      const catBuilt = currentReqCat?.builtInNames || currentReqCat?.built_in_names || currentReqCat?.built_in_units;
      if (Array.isArray(catBuilt) && catBuilt.length > 0) {
        rawList = catBuilt;
      }
    }

    if (!Array.isArray(rawList) || rawList.length === 0) {
      const typeId = unit?.equipment_type_id || currentReqCat?.equipment_type_id || currentReqCat?.id;
      const matchedType = (dbEquipmentTypes || []).find(t =>
        (typeId && String(t.id) === String(typeId)) ||
        (categoryName && String(t.eq_name || t.name || '').toLowerCase() === String(categoryName).toLowerCase())
      );
      if (matchedType) {
        const typeBuilt = matchedType.built_in_names || matchedType.built_in_units;
        if (Array.isArray(typeBuilt)) rawList = typeBuilt;
        else if (typeof typeBuilt === "string") {
          try { rawList = JSON.parse(typeBuilt || "[]"); } catch {}
        }
      }
    }

    if (!Array.isArray(rawList) || rawList.length === 0) return [];

    return rawList.map((itemRef, itemIdx) => {
      if (!itemRef) return null;
      const biKey = (typeof itemRef === 'object' && itemRef !== null)
        ? String(itemRef.id || itemRef.barcode || itemRef.serial_number || itemRef.code || '').trim().toUpperCase()
        : String(itemRef).trim().toUpperCase();
      const biRaw = (typeof itemRef === 'object' && itemRef !== null)
        ? (itemRef.name || itemRef.eq_name || itemRef.barcode || itemRef.id)
        : itemRef;

      // Match physical unit in allUnits
      const match = (allUnits || []).find((u) => {
        const uId = String(u.id).trim().toUpperCase();
        const uCandidates = [
          uId,
          `UNIT-${uId}`,
          u.barcode,
          u.serial_number,
          u.serial_no,
          u.code,
        ].filter(Boolean).map((s) => String(s).trim().toUpperCase());
        return uCandidates.includes(biKey) || (biKey && uCandidates.includes(biKey.replace(/^UNIT-/i, '')));
      });
      if (match) {
        return match.name || [match.brand, match.model].filter(Boolean).join(" ") || match.barcode || `Unit #${biRaw}`;
      }

      // Match equipment type name from dbEquipmentTypes
      const matchedType = (dbEquipmentTypes || []).find(t =>
        String(t.id) === String(biKey) ||
        String(t.id) === String(biRaw) ||
        String(t.eq_name || t.name || '').toLowerCase() === String(biRaw).toLowerCase()
      );
      if (matchedType) {
        return matchedType.eq_name || matchedType.name;
      }

      const eqT = unit?.equipmentType || unit?.equipment_type;
      if (Array.isArray(eqT?.built_in_names) && eqT.built_in_names[itemIdx]) {
        return eqT.built_in_names[itemIdx];
      }
      const catBuilt = currentReqCat?.builtInNames || currentReqCat?.built_in_names;
      if (Array.isArray(catBuilt) && catBuilt[itemIdx]) {
        return catBuilt[itemIdx];
      }

      return isNaN(Number(biRaw)) ? String(biRaw) : `Accessory #${biRaw}`;
    }).filter(Boolean);
  };

  const selectedUnit = (availableUnits || []).find(
    (u) => String(u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).trim().toUpperCase() === String(currentBarcode).trim().toUpperCase()
  );

  useEffect(() => {
    if (selectedUnit) {
      const seq = getUnitSeqNo(selectedUnit);
      const bCode = selectedUnit.barcode || `UNIT-${selectedUnit.id}`;
      const brandModel = getUnitModelName(selectedUnit);
      setSearchTerm(`${seq ? `${seq} ` : ""}${brandModel} [${bCode}]`);
    } else {
      setSearchTerm(currentBarcode || "");
    }
  }, [currentBarcode, selectedUnit]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const otherSelectedBarcodes = Object.entries(assignedUnitSelections || {})
    .filter(([k, v]) => k !== unitKey && k !== catKey && Boolean(v))
    .map(([_, v]) => String(v).trim().toUpperCase());

  const slotEligibleUnits = useMemo(() => {
    const list = availableUnits.filter((u) => {
      const bCode = String(u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).trim().toUpperCase();
      const isCurrent = bCode === String(currentBarcode).trim().toUpperCase();
      return isCurrent || !otherSelectedBarcodes.includes(bCode);
    });
    if (selectedUnit && !list.some(u => String(u.id) === String(selectedUnit.id) || String(u.barcode || u.serial_number) === String(selectedUnit.barcode || selectedUnit.serial_number))) {
      list.unshift(selectedUnit);
    }
    return list;
  }, [availableUnits, currentBarcode, otherSelectedBarcodes, selectedUnit]);

  const searchFiltered = slotEligibleUnits.filter((u) => {
    const bCode = String(u.barcode || u.serial_number || u.code || `UNIT-${u.id}`).toLowerCase();
    const seqNo = String(u.seq_no || u.sequence_no || "").toLowerCase();
    const brand = String(u.brand || "").toLowerCase();
    const model = String(u.model || "").toLowerCase();
    const name = String(u.name || "").toLowerCase();
    const uBuiltIns = getUnitBuiltIns(u).join(" ").toLowerCase();
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return bCode.includes(q) || seqNo.includes(q) || brand.includes(q) || model.includes(q) || name.includes(q) || uBuiltIns.includes(q);
  });

  const handleChoose = (unit) => {
    const bCode = unit.barcode || unit.serial_number || unit.code || `UNIT-${unit.id}`;
    const seq = getUnitSeqNo(unit);
    const brandModel = getUnitModelName(unit);
    onSelectBarcode(bCode);
    setSearchTerm(`${seq ? `${seq} ` : ""}${brandModel} [${bCode}]`);
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
      const seq = String(u.seq_no || u.sequence_no || "").trim().toUpperCase();
      return bCode === val.trim().toUpperCase() ||
        seq === val.trim().toUpperCase() ||
        getUnitModelName(u).toLowerCase() === val.trim().toLowerCase();
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
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder={currentBarcode ? "Change unit model..." : "Select model or type barcode..."}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={`w-full py-2.5 pl-3 pr-16 bg-white dark:bg-slate-900/80 border rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-all ${
            currentBarcode
              ? "border-emerald-300 dark:border-emerald-700/80 ring-1 ring-emerald-200 dark:ring-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/20"
              : "border-slate-200 dark:border-blue-900/50 focus:border-blue-400 dark:focus:border-blue-600 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-900/40"
          }`}
        />
        <div className="absolute right-1.5 flex items-center gap-1">
          {currentBarcode && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Clear slot"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronDown size={14} className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-blue-900/50 rounded-xl shadow-lg py-1 text-xs animate-in fade-in">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10.5px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/80">
            <span>AVAILABLE MODELS FOR {String(categoryName).toUpperCase()}</span>
            <span>{searchFiltered.length} Available</span>
          </div>

          {searchFiltered.length === 0 ? (
            <div className="p-3 text-center text-slate-400 dark:text-slate-500 font-medium">
              {slotEligibleUnits.length === 0
                ? `No available stock for ${categoryName}.`
                : `No unit model matching "${searchTerm}".`}
            </div>
          ) : (
            searchFiltered.map((unit, idx) => {
              const bCode = unit.barcode || unit.serial_number || unit.code || `UNIT-${unit.id}`;
              const seqNo = getUnitSeqNo(unit);
              const brand = getUnitBrand(unit);
              const model = getUnitModel(unit);
              const builtIns = getUnitBuiltIns(unit);
              const isSelected = bCode === currentBarcode;

              return (
                <button
                  key={`borrow-opt-${unit.id || idx}`}
                  type="button"
                  onClick={() => handleChoose(unit)}
                  className={`w-full px-3 py-2.5 text-left flex items-center justify-between transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800/60 last:border-0 ${
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-semibold"
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {seqNo && (
                        <span className="font-mono text-[10.5px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/80 shrink-0">
                          {seqNo}
                        </span>
                      )}
                      <span className="font-extrabold text-slate-900 dark:text-white text-xs truncate max-w-[220px]">
                        {brand && <span>{brand}</span>}
                        {brand && model && <span className="text-slate-400 dark:text-slate-500 mx-1">•</span>}
                        {model && <span className="font-semibold text-slate-700 dark:text-slate-300">{model}</span>}
                        {!brand && !model && (unit.name || categoryName || "Equipment Unit")}
                      </span>
                      <span className="font-mono text-[10.5px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 shrink-0">
                        {bCode}
                      </span>
                    </div>
                    {builtIns.length > 0 && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="font-bold text-blue-600 dark:text-blue-400">Built-in:</span>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700 font-semibold">
                          {builtIns.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
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

/**
 * EquipBorrowUnitAssignment — Right column component for assigning unit barcodes and workflow actions.
 */
export default function EquipBorrowUnitAssignment({
  selected,
  categoriesToRender,
  getAvailableUnitsForCategory,
  allUnits = [],
  dbEquipmentTypes = [],
  assignedUnitSelections,
  setAssignedUnitSelections,
  isApproved,
  isPending,
  isOngoing,
  isCompleted,
  unitReturnedConditions = {},
  inspectionStatus,
  timeliness,
  compromisedUnitKeys,
  handleAction,
  actionLoading,
  resendMsg,
  resendLoading,
  handleResendEmail,
  smsMsg,
  smsLoading,
  handleSendOverdueSms,
  loadingUnits = false,
}) {
  const borrowingOfficeId = selected?.office_id || selected?.office?.id || (selected?.items && selected.items[0]?.equipment_type?.office_id);

  const getBuiltInUnitsForBarcode = (barcodeVal, currentReqCat = null) => {
    if (!barcodeVal || barcodeVal === "—") return [];
    const cleanBarcode = String(barcodeVal).trim().toUpperCase();
    const strippedBarcode = cleanBarcode.replace(/^UNIT-/i, '').trim();

    const unit = (allUnits || []).find((u) => {
      const uId = String(u.id).trim().toUpperCase();
      const uSeq = u.seq_no ? String(u.seq_no).replace(/^#/, '').trim().toUpperCase() : null;
      const candidates = [
        u.barcode,
        u.serial_number,
        u.serial_no,
        u.code,
        uId,
        `UNIT-${uId}`,
        uSeq ? `#${uSeq}` : null,
        uSeq,
      ].filter(Boolean).map((s) => String(s).trim().toUpperCase());
      return candidates.includes(cleanBarcode) || (strippedBarcode && candidates.includes(strippedBarcode));
    });

    let rawList = [];
    if (unit) {
      if (Array.isArray(unit.built_in_units)) {
        rawList = unit.built_in_units;
      } else if (typeof unit.built_in_units === "string") {
        try { rawList = JSON.parse(unit.built_in_units || "[]"); } catch { rawList = []; }
      }
      if (!Array.isArray(rawList) || rawList.length === 0) {
        const eqT = unit.equipmentType || unit.equipment_type;
        if (Array.isArray(eqT?.built_in_units) && eqT.built_in_units.length > 0) {
          rawList = eqT.built_in_units;
        } else if (Array.isArray(eqT?.built_in_names) && eqT.built_in_names.length > 0) {
          rawList = eqT.built_in_names;
        }
      }
    }

    if (!Array.isArray(rawList) || rawList.length === 0) {
      const parentCat = currentReqCat || (categoriesToRender || []).find((c) => {
        if (unit && String(c.id || c.equipment_type_id) === String(unit.equipment_type_id)) return true;
        return false;
      });
      if (parentCat) {
        const catBuilt = parentCat.builtInNames || parentCat.built_in_names || parentCat.built_in_units;
        if (Array.isArray(catBuilt) && catBuilt.length > 0) {
          rawList = catBuilt;
        }
      }
    }

    if (!Array.isArray(rawList) || rawList.length === 0) {
      const typeId = unit?.equipment_type_id || currentReqCat?.equipment_type_id || currentReqCat?.id;
      const matchedType = (dbEquipmentTypes || []).find(t =>
        (typeId && String(t.id) === String(typeId)) ||
        (currentReqCat?.category && String(t.eq_name || t.name || '').toLowerCase() === String(currentReqCat.category).toLowerCase())
      );
      if (matchedType) {
        const typeBuilt = matchedType.built_in_names || matchedType.built_in_units;
        if (Array.isArray(typeBuilt)) rawList = typeBuilt;
        else if (typeof typeBuilt === "string") {
          try { rawList = JSON.parse(typeBuilt || "[]"); } catch {}
        }
      }
    }

    if (!Array.isArray(rawList) || rawList.length === 0) return [];

    return rawList.map((itemRef, itemIdx) => {
      if (!itemRef) return null;
      const biKey = (typeof itemRef === 'object' && itemRef !== null)
        ? String(itemRef.id || itemRef.barcode || itemRef.serial_number || itemRef.code || '').trim().toUpperCase()
        : String(itemRef).trim().toUpperCase();
      const biRaw = (typeof itemRef === 'object' && itemRef !== null)
        ? (itemRef.name || itemRef.eq_name || itemRef.barcode || itemRef.id)
        : itemRef;

      const match = (allUnits || []).find((u) => {
        const uId = String(u.id).trim().toUpperCase();
        const uCandidates = [
          uId,
          `UNIT-${uId}`,
          u.barcode,
          u.serial_number,
          u.serial_no,
          u.code,
        ].filter(Boolean).map((s) => String(s).trim().toUpperCase());
        return uCandidates.includes(biKey) || (biKey && uCandidates.includes(biKey.replace(/^UNIT-/i, '')));
      });

      if (match) {
        const catName = match.equipmentType?.eq_name || match.equipment_type?.eq_name || match.category || "";
        const rawSeq = match.seq_no ?? match.sequence_no;
        const seqNo = rawSeq !== undefined && rawSeq !== null && String(rawSeq).trim() !== ""
          ? (String(rawSeq).trim().startsWith("#") ? String(rawSeq).trim() : `#${String(rawSeq).trim()}`)
          : null;
        const brand = match.brand ? String(match.brand).trim() : "";
        const model = match.model ? String(match.model).trim() : "";
        const brandModel = brand && model ? `${brand} • ${model}` : (brand || model || match.name || "Unit");
        return {
          id: match.id,
          barcode: match.barcode || match.serial_number || `UNIT-${match.id}`,
          name: brandModel,
          brand,
          model,
          seq_no: seqNo,
          category: catName,
        };
      }

      // If not a physical unit, resolve category/accessory name (e.g. ID 8 -> HDMI)
      let resolvedTypeName = null;
      if (Array.isArray(dbEquipmentTypes)) {
        const typeMatch = dbEquipmentTypes.find(t =>
          String(t.id) === String(biKey) ||
          String(t.id) === String(biRaw) ||
          String(t.eq_name || t.name || '').toLowerCase() === String(biRaw).toLowerCase()
        );
        if (typeMatch) {
          resolvedTypeName = typeMatch.eq_name || typeMatch.name;
        }
      }

      if (!resolvedTypeName) {
        const eqT = unit?.equipmentType || unit?.equipment_type;
        if (Array.isArray(eqT?.built_in_names) && eqT.built_in_names[itemIdx]) {
          resolvedTypeName = eqT.built_in_names[itemIdx];
        }
      }
      if (!resolvedTypeName && currentReqCat) {
        const catBuilt = currentReqCat.builtInNames || currentReqCat.built_in_names;
        if (Array.isArray(catBuilt) && catBuilt[itemIdx]) {
          resolvedTypeName = catBuilt[itemIdx];
        }
      }
      if (!resolvedTypeName && Array.isArray(categoriesToRender)) {
        const catMatch = categoriesToRender.find(
          (c) => String(c.id || c.equipment_type_id) === String(biKey) || String(c.category || c.name).toLowerCase() === String(biRaw).toLowerCase()
        );
        if (catMatch) resolvedTypeName = catMatch.category || catMatch.name;
      }

      if (resolvedTypeName) {
        return {
          id: biKey || biRaw,
          barcode: resolvedTypeName,
          name: resolvedTypeName,
          category: "Built-in Accessory",
        };
      }

      return {
        id: biKey || biRaw,
        barcode: String(biRaw),
        name: isNaN(Number(biRaw)) ? String(biRaw) : `Physical Unit #${biRaw}`,
        category: "Built-in Component",
      };
    }).filter(Boolean);
  };

  // Check if all requested units have been assigned
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

  const hasCompromisedUnits = Object.values(assignedUnitSelections || {}).some((bCode) => {
    if (!bCode || bCode === "—") return false;
    const cleanCode = String(bCode).trim().toUpperCase();
    return Boolean(compromisedUnitKeys && compromisedUnitKeys.has(cleanCode));
  });

  const canRelease = allUnitsAssigned && !hasCompromisedUnits;

  return (
    <div className="lg:col-span-5 p-6 space-y-4">
      {/* Equipment Unit Assignments */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-mono uppercase tracking-wider block font-bold ${
            isCompleted ? "text-emerald-600" : "text-slate-500"
          }`}>
            {isPending ? "REQUESTED EQUIPMENT" : "EQUIPMENT UNIT ASSIGNMENT"}
          </span>
          {(isApproved || isOngoing) && (
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              allUnitsAssigned
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
            }`}>
              {totalAssignedUnits} of {totalRequestedUnits} units {isOngoing ? "dispatched" : "selected"}
            </span>
          )}
          {isCompleted && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
              ✓ Completed
            </span>
          )}
        </div>

        {categoriesToRender.map((reqCat, catIdx) => {
          const availableUnits = getAvailableUnitsForCategory(reqCat.category, reqCat.equipment_type_id);

          // Count assigned for this category
          const reqQty = parseInt(reqCat.quantity, 10) || 1;
          let catAssignedCount = 0;
          for (let u = 0; u < reqQty; u++) {
            const k1 = `${catIdx}-${u}`;
            const k2 = `${reqCat.category}-${u}`;
            if (assignedUnitSelections[k1] || assignedUnitSelections[k2]) catAssignedCount++;
          }

          return (
            <div key={catIdx} className="p-3.5 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/90 dark:border-blue-900/50 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                  {reqCat.category}
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                  Qty: {reqCat.quantity}
                </span>
              </div>

              {/* State 1: Pending (No unit dropdown yet) */}
              {isPending && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 rounded-xl text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <PackageCheck size={14} className="text-slate-400 shrink-0" />
                  <span>Awaiting approval to assign physical unit models.</span>
                </div>
              )}

              {/* State 2: Approved OR On-Going (Changeable typeable model combobox) */}
              {(isApproved || isOngoing) && (
                <>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <span>{isOngoing ? "Dispatched Unit / Model (Changeable):" : "Select Equipment Unit / Model:"}</span>
                    <span className={catAssignedCount >= reqQty ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-amber-600 dark:text-amber-400 font-extrabold"}>
                      {catAssignedCount} of {reqQty} {isOngoing ? "dispatched" : "selected"}
                    </span>
                  </div>

                  {loadingUnits ? (
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse">
                      <Loader2 size={15} className="animate-spin text-blue-600 dark:text-blue-400" />
                      <span>Loading available units in stock...</span>
                    </div>
                  ) : (availableUnits.length === 0 && catAssignedCount === 0) ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 text-center">
                      No available units in stock for {reqCat.category}.
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      {availableUnits.length === 0 && (
                        <div className="px-2.5 py-1.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-lg text-[10.5px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertCircle size={12} className="shrink-0" />
                          <span>No additional spare units in stock to swap.</span>
                        </div>
                      )}
                      {Array.from({ length: reqCat.quantity }).map((_, uIdx) => {
                        const idxKey = `${catIdx}-${uIdx}`;
                        const catKey = `${reqCat.category}-${uIdx}`;
                        const val =
                          assignedUnitSelections[idxKey] ||
                          assignedUnitSelections[catKey] ||
                          "";

                        return (
                          <div key={uIdx} className="relative space-y-1">
                            <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                              <span>Unit Slot #{uIdx + 1}</span>
                              {val ? (() => {
                                const match = (allUnits || []).find(u => {
                                  const uId = String(u.id).trim().toUpperCase();
                                  const uCandidates = [
                                    uId,
                                    `UNIT-${uId}`,
                                    u.barcode,
                                    u.serial_number,
                                    u.serial_no,
                                    u.code,
                                  ].filter(Boolean).map(s => String(s).trim().toUpperCase());
                                  const cleanVal = String(val).trim().toUpperCase();
                                  return uCandidates.includes(cleanVal) || (cleanVal.startsWith("UNIT-") && uCandidates.includes(cleanVal.replace(/^UNIT-/i, "")));
                                });
                                const seq = match?.seq_no ? (String(match.seq_no).trim().startsWith("#") ? String(match.seq_no).trim() : `#${String(match.seq_no).trim()}`) : null;
                                const brand = match?.brand ? String(match.brand).trim() : "";
                                const model = match?.model ? String(match.model).trim() : "";
                                const brandModel = brand && model ? `${brand} • ${model}` : (brand || model || match?.name || "");
                                const prefix = [seq, brandModel].filter(Boolean).join(" ");
                                return (
                                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                                    <Check size={11} className="stroke-[3]" /> {prefix ? `${prefix} [${val}]` : `Assigned [${val}]`}
                                    {isOngoing && (
                                      <span className="ml-1 text-[9.5px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
                                        Released • Changeable
                                      </span>
                                    )}
                                  </span>
                                );
                              })() : (
                                <span className="text-slate-400 dark:text-slate-500">Unassigned</span>
                              )}
                            </div>
                            <BorrowSlotBarcodeSelector
                              unitKey={idxKey}
                              catKey={catKey}
                              uIdx={uIdx}
                              categoryName={reqCat.category}
                              currentBarcode={val}
                              availableUnits={availableUnits}
                              allUnits={allUnits}
                              dbEquipmentTypes={dbEquipmentTypes}
                              currentReqCat={reqCat}
                              assignedUnitSelections={assignedUnitSelections}
                              onSelectBarcode={(newBarcode) => {
                                const updated = { ...assignedUnitSelections, [idxKey]: newBarcode };
                                if (catKey !== idxKey && catKey in updated) delete updated[catKey];
                                setAssignedUnitSelections(updated);
                                if (selected && selected.id) {
                                  localStorage.setItem(`fsuu_assigned_units_eb_${selected.id}`, JSON.stringify(updated));
                                  api.put(`/avr-equipment-borrowings/${selected.id}/assign-units`, { assigned_units: updated }).catch(() => {});
                                }
                              }}
                            />

                            {/* Built-in physical units linked to selected physical unit */}
                            {val && (() => {
                              const slotBuiltIns = getBuiltInUnitsForBarcode(val, reqCat);
                              if (!slotBuiltIns || slotBuiltIns.length === 0) return null;
                              return (
                                <div className="mt-1.5 p-2.5 rounded-xl bg-blue-50/70 dark:bg-slate-900/80 border border-blue-200/80 dark:border-blue-900/50 space-y-1.5 animate-in fade-in">
                                  <div className="flex items-center justify-between text-[11px] font-extrabold text-blue-950 dark:text-white">
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse"></span>
                                      Built-in to [{val}]
                                    </span>
                                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full shadow-2xs">
                                      {slotBuiltIns.length} {slotBuiltIns.length === 1 ? "Unit" : "Units"} Linked
                                    </span>
                                  </div>
                                  <div className="flex flex-col gap-1 pt-0.5">
                                    {slotBuiltIns.map((biUnit, biIdx) => (
                                      <div
                                        key={biIdx}
                                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-900/50 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs"
                                      >
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {biUnit.seq_no && (
                                            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/80 text-[10.5px]">
                                              {biUnit.seq_no}
                                            </span>
                                          )}
                                          <span className="font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-[11px]">
                                            {biUnit.barcode}
                                          </span>
                                          <span className="text-slate-800 dark:text-slate-200 font-bold">{biUnit.name}</span>
                                        </div>
                                        {biUnit.category && (
                                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                            {biUnit.category}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* State 3: Completed (Read-only summary with returned condition badges) */}
              {isCompleted && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10.5px] font-mono text-slate-400 font-bold uppercase">
                    Dispatched Physical Units:
                  </span>
                  {Array.from({ length: reqCat.quantity }).map((_, uIdx) => {
                    const idxKey = `${catIdx}-${uIdx}`;
                    const catKey = `${reqCat.category}-${uIdx}`;
                    const val = assignedUnitSelections[idxKey] || assignedUnitSelections[catKey] || "";

                    const resolvedCond = val
                      ? unitReturnedConditions[val] || unitReturnedConditions[idxKey] || unitReturnedConditions[catKey] || "Complete"
                      : null;

                    const slotBuiltIns = getBuiltInUnitsForBarcode(val, reqCat);
                    const match = (allUnits || []).find(u => {
                      const uId = String(u.id).trim().toUpperCase();
                      const uCandidates = [
                        uId,
                        `UNIT-${uId}`,
                        u.barcode,
                        u.serial_number,
                        u.serial_no,
                        u.code,
                      ].filter(Boolean).map(s => String(s).trim().toUpperCase());
                      const cleanVal = String(val).trim().toUpperCase();
                      return uCandidates.includes(cleanVal) || (cleanVal.startsWith("UNIT-") && uCandidates.includes(cleanVal.replace(/^UNIT-/i, "")));
                    });
                    const seq = match?.seq_no ? (String(match.seq_no).trim().startsWith("#") ? String(match.seq_no).trim() : `#${String(match.seq_no).trim()}`) : null;
                    const brand = match?.brand ? String(match.brand).trim() : "";
                    const model = match?.model ? String(match.model).trim() : "";
                    const brandModel = brand && model ? `${brand} • ${model}` : (brand || model || match?.name || "");

                    return (
                      <div key={uIdx} className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono font-bold text-slate-800 dark:text-slate-200 gap-2">
                          <span>Unit {uIdx + 1}</span>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {seq && (
                              <span className="font-mono text-[10.5px] font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/80">
                                {seq}
                              </span>
                            )}
                            {brandModel && (
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                {brandModel}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-lg border font-extrabold ${
                              val && val !== "—"
                                ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-300 shadow-xs"
                                : "bg-amber-100/60 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                            }`}>
                              {val || "Unassigned"}
                            </span>

                            {resolvedCond && val && val !== "—" && (
                              <span className={`px-2 py-0.5 rounded-lg border font-extrabold shadow-xs ${
                                ['good', 'clean', 'complete'].includes(resolvedCond.toLowerCase())
                                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                  : resolvedCond.toLowerCase() === 'late return' || resolvedCond.toLowerCase() === 'late'
                                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                              }`}>
                                {resolvedCond}
                              </span>
                            )}
                          </div>
                        </div>

                        {slotBuiltIns.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-200/80 dark:border-slate-800 space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                              Built-in Linked Units ({slotBuiltIns.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {slotBuiltIns.map((biUnit, biIdx) => {
                                const biCond = (biUnit.barcode) ? (unitReturnedConditions[biUnit.barcode] || "Complete") : null;
                                const isBiLost = biCond && biCond.toLowerCase() === "lost";
                                const isBiDamaged = biCond && biCond.toLowerCase() === "damaged";
                                return (
                                  <span
                                    key={biIdx}
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium shadow-2xs ${
                                      isBiLost
                                        ? "bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold"
                                        : isBiDamaged
                                        ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-bold"
                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                    }`}
                                  >
                                    {biUnit.seq_no && (
                                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1 py-0.2 rounded border border-amber-200 dark:border-amber-800 text-[10px]">
                                        {biUnit.seq_no}
                                      </span>
                                    )}
                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1 py-0.2 rounded border border-blue-100 dark:border-blue-800 text-[10px]">
                                      {biUnit.barcode}
                                    </span>
                                    <span>{biUnit.name}</span>
                                    {biCond && biCond.toLowerCase() !== "complete" && biCond.toLowerCase() !== "good" && (
                                      <span className={`text-[10px] uppercase font-black px-1.5 py-0.2 rounded ${isBiLost ? "bg-rose-900 text-white" : "bg-rose-600 text-white"}`}>
                                        {biCond}
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
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

      {/* Workflow Actions Section */}
      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        {isApproved && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-blue-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">Fulfillment:</span>
              <span className={`text-xs font-extrabold ${
                hasCompromisedUnits
                  ? "text-rose-600 dark:text-rose-400"
                  : allUnitsAssigned
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}>
                {hasCompromisedUnits
                  ? "Unit / Built-in Damaged or Lost"
                  : allUnitsAssigned
                  ? "Ready for Release"
                  : "Units Pending Assignment"}
              </span>
            </div>
            {hasCompromisedUnits && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-[11px] font-semibold text-rose-800 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle size={14} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>One or more assigned units or linked built-in components are damaged or lost. The equipment cannot be released until the damaged component or unit is replaced.</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => handleAction(selected.id, "ongoing")}
              disabled={!canRelease || !!actionLoading}
              className={`w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                canRelease
                  ? "bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white cursor-pointer active:scale-[0.99]"
                  : "bg-slate-200 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700/80 cursor-not-allowed"
              }`}
            >
              {actionLoading === `${selected.id}-ongoing` ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              Release Equipment (Mark On-Going)
            </button>
          </div>
        )}

        {isOngoing && (
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-300">
            <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Equipment dispatched. Awaiting return &amp; post-use inspection.</span>
          </div>
        )}
      </div>
    </div>
  );
}
