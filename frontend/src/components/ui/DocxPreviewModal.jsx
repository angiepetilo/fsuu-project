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
  const [defaultZoom, setDefaultZoom] = useState(1);
  const [renderedDimensions, setRenderedDimensions] = useState(null);

  const containerRef = useRef(null);
  const bodyContainerRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !fileUrl) {
      setLoading(false);
      setError(null);
      setZoom(1);
      setDefaultZoom(1);
      setRenderedDimensions(null);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError(null);
    setZoom(1);
    setDefaultZoom(1);
    setRenderedDimensions(null);

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

          // Wait a tick for styles to settle and dimensions to be measurable
          setTimeout(() => {
            if (isCancelled || !containerRef.current) return;

            const sections = containerRef.current.querySelectorAll("section.docx");
            const firstSection = sections[0];
            const docWidth = firstSection ? firstSection.offsetWidth : 816;
            const docHeight = containerRef.current.offsetHeight || (sections.length * 1056);

            setRenderedDimensions({ width: docWidth, height: docHeight });

            // Compute optimal fit zoom for container
            const availWidth = bodyContainerRef.current
              ? bodyContainerRef.current.clientWidth - (window.innerWidth < 640 ? 16 : 48)
              : window.innerWidth - 32;

            if (availWidth < docWidth) {
              const fit = Math.max(0.25, Math.min(1, Number((availWidth / docWidth).toFixed(2))));
              setZoom(fit);
              setDefaultZoom(fit);
            } else {
              setZoom(1);
              setDefaultZoom(1);
            }
          }, 60);
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

  // Handle window resize dynamically to auto-fit on mobile rotate or window resize
  useEffect(() => {
    if (!isOpen || !renderedDimensions) return;
    const handleResize = () => {
      if (!bodyContainerRef.current || !renderedDimensions.width) return;
      const availWidth = bodyContainerRef.current.clientWidth - (window.innerWidth < 640 ? 16 : 48);
      if (availWidth < renderedDimensions.width) {
        const fit = Math.max(0.25, Math.min(1, Number((availWidth / renderedDimensions.width).toFixed(2))));
        setDefaultZoom(fit);
        setZoom((prev) => (Math.abs(prev - defaultZoom) < 0.05 ? fit : prev));
      } else {
        setDefaultZoom(1);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, renderedDimensions, defaultZoom]);

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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 w-full max-w-5xl h-[94vh] sm:h-[90vh]">
        {/* Scoped CSS for DocxPreview to eliminate grey wrapper clutter and fix mobile layout */}
        <style>{`
          .docx-preview-container {
            background-color: transparent !important;
          }
          .docx-preview-container .docx-wrapper {
            background: transparent !important;
            padding: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
          }
          .docx-preview-container section.docx {
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.12), 0 2px 6px -1px rgba(0, 0, 0, 0.08) !important;
            margin-bottom: 24px !important;
            border-radius: 2px !important;
            box-sizing: border-box !important;
          }
          @media (max-width: 640px) {
            .docx-preview-container section.docx {
              margin-bottom: 12px !important;
            }
          }
        `}</style>

        {/* Modal Header */}
        <div className="px-3 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-1">
            <div className="p-1.5 sm:p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 shrink-0 shadow-2xs">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {title || fileName}
              </h3>
              <p className="text-[10px] sm:text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                <span className="font-bold text-blue-600 dark:text-blue-400 uppercase">.DOCX Format</span>
                <span>•</span>
                <span className="truncate">{fileName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Zoom Controls: accessible and responsive on all screen sizes */}
            {!loading && !error && (
              <div className="flex items-center gap-0.5 sm:gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 sm:p-1 shrink-0 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.25, Number((z - 0.1).toFixed(2))))}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="text-[10px] sm:text-[10.5px] font-mono font-bold px-1 text-slate-600 dark:text-slate-300 min-w-[34px] text-center select-none">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.1).toFixed(2))))}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(defaultZoom)}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Fit to Screen / Reset Zoom"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            )}

            {/* Direct Download Button */}
            {fileUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
                title="Download original template file"
              >
                <Download size={13} />
                <span className="hidden md:inline">Download Template</span>
                <span className="hidden sm:inline md:hidden">Download</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Close Preview (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div
          ref={bodyContainerRef}
          className="flex-1 bg-slate-100/90 dark:bg-slate-950/80 overflow-x-auto overflow-y-auto p-2 sm:p-6 flex flex-col w-full relative touch-pan-x touch-pan-y"
        >
          {loading && (
            <div className="my-auto flex flex-col items-center justify-center p-8 space-y-3 text-center">
              <Loader2 size={36} className="animate-spin text-blue-600" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Rendering Document Preview...
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
                  <span>Download Template</span>
                </button>
              )}
            </div>
          )}

          {/* Render container for docx-preview with auto-fit wrapper */}
          <div className={`m-auto flex flex-col items-center ${loading || error ? "hidden" : ""}`}>
            <div
              style={
                renderedDimensions
                  ? {
                      width: `${Math.round(renderedDimensions.width * zoom)}px`,
                      height: `${Math.round(renderedDimensions.height * zoom)}px`,
                      position: "relative",
                    }
                  : undefined
              }
              className="transition-all duration-150"
            >
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                  width: renderedDimensions ? `${renderedDimensions.width}px` : "auto",
                }}
              >
                <div
                  ref={containerRef}
                  className="docx-preview-container bg-white text-slate-900 shadow-xl rounded-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
