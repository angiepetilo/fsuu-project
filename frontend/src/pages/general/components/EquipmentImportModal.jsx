import { useState, useRef } from "react";
import { 
  X, 
  UploadCloud, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  Info,
  Layers,
  ArrowRight,
  Tag
} from "lucide-react";
import api from "@/lib/axios";

export default function EquipmentImportModal({
  isOpen,
  onClose,
  onImportSuccess,
}) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [autoCreateCategory, setAutoCreateCategory] = useState(true);
  const [duplicateAction, setDuplicateAction] = useState("skip");
  
  const [previewRows, setPreviewRows] = useState([]);
  const [totalRowsCount, setTotalRowsCount] = useState(0);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Simple CSV parser for client-side live preview
  const parseCsvPreview = (text) => {
    try {
      const lines = text.split(/\r\n|\n/).filter(l => l.trim() !== "");
      if (lines.length === 0) return;

      const parseLine = (line) => {
        const result = [];
        let cur = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"' && (i === 0 || line[i - 1] !== '\\')) {
            inQuotes = !inQuotes;
          } else if (c === ',' && !inQuotes) {
            result.push(cur.trim().replace(/^"|"$/g, ''));
            cur = "";
          } else {
            cur += c;
          }
        }
        result.push(cur.trim().replace(/^"|"$/g, ''));
        return result;
      };

      const headers = parseLine(lines[0]);
      setPreviewHeaders(headers);

      const rows = [];
      const sampleCount = Math.min(lines.length, 6);
      for (let i = 1; i < sampleCount; i++) {
        const cols = parseLine(lines[i]);
        if (cols.some(c => c !== "")) {
          rows.push(cols);
        }
      }

      setPreviewRows(rows);
      setTotalRowsCount(lines.length - 1);
    } catch (err) {
      console.error("Preview parsing failed", err);
    }
  };

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".csv") && selectedFile.type !== "text/csv") {
      setErrorMsg("Please select a valid CSV (.csv) file.");
      return;
    }

    setErrorMsg("");
    setImportResult(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      parseCsvPreview(e.target?.result || "");
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get("/general/equipment-units/import-template", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "equipment_units_import_template.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // Client-side fallback if network or route error
      const csvContent = "Category,Brand,Model,Barcode,Date Purchased,Lifespan (Years),Condition,Status,Description\n" +
        "Projector,Epson,PowerLite 1780W,PRJ-EPS-001,2025-06-15,5,Good,available,AVR Storage Cabinet 1\n" +
        "Projector,Epson,PowerLite 1780W,PRJ-EPS-002,2025-06-15,5,Good,available,AVR Storage Cabinet 1\n" +
        "Sound System,Yamaha,StagePas 400BT,SND-YAM-001,2025-08-20,5,Good,available,Audio Rack System A\n" +
        "Camera,Sony,Alpha A7 IV,CAM-SNY-001,2026-01-10,4,Good,available,Media Production Bag #1\n" +
        "Microphone,Shure,SM58 Wireless,MIC-SHU-001,2025-11-05,3,Good,available,Wireless Mic Set Alpha\n";

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "equipment_units_import_template.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg("Please choose a CSV file to upload.");
      return;
    }

    setIsUploading(true);
    setErrorMsg("");
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("auto_create_category", autoCreateCategory ? "1" : "0");
      formData.append("duplicate_action", duplicateAction);

      const res = await api.post("/general/equipment-units/import-csv", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setImportResult(res.data);
      if (onImportSuccess) {
        onImportSuccess(res.data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to process the CSV import.";
      setErrorMsg(msg);
      if (err.response?.data?.skipped_details) {
        setImportResult(err.response.data);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewRows([]);
    setPreviewHeaders([]);
    setTotalRowsCount(0);
    setImportResult(null);
    setErrorMsg("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/70 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Bulk Import Physical Units
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Import dozens or hundreds of equipment units under their categories at once
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* Result view when import finishes */}
          {importResult && importResult.success ? (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-4">
                <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                    Import Completed Successfully!
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    {importResult.message}
                  </p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Imported</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{importResult.imported_count} units</span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Skipped</span>
                  <span className={`text-xl font-black ${importResult.skipped_count > 0 ? 'text-amber-600' : 'text-slate-600 dark:text-slate-400'}`}>
                    {importResult.skipped_count} units
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">New Categories</span>
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                    {importResult.categories_created?.length || 0}
                  </span>
                </div>
              </div>

              {/* New categories created tag list */}
              {importResult.categories_created?.length > 0 && (
                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl space-y-1.5">
                  <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <Layers size={13} />
                    Auto-Created Categories:
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {importResult.categories_created.map((cat, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 rounded-full text-xs font-extrabold shadow-2xs">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* New brands created tag list */}
              {importResult.brands_created?.length > 0 && (
                <div className="p-3 bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 rounded-xl space-y-1.5">
                  <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <Tag size={13} />
                    Auto-Registered New Brands:
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {importResult.brands_created.map((bName, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-300 rounded-full text-xs font-extrabold shadow-2xs">
                        {bName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped Details */}
              {importResult.skipped_details?.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-500" />
                    Skipped Items Details ({importResult.skipped_details.length}):
                  </h5>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {importResult.skipped_details.map((skip, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40">
                        <span className="font-mono text-[11px] text-slate-500">Row {skip.row} (Barcode: {skip.barcode})</span>
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{skip.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw size={13} />
                  Import Another File
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Upload & Preview Form */
            <form onSubmit={handleImportSubmit} className="space-y-6">

              {/* Step 1: Template Download Banner */}
              <div className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-900 dark:text-blue-200">
                    <Info size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Step 1: Download Standard Template</span>
                  </div>
                  <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed max-w-md">
                    Pre-filled with correct column headers (Category, Brand, Model, Barcode, Date Purchased, Lifespan, Condition).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-blue-300 dark:border-blue-800 rounded-xl text-xs font-extrabold text-blue-700 dark:text-blue-300 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Download size={14} />
                  <span>Download .CSV</span>
                </button>
              </div>

              {/* Step 2: File Upload Box */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-2">
                  Step 2: Upload Your Inventory CSV File
                </label>
                
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 scale-[1.01]"
                      : file
                      ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/20 dark:bg-emerald-950/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/60"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0])}
                  />

                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                        <FileSpreadsheet size={24} />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate max-w-sm">{file.name}</p>
                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {(file.size / 1024).toFixed(1)} KB • {totalRowsCount} rows detected
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReset();
                        }}
                        className="mt-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                      >
                        Remove and choose another file
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <UploadCloud size={24} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Click to select a CSV file or drag & drop here
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Supports UTF-8 CSV exports from Excel, Google Sheets, or LibreOffice (Max: 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Live Preview Table */}
              {previewRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Preview of Uploaded Data (First {previewRows.length} of {totalRowsCount} rows):
                    </span>
                    <span className="text-[10.5px] font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                      {totalRowsCount} total units to import
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0">
                          <th className="px-3 py-2">#</th>
                          {previewHeaders.map((h, i) => (
                            <th key={i} className="px-3 py-2 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                        {previewRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-1.5 text-slate-400 font-mono">{rIdx + 1}</td>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap max-w-[150px] truncate" title={cell}>
                                {cell || <span className="text-slate-400 italic">auto-generated</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Step 4: Import Options */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3 text-xs">
                <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block">
                  Import Configuration:
                </span>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCreateCategory}
                    onChange={(e) => setAutoCreateCategory(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Auto-create missing Equipment Categories
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      If a category in the CSV is not found in your catalog, create it automatically on the fly.
                    </span>
                  </div>
                </label>

                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Existing Barcode Conflict:
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="dup_action"
                        value="skip"
                        checked={duplicateAction === "skip"}
                        onChange={() => setDuplicateAction("skip")}
                        className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                        Skip and report (Recommended)
                      </span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="dup_action"
                        value="error"
                        checked={duplicateAction === "error"}
                        onChange={() => setDuplicateAction("error")}
                        className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                        Fail whole batch
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2 text-xs font-bold text-rose-800 dark:text-rose-300 animate-in fade-in">
                  <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!file || isUploading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Processing Batch Import...</span>
                    </>
                  ) : (
                    <>
                      <span>Import {totalRowsCount > 0 ? `${totalRowsCount} Units` : "Units"}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
