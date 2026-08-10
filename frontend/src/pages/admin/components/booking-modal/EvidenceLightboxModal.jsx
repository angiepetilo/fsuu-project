import React from "react";
import { Camera, FileText, ExternalLink, X } from "lucide-react";

export default function EvidenceLightboxModal({
  fullImageModal,
  setFullImageModal,
  resolvePhotoUrl,
}) {
  const imageUrl = typeof fullImageModal === "object" ? fullImageModal?.url : fullImageModal;

  const isValidPhoto = (photo) => {
    if (!photo || photo === "#" || photo === "null" || photo === "undefined") return false;
    if (typeof photo === "string") {
      if (photo.startsWith("data:") && photo.length > 50) return true;
      if (photo.includes("iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB") || (photo.startsWith("data:image") && photo.length < 200)) return false;
    }
    return true;
  };

  if (!isValidPhoto(imageUrl)) return null;

  const imageTitle = typeof fullImageModal === "object" && fullImageModal?.title
    ? fullImageModal.title
    : (String(imageUrl || "").toLowerCase().includes("endorsement")
        ? "Official Endorsement Letter Document"
        : "Attached Evidence Document / Photo");

  const isEndorsement = imageTitle.toLowerCase().includes("endorsement");
  const isPdf = typeof fullImageModal === "object" && fullImageModal?.isPdf !== undefined
    ? fullImageModal.isPdf
    : (String(imageUrl || "").toLowerCase().includes(".pdf") || String(imageUrl || "").toLowerCase().includes("data:application/pdf"));

  const resolvedUrl = resolvePhotoUrl ? resolvePhotoUrl(imageUrl) : imageUrl;
  const fallbackImage = "https://images.unsplash.com/photo-1568667256549-094345857637?w=600&auto=format&fit=crop&q=60";

  // Helper to open Data URLs without triggering browser about:blank#blocked
  const handleOpenExternal = () => {
    if (!resolvedUrl) return;
    if (resolvedUrl.startsWith("data:")) {
      try {
        const parts = resolvedUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
      } catch {
        window.open(resolvedUrl, "_blank");
      }
    } else {
      window.open(resolvedUrl, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col w-full h-[85vh]">
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs font-extrabold text-white flex items-center gap-2">
            {isEndorsement ? (
              <FileText size={16} className={isPdf ? "text-red-400" : "text-blue-400"} />
            ) : (
              <Camera size={16} className="text-rose-400" />
            )}
            {imageTitle}
          </span>
          <div className="flex items-center gap-2">
            {resolvedUrl && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                Open External <ExternalLink size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setFullImageModal && setFullImageModal(null)}
              className="p-1.5 rounded-full bg-slate-800 text-slate-300 hover:bg-rose-600 hover:text-white cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-2 flex-1 overflow-hidden flex items-center justify-center bg-black/60">
          {isPdf ? (
            <iframe
              src={resolvedUrl}
              title={imageTitle}
              className="w-full h-full rounded-xl border-none bg-white"
            />
          ) : (
            <img
              src={resolvedUrl || fallbackImage}
              alt={imageTitle}
              className="max-w-full max-h-[75vh] object-contain rounded-xl"
              onError={(e) => {
                if (e.target.src !== fallbackImage) {
                  e.target.src = fallbackImage;
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
