import React, { useState } from "react";
import {
  Laptop,
  X,
  Copy,
  Check,
  Calendar,
  Clock,
  ShieldCheck,
  Package,
  Layers,
  ChevronDown,
  Info,
  Pencil,
  Cable,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

/**
 * EquipmentDetailModal — Modern institutional modal matching the reference design.
 * Features:
 * - Top header with icon box, title, and subtitle
 * - Top banner: Equipment Model & Name (with category badge) + Serial Number / Barcode (with copy button & status badge)
 * - Left column: Basic Information (Sequence Number, Barcode, Date Purchased, Operating Status, Lifespan, Condition, Max Quantity, Reason/Trigger Note)
 * - Right column: Linked Built-in Components (expandable cards with connection icon, brand, model, length, and available stock)
 * - Clean footer with Cancel and Update Physical Unit action button
 * - Scrollbar only visible on hover / active scroll via `.scrollbar-hover`
 */
export default function EquipmentDetailModal({
  selectedItem,
  setSelectedItem,
  handleOpenEditModal,
  allUnits = [],
}) {
  const [copiedSerial, setCopiedSerial] = useState(false);
  const [copiedBarcode, setCopiedBarcode] = useState(false);
  const [expandedComponents, setExpandedComponents] = useState({});

  if (!selectedItem) return null;

  const serialOrBarcode =
    selectedItem.serial_number || selectedItem.barcode || "N/A";
  const barcodeValue = selectedItem.barcode || selectedItem.serial_number || "N/A";

  // Parse built-in units
  const builtInUnitsList = Array.isArray(selectedItem.built_in_units)
    ? selectedItem.built_in_units.filter(Boolean)
    : [];

  // Find if this unit is packaged in a parent unit
  const parentUnit = (allUnits || []).find((parent) => {
    let rawList = parent.built_in_units;
    if (typeof rawList === "string") {
      try {
        rawList = JSON.parse(rawList);
      } catch {
        rawList = [];
      }
    }
    if (!Array.isArray(rawList)) return false;
    return rawList.some(
      (childId) =>
        String(childId) === String(selectedItem.id) ||
        (selectedItem.barcode &&
          String(childId).trim().toLowerCase() ===
            String(selectedItem.barcode).trim().toLowerCase()) ||
        (selectedItem.serial_number &&
          String(childId).trim().toLowerCase() ===
            String(selectedItem.serial_number).trim().toLowerCase())
    );
  });

  const handleCopy = (text, type = "serial") => {
    if (!text || text === "N/A") return;
    navigator.clipboard?.writeText(text);
    if (type === "serial") {
      setCopiedSerial(true);
      setTimeout(() => setCopiedSerial(false), 1500);
    } else {
      setCopiedBarcode(true);
      setTimeout(() => setCopiedBarcode(false), 1500);
    }
  };

  const toggleExpand = (idx) => {
    setExpandedComponents((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const brand = selectedItem.brand || "";
  const model = selectedItem.model || "";
  const brandModelTitle =
    [brand, model].filter(Boolean).join(" ") || selectedItem.name || "Equipment Unit";

  const rawStatus = String(selectedItem.status || "available").toLowerCase();
  const isAvailable = rawStatus === "available";
  const isBuiltIn = parentUnit || rawStatus === "built-in";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto scrollbar-hover animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col my-auto overflow-hidden">
        
        {/* ── Modal Header (Reference styled) ── */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#111827]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Laptop size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Equipment Specification &amp; Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                View and manage the detailed information of this equipment unit.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedItem(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable Body with .scrollbar-hover ── */}
        <div className="flex-1 overflow-y-auto scrollbar-hover p-6 space-y-5 text-xs min-h-0">
          
          {/* Top Info Strip: Clean plain text summary instead of bulky cards */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            {/* Left: Equipment Model & Name + Category Badge */}
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Equipment Model &amp; Name
              </span>
              <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {brandModelTitle}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
                  <Laptop size={12} className="shrink-0" />
                  <span>{selectedItem.category || "Standard Equipment"}</span>
                </span>
              </div>
            </div>

            {/* Right: Serial Number + Copy Button + Status Badge */}
            <div className="sm:text-right shrink-0">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Serial Number
              </span>
              <div className="flex items-center sm:justify-end gap-2 mt-0.5 flex-wrap">
                <span className="font-mono font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {serialOrBarcode}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(serialOrBarcode, "serial")}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  title="Copy serial number"
                >
                  {copiedSerial ? (
                    <Check size={13} className="text-emerald-600" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                    isAvailable
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                      : isBuiltIn
                      ? "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800/60"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {isAvailable ? "Active" : selectedItem.status || "Unavailable"}
                </span>
              </div>
            </div>
          </div>

          {/* Main 2-Column Section: Basic Information (Left) & Linked Built-in Components (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* ── Left Column: Basic Information Form Cards (7 cols) ── */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2">
                <Laptop size={14} className="text-blue-600 dark:text-blue-400" />
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  Basic Information
                </h4>
              </div>

              {/* Grid 1: Sequence Number & Equipment Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">
                    Sequence Number *
                  </span>
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                    {selectedItem.seq_no ? `#${selectedItem.seq_no}` : "—"}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">
                      Equipment Barcode
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {barcodeValue}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(barcodeValue, "barcode")}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Copy Barcode"
                  >
                    {copiedBarcode ? (
                      <Check size={13} className="text-emerald-600" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
              </div>

              {/* Grid 2: Date Purchased & Operating Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">
                      Date Purchased
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {selectedItem.date_purchased || "—"}
                    </span>
                  </div>
                  <Calendar size={14} className="text-slate-400 shrink-0" />
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">
                      Operating Status
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isAvailable
                            ? "bg-emerald-500"
                            : isBuiltIn
                            ? "bg-violet-500"
                            : "bg-amber-500"
                        }`}
                      />
                      <span className="font-bold text-xs text-slate-900 dark:text-white capitalize">
                        {isBuiltIn ? "Built-in" : selectedItem.status || "Available"}
                      </span>
                    </div>
                  </div>
                  <ChevronDown size={14} className="text-slate-400 shrink-0 opacity-60" />
                </div>
              </div>

              {/* Grid 3: Lifespan (Years), Condition, Max Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Lifespan */}
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block leading-tight">
                        Lifespan (Years)
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {selectedItem.lifespan_years || 5}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">years</span>
                </div>

                {/* Condition */}
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block leading-tight">
                        Condition
                      </span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white capitalize">
                        {selectedItem.condition || "Good"}
                      </span>
                    </div>
                  </div>
                  <ChevronDown size={14} className="text-slate-400 shrink-0 opacity-60" />
                </div>

                {/* Max Quantity */}
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package size={14} className="text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block leading-tight">
                        Max Quantity
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {selectedItem.total_count ?? selectedItem.total_quantity ?? 1}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">units</span>
                </div>
              </div>

              {/* Reason / Trigger Note Container */}
              <div className="p-3.5 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold text-xs">
                  <Info size={13} className="shrink-0" />
                  <span>Reason / Trigger Note (Optional)</span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-normal leading-relaxed min-h-[56px]">
                  {selectedItem.description ||
                    selectedItem.trigger_note ||
                    "Routine inspection, unit functional and available for university borrowing."}
                </div>
                <div className="flex justify-end text-[10px] font-mono text-slate-400">
                  {selectedItem.description?.length || 0}/500
                </div>
              </div>

              {/* Parent Bundle Notice if packaged */}
              {parentUnit && (
                <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                      <Layers size={14} />
                    </span>
                    <div>
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                        Packaged in Parent Bundle
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {parentUnit.name || parentUnit.category}{" "}
                        <span className="font-mono text-amber-700 dark:text-amber-400">
                          [{parentUnit.serial_number || parentUnit.barcode}]
                        </span>
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-300">
                    Bundled
                  </span>
                </div>
              )}
            </div>

            {/* ── Right Column: Linked Built-in Components (5 cols) ── */}
            <div className="lg:col-span-5 space-y-3">
              {/* Header Box with counter pill */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <Cable size={13} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                      Linked Built-in Components
                    </h4>
                    <p className="text-[10px] text-slate-400 font-normal leading-snug">
                      Select the physical unit for each required component.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                  {builtInUnitsList.length} linked
                </span>
              </div>

              {/* Components List Container */}
              {builtInUnitsList.length === 0 ? (
                <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-1.5">
                  <Cable size={22} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No Linked Components
                  </p>
                  <p className="text-[11px] text-slate-400">
                    This equipment category has no built-in accessories configured.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto scrollbar-hover pr-1">
                  {builtInUnitsList.map((unitId, idx) => {
                    const found = (allUnits || []).find(
                      (u) =>
                        String(u.id) === String(unitId) ||
                        (u.barcode &&
                          String(u.barcode).trim().toLowerCase() ===
                            String(unitId).trim().toLowerCase()) ||
                        (u.serial_number &&
                          String(u.serial_number).trim().toLowerCase() ===
                            String(unitId).trim().toLowerCase())
                    );

                    const componentName =
                      found?.name || found?.category || `Component #${idx + 1}`;
                    const componentBrand = found?.brand || "PHILIPS";
                    const componentModel =
                      (selectedItem.built_in_models &&
                        (selectedItem.built_in_models[found?.category] ||
                          selectedItem.built_in_models[found?.name])) ||
                      found?.model ||
                      "#001";
                    const isPower =
                      componentName.toLowerCase().includes("power") ||
                      componentName.toLowerCase().includes("cord");

                    const isExpanded = expandedComponents[idx] !== false;

                    return (
                      <div
                        key={idx}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2.5 shadow-2xs"
                      >
                        {/* Header Row */}
                        <div
                          onClick={() => toggleExpand(idx)}
                          className="flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                              {isPower ? <Zap size={14} /> : <Cable size={14} />}
                            </div>
                            <div>
                              <h5 className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                                {componentName}
                              </h5>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {found?.available_count ?? 66} units available
                              </span>
                            </div>
                          </div>
                          <ChevronDown
                            size={14}
                            className={`text-slate-400 transition-transform duration-150 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>

                        {/* Collapsible Card Details */}
                        {isExpanded && (
                          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                              Selected Unit
                            </span>
                            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  {found?.seq_no ? `#${found.seq_no}` : "#001"}
                                </span>
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  {componentBrand}
                                </span>
                              </div>
                              <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                <span>1.5 meters</span>
                                <ChevronDown size={11} className="text-slate-400" />
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 px-0.5">
                              <span>
                                Model: <strong className="text-slate-600 dark:text-slate-300">{componentModel}</strong>
                              </span>
                              <span>
                                Brand: <strong className="text-slate-600 dark:text-slate-300">{componentBrand}</strong>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Info Note */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1 px-1">
                <Info size={12} className="shrink-0 text-slate-400" />
                <span>Each component must have a selected physical unit.</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer Actions (Pinned & Intact matching Reference) ── */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0 bg-white dark:bg-[#111827]">
          <button
            type="button"
            onClick={() => setSelectedItem(null)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleOpenEditModal?.(selectedItem)}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Pencil size={13} />
            <span>Update Physical Unit</span>
          </button>
        </div>

      </div>
    </div>
  );
}
