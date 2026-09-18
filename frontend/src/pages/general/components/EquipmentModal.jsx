import { useState, useEffect, useMemo } from "react";
import { X, Loader2, Plus, Minus, ChevronDown, Layers } from "lucide-react";
import api from "@/lib/axios";

export function generateSequentialBarcodes(baseBarcode, count) {
  const clean = (baseBarcode || "").trim();
  if (count <= 1) return [clean || `BC-${Date.now().toString().slice(-6)}`];

  const results = [];
  const match = clean.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const padLen = numStr.length;
    const startNum = parseInt(numStr, 10);
    for (let i = 0; i < count; i++) {
      results.push(`${prefix}${String(startNum + i).padStart(padLen, "0")}`);
    }
  } else if (clean) {
    for (let i = 1; i <= count; i++) {
      results.push(`${clean}-${String(i).padStart(2, "0")}`);
    }
  } else {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    for (let i = 1; i <= count; i++) {
      results.push(`BC-${today}-${String(i).padStart(3, "0")}`);
    }
  }
  return results;
}

export default function EquipmentModal({
  showAddModal,
  setShowAddModal,
  editingItem,
  setEditingItem,
  formData,
  setFormData,
  editFormData,
  setEditFormData,
  handleAddEquipment,
  handleEditEquipmentSubmit,
  isSubmitting,
  categories = ["Projector", "Sound System", "Camera", "Microphone", "Lighting", "Switchers/Mixers", "AV Equipment"],
  existingUnits = [],
}) {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    let isMounted = true;
    api.get("/general/brands", { params: { all: 1, active_only: 1 } })
      .then(res => {
        if (!isMounted) return;
        const list = res.data?.brands?.data || (Array.isArray(res.data?.brands) ? res.data.brands : []);
        setBrands(list);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  if (!showAddModal && !editingItem) return null;

  const handleBarcodeKeyDown = (e) => {
    // If USB barcode scanner fires Enter keypress
    if (e.key === "Enter") {
      e.preventDefault();
      // Keep input captured
    }
  };

  // Real-time duplicate barcode detection
  const editBarcodeClean = (editFormData?.barcode || "").trim().toLowerCase();
  const editDuplicate = editingItem && editBarcodeClean ? existingUnits.find(u =>
    u.id !== editingItem.id && (u.barcode || "").trim().toLowerCase() === editBarcodeClean
  ) : null;

  const addBarcodeClean = (formData?.barcode || "").trim().toLowerCase();
  const addDuplicate = showAddModal && addBarcodeClean ? existingUnits.find(u =>
    (u.barcode || "").trim().toLowerCase() === addBarcodeClean
  ) : null;

function BuiltInUnitsSelector({
  builtInList,
  setBuiltInList,
  existingUnits,
  excludeId,
  inputClasses,
}) {
  const rawList = Array.isArray(builtInList) ? builtInList : [];
  const list = rawList.length > 0 ? rawList : [""];

  const handleSlotChange = (index, value) => {
    const next = [...list];
    next[index] = value;
    setBuiltInList(next);
  };

  const handleAddSlot = () => {
    setBuiltInList([...list, ""]);
  };

  const handleRemoveSlot = (index) => {
    if (list.length <= 1) {
      setBuiltInList([""]);
    } else {
      setBuiltInList(list.filter((_, i) => i !== index));
    }
  };

  const normKey = (val) => String(val ?? "").trim().toUpperCase();

  const extractIdentifiers = (field) => {
    if (!field) return [];
    let raw = field;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = [raw];
      }
    }
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return normKey(item.id || item.barcode);
        }
        return normKey(item);
      })
      .filter(Boolean);
  };

  // 1. Map of all physical units already assigned as built-in to ANOTHER equipment unit in the inventory
  const assignedToOtherParentMap = useMemo(() => {
    const map = new Map(); // childIdentifier -> parent unit
    (existingUnits || []).forEach((parent) => {
      // Exclude the current parent unit being edited so its own linked units remain selectable for it
      if (excludeId && String(parent.id) === String(excludeId)) return;

      const childIds = extractIdentifiers(parent.built_in_units);
      childIds.forEach((cId) => {
        if (cId) {
          map.set(cId, parent);
        }
      });
    });
    return map;
  }, [existingUnits, excludeId]);

  // 2. Units eligible for built-in selection:
  // - Cannot be this unit itself (excludeId)
  // - Cannot be already assigned as built-in to another unit
  const eligibleUnits = useMemo(() => {
    return (existingUnits || []).filter((u) => {
      // Cannot be built-in to itself
      if (excludeId && String(u.id) === String(excludeId)) return false;

      const uIdKey = normKey(u.id);
      const uBarcodeKey = normKey(u.barcode);

      // Exclude if already assigned to another unit
      if (assignedToOtherParentMap.has(uIdKey) || (uBarcodeKey && assignedToOtherParentMap.has(uBarcodeKey))) {
        return false;
      }

      return true;
    });
  }, [existingUnits, excludeId, assignedToOtherParentMap]);

  const selectedCount = list.filter(Boolean).length;

  return (
    <div className="space-y-2 pt-2 border-t border-slate-100">
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-xs font-medium text-slate-700 block">
          Built-in
        </label>
        <div className="flex items-center gap-1.5">
          {assignedToOtherParentMap.size > 0 && (
            <span
              className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg"
              title="Physical units already bundled inside another unit are hidden from the dropdown"
            >
              {assignedToOtherParentMap.size} {assignedToOtherParentMap.size === 1 ? "unit" : "units"} in other bundles
            </span>
          )}
          {selectedCount > 0 && (
            <span className="text-[10.5px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg shadow-2xs">
              {selectedCount} {selectedCount === 1 ? "Unit Linked" : "Units Linked"}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {list.map((currentVal, idx) => {
          const normCurrent = normKey(currentVal);

          // Units picked in other slots of THIS modal
          const otherSelectedNorms = list
            .filter((_, i) => i !== idx && Boolean(_))
            .map(normKey);

          // Units available in this slot dropdown:
          // Must be in eligibleUnits, AND not picked in another slot of this modal (unless it's the currentVal of this slot)
          const slotUnits = eligibleUnits.filter((u) => {
            const uIdKey = normKey(u.id);
            const uBarcodeKey = normKey(u.barcode);

            // If selected in THIS slot, keep it so it stays visible as selected
            if (normCurrent && (uIdKey === normCurrent || uBarcodeKey === normCurrent)) {
              return true;
            }

            // If already picked in ANOTHER slot in this modal, do not show
            if (otherSelectedNorms.includes(uIdKey) || (uBarcodeKey && otherSelectedNorms.includes(uBarcodeKey))) {
              return false;
            }

            return true;
          });

          // In case currentVal is set but somehow not in slotUnits (e.g. from existing DB data), find it to display nicely
          const selectedUnitObj = (existingUnits || []).find((u) => {
            const uIdKey = normKey(u.id);
            const uBarcodeKey = normKey(u.barcode);
            return normCurrent && (uIdKey === normCurrent || uBarcodeKey === normCurrent);
          });

          return (
            <div key={`builtin-slot-${idx}`} className="flex items-center gap-2">
              {/* Minus button to remove or clear slot */}
              <button
                type="button"
                onClick={() => handleRemoveSlot(idx)}
                disabled={list.length === 1 && !currentVal}
                className="w-10 h-10 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-600 cursor-pointer transition-colors shadow-2xs shrink-0"
                title="Remove physical unit from built-in bundle"
              >
                <Minus size={15} />
              </button>

              {/* Dropdown with actual raw data from Manage Equipment */}
              <div className="relative flex-1">
                <select
                  value={currentVal || ""}
                  onChange={(e) => handleSlotChange(idx, e.target.value)}
                  className={`${inputClasses} cursor-pointer font-medium text-slate-800 appearance-none pr-8`}
                >
                  <option value="">
                    {slotUnits.length === 0 && !currentVal
                      ? "-- No available physical units to link --"
                      : "-- Select Built-in Physical Unit --"}
                  </option>
                  {selectedUnitObj && !slotUnits.some((u) => normKey(u.id) === normCurrent || normKey(u.barcode) === normCurrent) && (
                    <option value={selectedUnitObj.id}>
                      {selectedUnitObj.barcode ? `[${selectedUnitObj.barcode}] ` : ""}
                      {selectedUnitObj.name || [selectedUnitObj.brand, selectedUnitObj.model].filter(Boolean).join(" ") || "Physical Unit"} ({selectedUnitObj.category || "AV"})
                    </option>
                  )}
                  {slotUnits.map((u) => {
                    const unitName = u.name || [u.brand, u.model].filter(Boolean).join(" ") || "Equipment Unit";
                    const displayLabel = u.barcode
                      ? `[${u.barcode}] ${unitName} (${u.category || "AV"})`
                      : `${unitName} (${u.category || "AV"})`;

                    return (
                      <option key={u.id || u.barcode} value={u.id}>
                        {displayLabel}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>

              {/* Plus button to add another physical unit dropdown */}
              {idx === list.length - 1 ? (
                <button
                  type="button"
                  onClick={handleAddSlot}
                  disabled={eligibleUnits.length > 0 && list.filter(Boolean).length >= eligibleUnits.length}
                  className="w-10 h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors shadow-2xs shrink-0"
                  title={
                    eligibleUnits.length > 0 && list.filter(Boolean).length >= eligibleUnits.length
                      ? "All available units have already been linked"
                      : "Add another physical unit dropdown"
                  }
                >
                  <Plus size={15} />
                </button>
              ) : (
                <div className="w-10 h-10 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

  const inputClasses = "w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-normal text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors placeholder:text-slate-400";
  const labelClasses = "block text-xs font-medium text-slate-700 mb-1.5";

  return (
    <>
      {/* ── Edit Equipment Physical Unit Modal ── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Edit Physical Unit: {editingItem.barcode || [editingItem.brand, editingItem.model].filter(Boolean).join(' ') || 'Unit'}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditEquipmentSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Equipment Category *</label>
                  <select
                    required
                    value={editFormData.category}
                    onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
                    className={`${inputClasses} cursor-pointer`}
                  >
                    {categories && categories.length > 0 ? (
                      categories.map((cat, idx) => {
                        const nameStr = typeof cat === "string" ? cat : (cat.eq_name || cat.name);
                        return <option key={cat.id || idx} value={nameStr}>{nameStr}</option>;
                      })
                    ) : (
                      <option value="">No categories created</option>
                    )}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-700">Barcode *</label>
                    {editDuplicate && (
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">Already in use</span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12345-XYZ"
                    value={editFormData.barcode}
                    onKeyDown={handleBarcodeKeyDown}
                    onChange={e => setEditFormData({ ...editFormData, barcode: e.target.value })}
                    className={`${inputClasses} ${editDuplicate ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20' : ''}`}
                  />
                  {editDuplicate && (
                    <p className="mt-1 text-[11px] font-medium text-rose-600 leading-tight">
                      ⚠️ Assigned to: <strong>{editDuplicate.name || editDuplicate.model || 'another unit'}</strong>. Each unit requires a unique barcode.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Brand</label>
                  <select
                    value={editFormData.brand || ""}
                    onChange={e => setEditFormData({ ...editFormData, brand: e.target.value })}
                    className={inputClasses}
                  >
                    <option value="">-- Select Brand --</option>
                    {brands.map(b => (
                      <option key={b.id || b.name} value={b.name}>{b.name}</option>
                    ))}
                    {editFormData.brand && !brands.some(b => b.name?.toUpperCase() === editFormData.brand?.toUpperCase()) && (
                      <option value={editFormData.brand}>{editFormData.brand}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Model Name</label>
                  <input
                    type="text"
                    placeholder="e.g. PowerLite 1780W, Alpha A7 IV"
                    value={editFormData.model || ""}
                    onChange={e => setEditFormData({ ...editFormData, model: e.target.value })}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelClasses}>Lifespan (Yrs) *</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    required
                    placeholder="5"
                    value={editFormData.lifespan_years || 5}
                    onChange={e => setEditFormData({ ...editFormData, lifespan_years: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>Date Purchased</label>
                  <input
                    type="date"
                    value={editFormData.date_purchased}
                    onChange={e => setEditFormData({ ...editFormData, date_purchased: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>Status *</label>
                  <select
                    value={(editFormData.status || "available").toLowerCase()}
                    onChange={e => setEditFormData({ ...editFormData, status: e.target.value.toLowerCase() })}
                    disabled={editFormData.condition === "Damaged"}
                    className={`${inputClasses} cursor-pointer disabled:opacity-50`}
                  >
                    <option value="available">Available</option>
                    <option value="released">Released</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Condition *</label>
                  <select
                    value={editFormData.condition || "Good"}
                    onChange={e => {
                      const val = e.target.value;
                      const newStatus = val === "Good" ? "available" : "unavailable";
                      setEditFormData({
                        ...editFormData,
                        condition: val,
                        status: newStatus,
                      });
                    }}
                    className={`${inputClasses} cursor-pointer`}
                  >
                    <option value="Good">Good</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>

              {/* Built-in Physical Units Selector (Dropdown + / - buttons to add/remove raw physical units) */}
              <BuiltInUnitsSelector
                builtInList={editFormData.built_in_units}
                setBuiltInList={(nextList) => setEditFormData({ ...editFormData, built_in_units: nextList })}
                existingUnits={existingUnits}
                excludeId={editingItem?.id}
                inputClasses={inputClasses}
              />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!editDuplicate}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </span>
                  ) : (
                    <span>Update Physical Unit</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Equipment Physical Unit Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Add Physical Equipment Unit
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEquipment} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Equipment Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className={`${inputClasses} cursor-pointer`}
                  >
                    {categories && categories.length > 0 ? (
                      categories.map((cat, idx) => {
                        const nameStr = typeof cat === "string" ? cat : (cat.eq_name || cat.name);
                        return <option key={cat.id || idx} value={nameStr}>{nameStr}</option>;
                      })
                    ) : (
                      <option value="">Create Category in Settings First</option>
                    )}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-700">Barcode *</label>
                    {addDuplicate && (
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">Already in use</span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12345-XYZ"
                    value={formData.barcode}
                    onKeyDown={handleBarcodeKeyDown}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className={`${inputClasses} ${addDuplicate ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20' : ''}`}
                  />
                  {addDuplicate && (
                    <p className="mt-1 text-[11px] font-medium text-rose-600 leading-tight">
                      ⚠️ Assigned to: <strong>{addDuplicate.name || addDuplicate.model || 'another unit'}</strong>. Each unit requires a unique barcode.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Brand</label>
                  <select
                    value={formData.brand || ""}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    className={inputClasses}
                  >
                    <option value="">-- Select Brand --</option>
                    {brands.map(b => (
                      <option key={b.id || b.name} value={b.name}>{b.name}</option>
                    ))}
                    {formData.brand && !brands.some(b => b.name?.toUpperCase() === formData.brand?.toUpperCase()) && (
                      <option value={formData.brand}>{formData.brand}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Model Name</label>
                  <input
                    type="text"
                    placeholder="e.g. PowerLite 1780W, Alpha A7 IV"
                    value={formData.model || ""}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelClasses}>Lifespan (Yrs) *</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    required
                    placeholder="5"
                    value={formData.lifespan_years || 5}
                    onChange={e => setFormData({ ...formData, lifespan_years: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>Date Purchased</label>
                  <input
                    type="date"
                    value={formData.date_purchased}
                    onChange={e => setFormData({ ...formData, date_purchased: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>Status *</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className={`${inputClasses} cursor-pointer`}
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Condition *</label>
                  <select
                    value={formData.condition || "Good"}
                    onChange={e => setFormData({ ...formData, condition: e.target.value })}
                    className={`${inputClasses} cursor-pointer`}
                  >
                    <option value="Good">Good</option>
                    <option value="Under Repair">Under Repair</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>

              {/* Built-in Physical Units Selector (Dropdown + / - buttons to add/remove raw physical units) */}
              <BuiltInUnitsSelector
                builtInList={formData.built_in_units}
                setBuiltInList={(nextList) => setFormData({ ...formData, built_in_units: nextList })}
                existingUnits={existingUnits}
                inputClasses={inputClasses}
              />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!addDuplicate}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </span>
                  ) : (
                    <span>Register Physical Unit</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
