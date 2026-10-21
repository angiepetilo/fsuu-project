import React, { useState, useMemo } from "react";
import {
  X,
  Download,
  Calendar,
  FileSpreadsheet,
  FileText,
  Check,
  Layers,
  Loader2,
  Clock,
  Filter,
  Code2,
} from "lucide-react";

/**
 * Standard Date Range Presets Bounds   
 */
export function getPresetDateBounds(presetKey, customStart = "", customEnd = "") {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  switch (presetKey) {
    case "today": {
      const start = new Date(year, month, date, 0, 0, 0, 0);
      const end = new Date(year, month, date, 23, 59, 59, 999);
      return { start, end };
    }
    case "month": {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case "year": {
      const start = new Date(year, 0, 1, 0, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
    case "custom": {
      if (!customStart && !customEnd) return { start: null, end: null };
      const start = customStart ? new Date(`${customStart}T00:00:00`) : new Date(1970, 0, 1);
      const end = customEnd ? new Date(`${customEnd}T23:59:59.999`) : new Date(2099, 11, 31);
      return { start, end };
    }
    case "all":
    default:
      return { start: null, end: null };
  }
}

/**
 * Helper to check if a single record matches date bounds
 */
export function matchesDateBounds(record, bounds, dateAccessor) {
  if (!bounds || (!bounds.start && !bounds.end)) return true;
  if (!record) return false;

  let raw = null;
  if (typeof dateAccessor === "function") {
    raw = dateAccessor(record);
  } else if (typeof dateAccessor === "string") {
    raw = record[dateAccessor];
  } else {
    raw =
      record.date_of_usage ||
      record.borrow_date ||
      record.date ||
      record.created_at ||
      record.purchased_at ||
      record.start_date;
  }

  if (!raw) return false;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return false;

  if (bounds.start && d < bounds.start) return false;
  if (bounds.end && d > bounds.end) return false;
  return true;
}

/**
 * Filter an array of records by date bounds
 */
export function filterRecordsByBounds(records = [], bounds, dateAccessor) {
  if (!Array.isArray(records)) return [];
  if (!bounds.start && !bounds.end) return records;
  return records.filter((r) => matchesDateBounds(r, bounds, dateAccessor));
}

/**
 * Premium 2-Column Institutional Export Modal
 * Adapts to both Light (Default) and Dark themes seamlessly while matching Reference Image.
 */
export default function ExportModal({
  isOpen,
  onClose,
  title = "Export Equipment Inventory",
  subtitle = "Choose a timeframe and file format to export physical equipment units.",
  formats = ["xlsx", "csv"], // 'xlsx' | 'csv' | 'pdf'
  defaultFormat = "xlsx",
  scopeOptions = null, // e.g. [{ id: 'all', label: 'Master Workbook' }, { id: 'active', label: 'Active Tab' }]
  defaultScope = "all",
  activeTabLabel = "",
  records = null, // array or object of arrays to calculate live preview counts
  recordsByScope = null, // optional { [scopeId]: records } — overrides `records` based on selected scope
  dateAccessor = null,
  onExport,
  isExporting = false,
}) {
  const [timeframe, setTimeframe] = useState("all"); // 'all' | 'today' | 'month' | 'year' | 'custom'
  const [format, setFormat] = useState(defaultFormat);
  const [scope, setScope] = useState(defaultScope);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Dynamic formatted labels
  const now = new Date();
  const monthName = now.toLocaleString("default", { month: "long" });
  const currentYear = now.getFullYear();
  const todayFormatted = now.toLocaleDateString("default", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Timeframe presets matching Reference Image
  const timePresetsRow1 = [
    {
      id: "all",
      label: "All Records",
      description: "Entire archive, no date filter",
      icon: Clock,
    },
    {
      id: "today",
      label: "Today",
      description: todayFormatted,
      icon: Calendar,
    },
    {
      id: "month",
      label: "This Month",
      description: `${monthName} ${currentYear}`,
      icon: Calendar,
    },
  ];

  const timePresetsRow2 = [
    {
      id: "year",
      label: "This Year",
      description: `Academic year ${currentYear}`,
      icon: Calendar,
    },
    {
      id: "custom",
      label: "Custom Range",
      description: "Pick your own start and end dates",
      icon: Filter,
    },
  ];

  // Active date bounds
  const activeBounds = useMemo(() => {
    return getPresetDateBounds(timeframe, customStart, customEnd);
  }, [timeframe, customStart, customEnd]);

  // Live match record count
  const matchCount = useMemo(() => {
    const source = recordsByScope && recordsByScope[scope] !== undefined ? recordsByScope[scope] : records;
    if (!source) return 0;

    if (Array.isArray(source)) {
      return filterRecordsByBounds(source, activeBounds, dateAccessor).length;
    }

    if (typeof source === "object") {
      let count = 0;
      Object.values(source).forEach((dataset) => {
        if (Array.isArray(dataset)) {
          count += filterRecordsByBounds(dataset, activeBounds, dateAccessor).length;
        }
      });
      return count;
    }

    return 0;
  }, [records, recordsByScope, scope, activeBounds, dateAccessor]);

  if (!isOpen) return null;

  // Format display labels
  const formatLabels = {
    xlsx: "Excel (.xlsx)",
    csv: "CSV (.csv)",
    pdf: "PDF (.pdf)",
  };

  const formatButtonLabels = {
    xlsx: "Excel",
    csv: "CSV",
    pdf: "PDF",
  };

  // Timeframe display labels
  const timeframeLabels = {
    all: "All time",
    today: "Today",
    month: "This month",
    year: "This year",
    custom: customStart && customEnd ? `${customStart} to ${customEnd}` : "Custom range",
  };

  const handleExportClick = () => {
    if (!onExport) return;
    onExport({
      timeframe,
      format,
      scope,
      bounds: activeBounds,
      customStart,
      customEnd,
      matchCount,
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/50 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity"
        onClick={!isExporting ? onClose : undefined}
      />

      {/* Modal Dialog Card */}
      <div className="relative bg-white dark:bg-[#0c1322] text-slate-800 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800/90 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/80 dark:bg-[#0e1726]/70">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-[#142138] text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0 shadow-2xs">
              <Download size={19} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>

          {!isExporting && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#142138]/60 hover:bg-slate-200 dark:hover:bg-[#1b2b48] text-slate-400 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Modal Body: 2-Column Layout */}
        <div className="p-6 overflow-y-auto max-h-[calc(92vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* ── LEFT COLUMN: 1. SELECT TIMEFRAME (Col-span 7) ── */}
            <div className="lg:col-span-7 space-y-3.5">

              {/* Section 1 Header */}
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-[10px] font-bold">
                  1
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Select Timeframe
                </span>
              </div>

              {/* Row 1: 3 Presets (All Records, Today, This Month) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {timePresetsRow1.map((preset) => {
                  const isSelected = timeframe === preset.id;
                  const Icon = preset.icon;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setTimeframe(preset.id)}
                      className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[92px] ${isSelected
                          ? "bg-blue-50/80 dark:bg-[#13223f] border-2 border-blue-600 dark:border-blue-500 text-blue-950 dark:text-white shadow-md shadow-blue-500/10 dark:shadow-blue-950/40 ring-2 ring-blue-500/20"
                          : "bg-slate-50/70 dark:bg-[#111c30]/90 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-[#142138]"
                        }`}
                    >
                      <div className="mb-2">
                        <Icon
                          size={16}
                          className={isSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}
                        />
                      </div>
                      <div>
                        <span className="text-xs font-bold block leading-tight text-slate-900 dark:text-white">
                          {preset.label}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-1">
                          {preset.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Row 2: 2 Presets (This Year, Custom Range) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {timePresetsRow2.map((preset) => {
                  const isSelected = timeframe === preset.id;
                  const Icon = preset.icon;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setTimeframe(preset.id)}
                      className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[92px] ${isSelected
                          ? "bg-blue-50/80 dark:bg-[#13223f] border-2 border-blue-600 dark:border-blue-500 text-blue-950 dark:text-white shadow-md shadow-blue-500/10 dark:shadow-blue-950/40 ring-2 ring-blue-500/20"
                          : "bg-slate-50/70 dark:bg-[#111c30]/90 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-[#142138]"
                        }`}
                    >
                      <div className="mb-2">
                        <Icon
                          size={16}
                          className={isSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}
                        />
                      </div>
                      <div>
                        <span className="text-xs font-bold block leading-tight text-slate-900 dark:text-white">
                          {preset.label}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-1">
                          {preset.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Row 3: Custom Date Range Inputs Box */}
              <div
                className={`p-4 rounded-2xl border transition-all ${timeframe === "custom"
                    ? "bg-blue-50/30 dark:bg-[#0e1726] border-blue-200 dark:border-blue-900/50 ring-1 ring-blue-500/20 dark:ring-blue-500/30"
                    : "bg-slate-50/60 dark:bg-[#0e1726]/60 border-slate-200 dark:border-slate-800/80 opacity-90"
                  }`}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                      From
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => {
                        setCustomStart(e.target.value);
                        if (timeframe !== "custom") setTimeframe("custom");
                      }}
                      onFocus={() => {
                        if (timeframe !== "custom") setTimeframe("custom");
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-[#111c30] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 shadow-2xs transition-colors"
                      placeholder="mm/dd/yyyy"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                      To
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => {
                        setCustomEnd(e.target.value);
                        if (timeframe !== "custom") setTimeframe("custom");
                      }}
                      onFocus={() => {
                        if (timeframe !== "custom") setTimeframe("custom");
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-[#111c30] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 shadow-2xs transition-colors"
                      placeholder="mm/dd/yyyy"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5">
                  Dates are enabled when you choose Custom Range.
                </p>
              </div>

            </div>

            {/* ── RIGHT COLUMN: 2. SELECT FORMAT & SUMMARY (Col-span 5) ── */}
            <div className="lg:col-span-5 space-y-4">

              {/* Section 2 Header */}
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-[10px] font-bold">
                  2
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Select Format
                </span>
              </div>

              {/* Formats Stack */}
              <div className="space-y-2.5">

                {/* Excel Option */}
                {formats.includes("xlsx") && (
                  <button
                    type="button"
                    onClick={() => setFormat("xlsx")}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${format === "xlsx"
                        ? "bg-emerald-50/70 dark:bg-[#0f2320]/80 border-2 border-emerald-600 dark:border-emerald-500/90 text-emerald-950 dark:text-white shadow-md shadow-emerald-500/10 dark:shadow-emerald-950/30"
                        : "bg-slate-50/70 dark:bg-[#111c30]/90 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-[#142138]"
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${format === "xlsx"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-emerald-50 dark:bg-[#17253d] text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"
                          }`}
                      >
                        <FileSpreadsheet size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Excel Workbook
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/40 px-1.5 py-0.2 rounded">
                            .xlsx
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          Formatted, multi-column sheet
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${format === "xlsx"
                          ? "bg-emerald-600 text-white"
                          : "border-2 border-slate-300 dark:border-slate-700"
                        }`}
                    >
                      {format === "xlsx" && <Check size={12} strokeWidth={3} />}
                    </div>
                  </button>
                )}

                {/* CSV Option */}
                {formats.includes("csv") && (
                  <button
                    type="button"
                    onClick={() => setFormat("csv")}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${format === "csv"
                        ? "bg-emerald-50/70 dark:bg-[#0f2320]/80 border-2 border-emerald-600 dark:border-emerald-500/90 text-emerald-950 dark:text-white shadow-md shadow-emerald-500/10 dark:shadow-emerald-950/30"
                        : "bg-slate-50/70 dark:bg-[#111c30]/90 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-[#142138]"
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${format === "csv"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-blue-50 dark:bg-[#17253d] text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30"
                          }`}
                      >
                        <Code2 size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            CSV File
                          </span>
                          <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/40 px-1.5 py-0.2 rounded">
                            .csv
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          Raw comma-separated table
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${format === "csv"
                          ? "bg-emerald-600 text-white"
                          : "border-2 border-slate-300 dark:border-slate-700"
                        }`}
                    >
                      {format === "csv" && <Check size={12} strokeWidth={3} />}
                    </div>
                  </button>
                )}

                {/* PDF Option */}
                {formats.includes("pdf") && (
                  <button
                    type="button"
                    onClick={() => setFormat("pdf")}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${format === "pdf"
                        ? "bg-emerald-50/70 dark:bg-[#0f2320]/80 border-2 border-emerald-600 dark:border-emerald-500/90 text-emerald-950 dark:text-white shadow-md shadow-emerald-500/10 dark:shadow-emerald-950/30"
                        : "bg-slate-50/70 dark:bg-[#111c30]/90 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-[#142138]"
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${format === "pdf"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-rose-50 dark:bg-[#17253d] text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30"
                          }`}
                      >
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            PDF Document
                          </span>
                          <span className="text-[10px] font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/40 px-1.5 py-0.2 rounded">
                            .pdf
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          Official printable report
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${format === "pdf"
                          ? "bg-emerald-600 text-white"
                          : "border-2 border-slate-300 dark:border-slate-700"
                        }`}
                    >
                      {format === "pdf" && <Check size={12} strokeWidth={3} />}
                    </div>
                  </button>
                )}

              </div>

              {/* Scope Selector (If applicable, e.g. for Multi-Tab Reports) */}
              {scopeOptions && scopeOptions.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-[#0e1726]/80 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <Layers size={13} className="text-indigo-500 dark:text-indigo-400" />
                    <span>Report Scope</span>
                  </div>
                  <div className={scopeOptions.length > 2 ? "grid grid-cols-1 gap-1.5" : "grid grid-cols-2 gap-2"}>
                    {scopeOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setScope(opt.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border text-left transition-colors cursor-pointer truncate ${scope === opt.id
                            ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200"
                            : "bg-white dark:bg-[#111c30] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                          }`}
                        title={opt.label}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── EXPORT SUMMARY CARD (Matches Image 1) ── */}
              <div className="bg-slate-50/90 dark:bg-[#0e1726]/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5">
                <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 block">
                  Export Summary
                </span>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono tracking-tight">
                    {matchCount}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    records ready
                  </span>
                </div>

                <div className="space-y-2 border-t border-slate-200 dark:border-slate-800/80 pt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Timeframe</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {timeframeLabels[timeframe] || "All time"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Format</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {formatLabels[format] || "Excel (.xlsx)"}
                    </span>
                  </div>
                  {scopeOptions && scopeOptions.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Scope</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[170px] text-right">
                        {scopeOptions.find((s) => s.id === scope)?.label || "Master Report"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Modal Footer Toolbar (Matches Image 1) */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#0e1726]/70 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isExporting}
            onClick={onClose}
            className="px-5 py-2.5 bg-white dark:bg-[#111c30] hover:bg-slate-100 dark:hover:bg-[#17253d] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportClick}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 dark:shadow-emerald-950/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Generating Export...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>
                  Export {matchCount} records as {formatButtonLabels[format] || "Excel"}
                </span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
