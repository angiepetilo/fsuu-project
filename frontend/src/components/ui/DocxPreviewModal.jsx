import { useState, useEffect, useRef } from "react";
import { X, Download, FileText, Loader2, AlertCircle, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { renderAsync } from "docx-preview";

export default function DocxPreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName = "Document Template.docx",
  title = "Requirement Template",
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !fileUrl) {
      setLoading(false);
      setError(null);
      setZoom(1);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError(null);
    setZoom(1);

    const loadDocx = async () => {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to download template file (HTTP ${response.status})`);
        }
        const blob = await response.blob();
        if (isCancelled) return;

        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          await renderAsync(blob, containerRef.current, null, {
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true,
            useBase64URL: true,
          });
        }
        if (!isCancelled) {
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("DOCX preview render error:", err);
          setError(err.message || "Unable to render DOCX preview.");
          setLoading(false);
        }
      }
    };

    loadDocx();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, fileUrl]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!fileUrl) return;
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName || "Document_Template.docx";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-[3500] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 w-full max-w-5xl h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 shrink-0 shadow-2xs">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                {title || fileName}
              </h3>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                <span className="font-bold text-blue-600 dark:text-blue-400 uppercase">.DOCX Format</span>
                <span>•</span>
                <span className="truncate">{fileName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            {!loading && !error && (
              <div className="hidden sm:flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 mr-1">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="text-[10.5px] font-mono font-bold px-1.5 text-slate-600 dark:text-slate-300">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            )}

            {/* Direct Download Button */}
            {fileUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="Download original DOCX template"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Download</span>
                <span className="font-mono text-[10.5px] opacity-80 sm:hidden">DOCX</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Preview (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div className="flex-1 bg-slate-100/90 dark:bg-slate-950/80 overflow-y-auto p-4 sm:p-6 flex flex-col items-center">
          {loading && (
            <div className="my-auto flex flex-col items-center justify-center p-8 space-y-3 text-center">
              <Loader2 size={36} className="animate-spin text-blue-600" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Rendering DOCX Template Preview...
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm">
                Parsing university headers, formatting, tables, and document styles.
              </p>
            </div>
          )}

          {error && (
            <div className="my-auto flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md text-center space-y-3 shadow-xs">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl text-rose-600">
                <AlertCircle size={32} />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Unable to Preview Document In-Browser
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The document can still be downloaded and opened directly in Microsoft Word or Google Docs.
              </p>
              {fileUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download .DOCX File</span>
                </button>
              )}
            </div>
          )}

          {/* Render container for docx-preview */}
          <div
            className={`w-full flex justify-center transition-transform origin-top ${loading || error ? "hidden" : ""}`}
            style={{ transform: `scale(${zoom})` }}
          >
            <div
              ref={containerRef}
              className="docx-preview-container max-w-3xl w-full bg-white text-slate-900 shadow-lg rounded-sm overflow-hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
