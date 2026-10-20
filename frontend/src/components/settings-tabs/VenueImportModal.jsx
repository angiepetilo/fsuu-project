import { useState, useRef } from "react";
import {
  X,
  Upload,
  Building,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  FileText,
} from "lucide-react";
import { parseFileToObjects } from "@/lib/excelExportImport";
import { downloadVenueTemplate } from "@/pages/general/venueExportHelper";
import api from "@/lib/axios";
import notify from "@/lib/notify";

export default function VenueImportModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [parsedVenues, setParsedVenues] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setParsedVenues([]);
    setParseError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await processFile(selectedFile);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    await processFile(droppedFile);
  };

  const processFile = async (selectedFile) => {
    setFile(selectedFile);
    setParsing(true);
    setParseError("");
    setParsedVenues([]);

    try {
      const rawRows = await parseFileToObjects(selectedFile);
      if (!rawRows || rawRows.length === 0) {
        setParseError("No valid rows found in the selected file. Please ensure data starts from row 2.");
        setParsing(false);
        return;
      }

      // Normalize row field keys to match backend expectations
      const normalized = rawRows
        .map((row) => {
          const findVal = (...keys) => {
            for (const k of keys) {
              for (const [rk, rv] of Object.entries(row)) {
                if (rk.toLowerCase().replace(/[^a-z0-9]/g, "") === k.toLowerCase().replace(/[^a-z0-9]/g, "")) {
                  return rv;
                }
              }
            }
            return "";
          };

          const name = findVal(
            "venuename",
            "name",
            "venue",
            "facilityname",
            "facility",
            "facilityvenuename",
            "roomname",
            "room",
            "title",
            "venuetitle"
          ) || "";
          const cap = parseInt(
            findVal("capacity", "maxcapacity", "maximumcapacity", "maxcap", "seats", "seatcapacity", "totalcapacity") || "100",
            10
          ) || 100;
          const minCap = parseInt(
            findVal("mincapacity", "minimumcapacity", "mincap", "min") || "1",
            10
          ) || 1;
          const maxCap = parseInt(
            findVal("maxcapacity", "maximumcapacity", "maxcap", "max") || String(cap),
            10
          ) || cap;

          return {
            name: name.trim(),
            location: findVal("location", "address", "room", "building", "floor", "place", "area", "site") || "",
            capacity: cap,
            min_capacity: minCap,
            max_capacity: maxCap,
            status: findVal("status", "state", "condition", "availability") || "available",
            description: findVal("description", "notes", "remarks", "details", "desc", "about") || "",
          };
        })
        .filter((v) => v.name !== ""); // Exclude empty name rows

      if (normalized.length === 0) {
        setParseError("None of the rows contain a valid 'Venue Name'. Please check your spreadsheet headers.");
        setParsing(false);
        return;
      }

      setParsedVenues(normalized);
    } catch (err) {
      console.error("Venue file parse error:", err);
      setParseError(err?.message || "Failed to parse file. Please use the official template.");
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (parsedVenues.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await api.post("/general/venues/bulk-import", {
        venues: parsedVenues,
      });

      notify.success(res.data?.message || `Successfully processed ${parsedVenues.length} venue facilities.`);
      handleReset();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Venue import error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to import venues.";
      notify.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center">
              <Building size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Batch Import Venue Facilities
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Upload Excel or CSV file to register and configure venues in bulk.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Step 1: Download Templates */}
          <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/50 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                Step 1: Download sample format
              </span>
              <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400 font-medium">
                Use our pre-formatted spreadsheet template to structure your venue data.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => downloadVenueTemplate("xlsx")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Download size={14} />
                <span>Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => downloadVenueTemplate("csv")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>CSV (.csv)</span>
              </button>
            </div>
          </div>

          {/* Step 2: Upload File Area */}
          <div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Step 2: Select or drop your completed spreadsheet
            </span>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            {!file ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/30 transition-all text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100/70 dark:bg-indigo-900/50 text-indigo-600 flex items-center justify-center">
                  <Upload size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Click to browse or drag and drop your file here
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB • {parsedVenues.length} venue(s) detected
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Parsing State */}
          {parsing && (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500 font-medium">
              <Loader2 size={18} className="animate-spin text-indigo-600" />
              <span>Analyzing spreadsheet contents...</span>
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-rose-800 text-xs flex items-center gap-2.5">
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Step 3: Preview Table */}
          {parsedVenues.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Preview ({parsedVenues.length} venue{parsedVenues.length > 1 ? "s" : ""})
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Showing first {Math.min(5, parsedVenues.length)} rows
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Venue Name</th>
                      <th className="py-2 px-3">Location</th>
                      <th className="py-2 px-3">Capacity</th>
                      <th className="py-2 px-3">Min / Max</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {parsedVenues.slice(0, 5).map((v, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{i + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                          {v.name}
                        </td>
                        <td className="py-2 px-3">{v.location || "—"}</td>
                        <td className="py-2 px-3 font-mono">{v.capacity} pax</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                          {v.min_capacity} - {v.max_capacity}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={parsedVenues.length === 0 || isSubmitting}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>
                  Import {parsedVenues.length > 0 ? `${parsedVenues.length} Venue${parsedVenues.length > 1 ? "s" : ""}` : "Venues"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
