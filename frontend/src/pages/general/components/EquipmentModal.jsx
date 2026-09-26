import { useState, useEffect, useMemo } from "react";
import { X, Loader2, Sparkles, Layers, Barcode as BarcodeIcon } from "lucide-react";
import api from "@/lib/axios";

export function generateSingleSerialNumber() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SN-${today}-${rand}`;
}

export function generateSingleBarcode() {
  return generateSingleSerialNumber();
}

export function generateSequentialBarcodes(baseBarcode, count) {
  const clean = (baseBarcode || "").trim();
  if (count <= 1) return [clean || generateSingleBarcode()];

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

function CategoryBuiltInUnitSelector({
  categoryName,
  categories = [],
  existingUnits = [],
  selectedUnitIds = [],
  onUnitChange,
  excludeId,
}) {
  const selectedCat = useMemo(() => {
    if (!categoryName) return null;
    const norm = String(categoryName).trim().toLowerCase();
    return (categories || []).find((c) => {
      const name = (typeof c === "string" ? c : (c.eq_name || c.name || "")).trim().toLowerCase();
      return name === norm;
    });
  }, [categoryName, categories]);

  const linkedCategories = useMemo(() => {
    if (!selectedCat) return [];

    let rawList = selectedCat.built_in_names;
    if (!Array.isArray(rawList) || rawList.length === 0) {
      let raw = selectedCat.built_in_units;
      if (typeof raw === "string") {
        try { raw = JSON.parse(raw); } catch { raw = [raw]; }
      }
      rawList = Array.isArray(raw) ? raw : [];
    }
    if (!Array.isArray(rawList) || rawList.length === 0) return [];

    return rawList.map((item, idx) => {
      if (!item) return null;
      const isNum = typeof item === "number" || /^\d+$/.test(String(item));
      const foundCat = (categories || []).find((c) => {
        if (isNum) return String(c.id) === String(item);
        const cName = (c.eq_name || c.name || "").trim().toLowerCase();
        return cName === String(item).trim().toLowerCase();
      });
      const catName = foundCat ? (foundCat.eq_name || foundCat.name) : String(item);
      const catId = foundCat ? foundCat.id : (isNum ? String(item) : null);

      return {
        key: `builtin-cat-${catId || catName}-${idx}`,
        id: catId,
        name: catName,
        categoryObj: foundCat,
      };
    }).filter(Boolean);
  }, [selectedCat, categories]);

  // Map units assigned to OTHER parent bundles so they can't be double-booked
  const assignedToOtherParentMap = useMemo(() => {
    const map = new Map();
    (existingUnits || []).forEach((parent) => {
      if (excludeId && String(parent.id) === String(excludeId)) return;
      let childIds = parent.built_in_units;
      if (typeof childIds === "string") {
        try { childIds = JSON.parse(childIds); } catch { childIds = []; }
      }
      if (Array.isArray(childIds)) {
        childIds.forEach((cId) => {
          if (cId) map.set(String(cId), parent);
        });
      }
    });
    return map;
  }, [existingUnits, excludeId]);

  const cleanSelectedIds = useMemo(() => {
    let arr = selectedUnitIds;
    if (typeof arr === "string") {
      try { arr = JSON.parse(arr); } catch { arr = [arr]; }
    }
    if (!Array.isArray(arr)) return [];
    return arr.map((id) => String(id)).filter(Boolean);
  }, [selectedUnitIds]);

  const isUnitInCategory = (unit, cat) => {
    if (!unit) return false;
    if (cat.id && String(unit.equipment_type_id) === String(cat.id)) return true;
    const uCat = String(unit.category || unit.equipment_type?.eq_name || unit.equipment_type?.name || "").trim().toLowerCase();
    const targetCat = String(cat.name || "").trim().toLowerCase();
    return uCat === targetCat;
  };

  const handleSelectUnit = (cat, newUnitId) => {
    // Preserve IDs that belong to other categories or unknown
    const otherIds = cleanSelectedIds.filter((id) => {
      const u = (existingUnits || []).find(
        (x) => String(x.id) === String(id) || String(x.barcode) === String(id)
      );
      if (!u) return true;
      return !isUnitInCategory(u, cat);
    });

    const nextSelected = newUnitId ? [...otherIds, String(newUnitId)] : otherIds;
    onUnitChange?.(nextSelected);
  };

  return (
    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Linked Built-in Equipment
        </label>
        {linkedCategories.length > 0 && (
          <span className="text-[10.5px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-lg shadow-2xs">
            {linkedCategories.length} {linkedCategories.length === 1 ? "Component Linked" : "Components Linked"}
          </span>
        )}
      </div>

      {linkedCategories.length > 0 ? (
        <div className="space-y-2.5">
          {linkedCategories.map((cat) => {
            const currentSelectedId = cleanSelectedIds.find((id) => {
              const u = (existingUnits || []).find(
                (x) => String(x.id) === String(id) || String(x.barcode) === String(id)
              );
              return isUnitInCategory(u, cat);
            });

            const currentUnitObj = currentSelectedId
              ? (existingUnits || []).find(
                  (x) =>
                    String(x.id) === String(currentSelectedId) ||
                    String(x.barcode) === String(currentSelectedId)
                )
              : null;

            const availableUnits = (existingUnits || []).filter((u) => {
              if (!isUnitInCategory(u, cat)) return false;
              if (excludeId && String(u.id) === String(excludeId)) return false;

              const isThisCurrent =
                String(u.id) === String(currentSelectedId) ||
                (u.barcode && String(u.barcode) === String(currentSelectedId));
              if (!isThisCurrent) {
                const uIdKey = String(u.id);
                const uBarcodeKey = u.barcode ? String(u.barcode) : null;
                if (assignedToOtherParentMap.has(uIdKey) || (uBarcodeKey && assignedToOtherParentMap.has(uBarcodeKey))) {
                  return false;
                }
              }
              return true;
            });

            return (
              <div key={cat.key} className="flex flex-col gap-2">
                {/* Category Badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs font-semibold shadow-2xs shrink-0 w-full">
                  <Layers size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">{cat.name}</span>
                </span>

                {/* Dropdown for units under this category */}
                <div className="flex-1 min-w-0">
                  <select
                    value={currentSelectedId || ""}
                    onChange={(e) => handleSelectUnit(cat, e.target.value)}
                    className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-700 transition-colors cursor-pointer"
                  >
                    <option value="">
                      {availableUnits.length === 0 && !currentUnitObj
                        ? `-- No units found in "${cat.name}" --`
                        : `-- Select ${cat.name} Unit (Optional) --`}
                    </option>

                    {currentUnitObj &&
                      !availableUnits.some(
                        (u) =>
                          String(u.id) === String(currentSelectedId) ||
                          (u.barcode && String(u.barcode) === String(currentSelectedId))
                      ) && (
                        <option value={currentUnitObj.id}>
                          {currentUnitObj.serial_number || currentUnitObj.barcode
                            ? `[${currentUnitObj.serial_number || currentUnitObj.barcode}] `
                            : ""}
                          {currentUnitObj.name ||
                            [currentUnitObj.brand, currentUnitObj.model].filter(Boolean).join(" ") ||
                            "Unit"}{" "}
                          (Current)
                        </option>
                      )}

                    {availableUnits.map((u) => {
                      const label = [
                        u.serial_number || u.barcode ? `[${u.serial_number || u.barcode}]` : "",
                        u.name || [u.brand, u.model].filter(Boolean).join(" ") || "Unit",
                        u.condition ? `(${u.condition})` : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <option key={u.id} value={u.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            );
          })}

          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-0.5">
            Select the physical equipment unit for each built-in component linked to this category.
          </p>
        </div>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">
          No built-in categories linked to this equipment category.
        </p>
      )}
    </div>
  );
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

  // ── All hooks MUST be called before any early return (Rules of Hooks) ──

  // Connect Brand to Equipment Category
  const activeCategoryName = showAddModal ? formData?.category : editFormData?.category;
  const selectedCatObj = useMemo(() => {
    if (!activeCategoryName) return null;
    const norm = String(activeCategoryName).trim().toLowerCase();
    return (categories || []).find((c) => {
      const name = (typeof c === "string" ? c : (c.eq_name || c.name || "")).trim().toLowerCase();
      return name === norm;
    });
  }, [activeCategoryName, categories]);

  const availableBrands = useMemo(() => {
    if (!selectedCatObj) return brands;
    const catId = selectedCatObj.id;
    const catName = (selectedCatObj.eq_name || selectedCatObj.name || "").trim().toLowerCase();

    const matched = brands.filter((b) => {
      if (b.equipment_type_id && String(b.equipment_type_id) === String(catId)) return true;
      if (b.equipment_type?.eq_name && b.equipment_type.eq_name.toLowerCase() === catName) return true;
      if (b.equipment_category_name && b.equipment_category_name.toLowerCase() === catName) return true;
      return false;
    });

    // If specific brands are linked to this category, return them; otherwise allow general brands
    return matched.length > 0 ? matched : brands;
  }, [brands, selectedCatObj]);

  // Duplicate checks for Serial No.
  const editSerialClean = (editFormData?.serial_number || "").trim().toLowerCase();
  const editSerialDuplicate = editingItem && editSerialClean ? existingUnits.find(u =>
    u.id !== editingItem.id &&
    ((u.serial_number || "").trim().toLowerCase() === editSerialClean ||
     (u.barcode || "").trim().toLowerCase() === editSerialClean)
  ) : null;

  const addSerialClean = (formData?.serial_number || "").trim().toLowerCase();
  const addSerialDuplicate = showAddModal && addSerialClean ? existingUnits.find(u =>
    ((u.serial_number || "").trim().toLowerCase() === addSerialClean ||
     (u.barcode || "").trim().toLowerCase() === addSerialClean)
  ) : null;

  const inputClasses = "w-full h-10 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-normal text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-700 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const labelClasses = "block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5";

  // ── Early return after all hooks ──
  if (!showAddModal && !editingItem) return null;

  const getBrandForCategory = (catName) => {
    if (!catName) return "";
    const norm = String(catName).trim().toLowerCase();
    const foundCat = (categories || []).find((c) => {
      const name = (typeof c === "string" ? c : (c.eq_name || c.name || "")).trim().toLowerCase();
      return name === norm;
    });
    const catId = foundCat?.id;
    const matched = brands.filter((b) => {
      if (catId && b.equipment_type_id && String(b.equipment_type_id) === String(catId)) return true;
      if (b.equipment_type?.eq_name && b.equipment_type.eq_name.toLowerCase() === norm) return true;
      if (b.equipment_category_name && b.equipment_category_name.toLowerCase() === norm) return true;
      return false;
    });
    return matched.length > 0 ? matched[0].name : (brands.length > 0 ? brands[0].name : "");
  };

  const handleBarcodeKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  return (
    <>
      {/* ── Edit Equipment Physical Unit Modal ── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-3xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-white dark:bg-[#111827] border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Edit Physical Unit: {editingItem.serial_number || editingItem.barcode || [editingItem.brand, editingItem.model].filter(Boolean).join(' ') || 'Unit'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditEquipmentSubmit}>
              {/* Side-by-side layout: form fields left, built-in selector right */}
              <div className="flex flex-col md:flex-row">
                {/* ── Left Panel: Main Form Fields ── */}
                <div className="flex-1 p-6 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>Equipment Category *</label>
                      <select
                        required
                        value={editFormData.category}
                        onChange={e => {
                          const newCat = e.target.value;
                          const newBrand = getBrandForCategory(newCat);
                          setEditFormData({
                            ...editFormData,
                            category: newCat,
                            brand: newBrand || editFormData.brand,
                          });
                        }}
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
                        <label className={labelClasses}>Serial No.</label>
                        <button
                          type="button"
                          onClick={() => {
                            const code = generateSingleSerialNumber();
                            setEditFormData({
                              ...editFormData,
                              serial_number: code,
                              barcode: code,
                            });
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Auto-generate Serial Number"
                        >
                          <Sparkles size={12} className="text-amber-500" />
                          <span>Auto-generate</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. SN-2026-001"
                        value={editFormData.serial_number ?? editFormData.barcode ?? ""}
                        onKeyDown={handleBarcodeKeyDown}
                        onChange={e => setEditFormData({
                          ...editFormData,
                          serial_number: e.target.value,
                          barcode: e.target.value,
                        })}
                        className={`${inputClasses} ${editSerialDuplicate ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20' : ''}`}
                      />
                      {editSerialDuplicate && (
                        <p className="mt-1 text-[11px] font-medium text-rose-600 leading-tight">
                          ⚠️ Assigned to: <strong>{editSerialDuplicate.name || editSerialDuplicate.model || 'another unit'}</strong>. Each unit requires a unique Serial No.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>Brand</label>
                      <select
                        value={editFormData.brand || ""}
                        onChange={e => setEditFormData({ ...editFormData, brand: e.target.value })}
                        className={inputClasses}
                      >
                        <option value="">-- Select Brand --</option>
                        {availableBrands.map(b => (
                          <option key={b.id || b.name} value={b.name}>{b.name}</option>
                        ))}
                        {editFormData.brand && !availableBrands.some(b => b.name?.toUpperCase() === editFormData.brand?.toUpperCase()) && (
                          <option value={editFormData.brand}>{editFormData.brand}</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className={labelClasses}>Model Name</label>
                      <input
                        type="text"
                        placeholder="Model No."
                        value={editFormData.model || ""}
                        onChange={e => setEditFormData({ ...editFormData, model: e.target.value })}
                        className={inputClasses}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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

                  <div>
                    <label className={labelClasses}>Reason / Trigger Note (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Broken lens, Repaired and functional, Routine inspection..."
                      value={editFormData.reason || ""}
                      onChange={e => setEditFormData({ ...editFormData, reason: e.target.value })}
                      className={inputClasses}
                    />
                    <p className="mt-1 text-[10.5px] text-slate-400 dark:text-slate-500 font-medium">
                      Recorded in the Dashboard audit feed to document what triggered this inventory stat change.
                    </p>
                  </div>
                </div>

                {/* ── Right Panel: Linked Built-in Equipment ── */}
                <div className="w-full md:w-72 shrink-0 border-t border-slate-100 dark:border-slate-800 md:border-t-0 md:border-l p-6">
                  <CategoryBuiltInUnitSelector
                    categoryName={editFormData.category}
                    categories={categories}
                    existingUnits={existingUnits}
                    selectedUnitIds={editFormData.built_in_units || []}
                    onUnitChange={(newUnitIds) => setEditFormData({ ...editFormData, built_in_units: newUnitIds })}
                    excludeId={editingItem?.id}
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!editSerialDuplicate}
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-3xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-white dark:bg-[#111827] border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Add Physical Equipment Unit
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEquipment}>
              {/* Side-by-side layout: form fields left, built-in selector right */}
              <div className="flex flex-col md:flex-row">
                {/* ── Left Panel: Main Form Fields ── */}
                <div className="flex-1 p-6 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>Equipment Category *</label>
                      <select
                        required
                        value={formData.category}
                        onChange={e => {
                          const newCat = e.target.value;
                          const newBrand = getBrandForCategory(newCat);
                          setFormData({
                            ...formData,
                            category: newCat,
                            brand: newBrand || formData.brand,
                          });
                        }}
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
                        <label className={labelClasses}>Serial No.</label>
                        <button
                          type="button"
                          onClick={() => {
                            const code = generateSingleSerialNumber();
                            setFormData({
                              ...formData,
                              serial_number: code,
                              barcode: code,
                            });
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Auto-generate Serial Number"
                        >
                          <Sparkles size={12} className="text-amber-500" />
                          <span>Auto-generate</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. SN-2026-001"
                        value={formData.serial_number || ""}
                        onKeyDown={handleBarcodeKeyDown}
                        onChange={e => setFormData({ ...formData, serial_number: e.target.value, barcode: e.target.value })}
                        className={`${inputClasses} ${addSerialDuplicate ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20' : ''}`}
                      />
                      {addSerialDuplicate && (
                        <p className="mt-1 text-[11px] font-medium text-rose-600 leading-tight">
                          ⚠️ Assigned to: <strong>{addSerialDuplicate.name || addSerialDuplicate.model || 'another unit'}</strong>. Each unit requires a unique Serial No.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>Brand</label>
                      <select
                        value={formData.brand || ""}
                        onChange={e => setFormData({ ...formData, brand: e.target.value })}
                        className={inputClasses}
                      >
                        <option value="">-- Select Brand --</option>
                        {availableBrands.map(b => (
                          <option key={b.id || b.name} value={b.name}>{b.name}</option>
                        ))}
                        {formData.brand && !availableBrands.some(b => b.name?.toUpperCase() === formData.brand?.toUpperCase()) && (
                          <option value={formData.brand}>{formData.brand}</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className={labelClasses}>Model Name</label>
                      <input
                        type="text"
                        placeholder="Model No."
                        value={formData.model || ""}
                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                        className={inputClasses}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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
                </div>

                {/* ── Right Panel: Linked Built-in Equipment ── */}
                <div className="w-full md:w-72 shrink-0 border-t border-slate-100 dark:border-slate-800 md:border-t-0 md:border-l p-6">
                  <CategoryBuiltInUnitSelector
                    categoryName={formData.category}
                    categories={categories}
                    existingUnits={existingUnits}
                    selectedUnitIds={formData.built_in_units || []}
                    onUnitChange={(newUnitIds) => setFormData({ ...formData, built_in_units: newUnitIds })}
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!addSerialDuplicate}
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
