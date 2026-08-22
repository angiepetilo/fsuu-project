import { useState, useEffect } from "react";
import { X, ExternalLink, ZoomIn, ZoomOut, RotateCw, FileText, Download, Maximize2, Minimize2, Image as ImageIcon } from "lucide-react";

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName = "Document Preview",
  fileType = null
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    // Reset state on new modal open
    setZoom(1);
    setRotation(0);
    setIsFullscreen(false);
    setImgError(false);
  }, [fileUrl, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !fileUrl) return null;

  // Determine file type (PDF vs Image)
  const isPdf =
    fileType === "pdf" ||
    fileUrl.toLowerCase().includes(".pdf") ||
    fileUrl.startsWith("data:application/pdf") ||
    fileUrl.startsWith("blob:") && fileType === "pdf";

  const isImage =
    !isPdf &&
    (fileType === "image" ||
      fileUrl.match(/\.(jpeg|jpg|png|webp|gif|svg)($|\?)/i) ||
      fileUrl.startsWith("data:image/") ||
      fileUrl.startsWith("blob:"));

  const getCleanBlobUrl = () => {
    if (fileUrl.startsWith("data:")) {
      try {
        const parts = fileUrl.split(",");
        const mime = parts[0].match(/:(.*?);/)?.[1] || (isPdf ? "application/pdf" : "image/jpeg");
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        return URL.createObjectURL(blob);
      } catch {
        return fileUrl;
      }
    }
    return fileUrl;
  };

  const handleOpenInNewTab = () => {
    const url = getCleanBlobUrl();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = getCleanBlobUrl();
    link.download = fileName || (isPdf ? "document.pdf" : "document.png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[3500] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div
        className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 transition-all ${
          isFullscreen ? "w-screen h-screen rounded-none" : "w-full max-w-5xl h-[88vh]"
        }`}
      >
        {/* Top Header & Toolbar */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="p-1.5 rounded-lg bg-blue-100/80 text-blue-700 shrink-0">
              {isPdf ? <FileText size={18} /> : <ImageIcon size={18} />}
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">{fileName}</h3>
              <p className="text-[10px] font-mono text-slate-500 font-semibold uppercase tracking-wider">
                {isPdf ? "PDF Document" : isImage ? "Image Scan" : "Document File"} • Live In-App Preview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Image Zoom & Rotate Controls */}
            {isImage && !imgError && (
              <div className="flex items-center gap-1 bg-white border border-slate-200/90 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(1))))}
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="text-[10px] font-mono font-bold px-1 text-slate-700 min-w-[36px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, Number((z + 0.2).toFixed(1))))}
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  title="Rotate 90°"
                >
                  <RotateCw size={14} />
                </button>
              </div>
            )}

            {/* Open in full tab */}
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Open document in a separate browser tab"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">New Tab</span>
            </button>

            {/* Optional Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Download local copy"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Toggle Fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullscreen((f) => !f)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Close Preview (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-900 overflow-auto flex items-center justify-center p-2 sm:p-4 relative">
          {isPdf ? (
            /* Native Browser Embedded PDF Viewer */
            <iframe
              src={`${getCleanBlobUrl()}#toolbar=1&navpanes=0&view=FitH`}
              title={fileName}
              className="w-full h-full rounded-lg bg-white border-0 shadow-lg"
            />
          ) : isImage && !imgError ? (
            /* Interactive Image Previewer with Zoom & Pan */
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
              <img
                src={fileUrl}
                alt={fileName}
                onError={() => setImgError(true)}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: "transform 0.15s ease-out",
                }}
                className="max-h-full max-w-full object-contain select-none shadow-2xl rounded-lg bg-slate-950"
              />
            </div>
          ) : (
            /* Fallback Card */
            <div className="text-center text-white space-y-3 p-6 max-w-md bg-slate-800/80 rounded-2xl border border-slate-700">
              <FileText size={36} className="mx-auto text-slate-400" />
              <div>
                <h4 className="text-sm font-extrabold text-white">Direct Preview Not Renderable</h4>
                <p className="text-xs text-slate-300 mt-1">
                  This document format or secure file path can be viewed directly in your browser viewport.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Open in Full Browser Tab
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
