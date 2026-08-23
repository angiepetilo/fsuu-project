import React, { useRef, useState } from "react";
import { Camera, UploadCloud, Trash2, ZoomIn, Plus } from "lucide-react";
import { resolveStorageUrl } from "@/lib/utils";

/**
 * InspectionPhotoUploader
 * Reusable, responsive multi-photo uploader & gallery for Pre/Post-Event and Equipment Inspections.
 */
export default function InspectionPhotoUploader({
  photos = [],
  setPhotos,
  isReadOnly = false,
  onPreview = null,
  title = "Inspection Evidence & Condition Photos",
  subtitle = "Attach photos of room setup, facility state, damages, or equipment barcodes (optional, multiple allowed).",
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Normalize photos into standard array of string URLs / Base64
  const normalizedPhotos = Array.isArray(photos)
    ? photos.filter(Boolean)
    : (photos ? [photos] : []);

  const handleFilesSelected = (files) => {
    if (!files || files.length === 0 || !setPhotos) return;

    const newPhotoPromises = Array.from(files).map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target.result);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newPhotoPromises).then((base64List) => {
      setPhotos([...normalizedPhotos, ...base64List]);
    });
  };

  const handleInputChange = (e) => {
    handleFilesSelected(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (isReadOnly) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isReadOnly) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemovePhoto = (indexToRemove) => {
    if (isReadOnly || !setPhotos) return;
    const updated = normalizedPhotos.filter((_, idx) => idx !== indexToRemove);
    setPhotos(updated);
  };

  const handlePhotoClick = (photoUrl) => {
    const resolved = resolveStorageUrl(photoUrl) || photoUrl;
    if (onPreview) {
      onPreview(resolved);
    } else {
      window.open(resolved, "_blank");
    }
  };

  return (
    <div className="space-y-2 pt-1">
      {/* Header & Photo Count Badge */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase">
          <Camera size={13} className="text-slate-500" />
          <span>{title}</span>
          {normalizedPhotos.length > 0 && (
            <span className="ml-1 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {normalizedPhotos.length} {normalizedPhotos.length === 1 ? "Photo" : "Photos"}
            </span>
          )}
        </label>
        {!isReadOnly && normalizedPhotos.length > 0 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus size={11} /> Add More
          </button>
        )}
      </div>

      {/* Subtitle / Instructions */}
      {!isReadOnly && normalizedPhotos.length === 0 && (
        <p className="text-[10.5px] text-slate-500">{subtitle}</p>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png, image/jpeg, image/jpg, image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Photos Thumbnail Gallery */}
      {normalizedPhotos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
          {normalizedPhotos.map((photo, index) => {
            const displayUrl = resolveStorageUrl(photo) || photo;
            return (
              <div
                key={`insp-img-${index}`}
                className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-900 shadow-2xs"
              >
                <img
                  src={displayUrl}
                  alt={`Inspection evidence ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                  <button
                    type="button"
                    title="View full photo"
                    onClick={() => handlePhotoClick(photo)}
                    className="p-1 rounded-md bg-white/90 text-slate-900 hover:bg-white hover:scale-110 transition-all cursor-pointer shadow-xs"
                  >
                    <ZoomIn size={12} />
                  </button>
                  {!isReadOnly && (
                    <button
                      type="button"
                      title="Remove photo"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePhoto(index);
                      }}
                      className="p-1 rounded-md bg-rose-600/90 text-white hover:bg-rose-600 hover:scale-110 transition-all cursor-pointer shadow-xs"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                {/* Index badge */}
                <span className="absolute bottom-1 left-1 text-[9px] font-mono font-bold bg-black/60 text-white px-1 rounded">
                  #{index + 1}
                </span>
              </div>
            );
          })}

          {/* Add more button tile inside the grid */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 transition-all cursor-pointer group"
            >
              <Plus size={18} className="group-hover:scale-110 transition-transform text-slate-400 group-hover:text-slate-600" />
              <span className="text-[9.5px] font-bold mt-1">Add</span>
            </button>
          )}
        </div>
      )}

      {/* Empty State / Drag & Drop Upload Zone */}
      {!isReadOnly && normalizedPhotos.length === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
            isDragging
              ? "border-blue-500 bg-blue-50/50"
              : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
          }`}
        >
          <div className="p-2 rounded-full bg-white border border-slate-200 text-slate-500 shadow-2xs">
            <UploadCloud size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">
              Click or drag photos here to upload
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              PNG, JPG, WEBP • Select as many photos as needed
            </p>
          </div>
        </div>
      )}

      {/* Read-Only Empty Notice */}
      {isReadOnly && normalizedPhotos.length === 0 && (
        <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-center">
          <p className="text-[11px] text-slate-400 font-medium">No inspection photos attached</p>
        </div>
      )}
    </div>
  );
}
