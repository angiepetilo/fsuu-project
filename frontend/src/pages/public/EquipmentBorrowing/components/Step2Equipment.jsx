import { useState } from "react";
import { Sparkles, Check, PackageOpen, ChevronLeft, ChevronRight, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Step2Equipment({
  equipmentCategory, setEquipmentCategory,
  filteredCatalog,
  selectedItems, handleEquipmentToggle,
  itemQuantities = {}, handleQuantityChange,
  isScoSelected, isAvrSelected,
  handleEquipmentSubmit,
  onBack,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Catalog items derived directly from backend database/API
  const catalogList = filteredCatalog || [];

  const totalPages = Math.ceil(catalogList.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentGridItems = catalogList.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      
      {/* Category Filter Pills & Available Summary Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {[
            { id: "all", label: "All Catalog" },
            { id: "avr", label: "AVR Equipment" },
            { id: "sco", label: "SCO Media Assets" },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => { setEquipmentCategory(cat.id); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                equipmentCategory === cat.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Showing <strong className="text-slate-900">{startIndex + 1} - {Math.min(startIndex + itemsPerPage, catalogList.length)}</strong> of <strong className="text-slate-900">{catalogList.length}</strong> equipment items
        </div>
      </div>

      {/* 6-Card Grid (2 rows x 3 cols) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-8">
        {currentGridItems.map((item) => {
          const isChecked = selectedItems.includes(item.id);
          const isSco = item.dept === "sco";
          const isDamagedOrLostOrMaintenance = item.status === "maintenance" || item.status === "damaged" || item.status === "lost";
          const isAvailable = !isDamagedOrLostOrMaintenance && item.is_available !== false && (item.available_count === undefined || item.available_count > 0);
          const availableCount = item.available_count ?? 3;
          const nextTime = item.next_available_at || "Tomorrow at 3:00 PM";
          const IconComp = isSco ? Sparkles : PackageOpen;
          const selectedQty = itemQuantities[item.id] || 1;
          const remainingCount = Math.max(0, availableCount - selectedQty);

          // Helper to get uploaded category photo avatar from backend or Settings
          const getCategoryPhoto = (item) => {
            if (item.avatar || item.image || item.photo) return item.avatar || item.image || item.photo;
            try {
              const saved = localStorage.getItem("fsuu_equipment_types");
              if (saved) {
                const cats = JSON.parse(saved);
                const match = cats.find(c =>
                  (c.name && item.name && item.name.toLowerCase().includes(c.name.toLowerCase())) ||
                  (c.eq_name && item.name && item.name.toLowerCase().includes(c.eq_name.toLowerCase())) ||
                  (c.eq_type && item.name && item.name.toLowerCase().includes(c.eq_type.toLowerCase()))
                );
                if (match && (match.avatar || match.photo || match.image)) return match.avatar || match.photo || match.image;
              }
            } catch { return null; }
            return null;
          };

          const displayPhoto = getCategoryPhoto(item);

          return (
            <div
              key={item.id}
              onClick={() => {
                if (isAvailable) handleEquipmentToggle(item.id);
              }}
              className={`relative border-2 rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                !isAvailable
                  ? "border-slate-200 bg-slate-50/70 opacity-90 cursor-not-allowed"
                  : isChecked
                    ? isSco
                      ? "border-purple-600 bg-purple-50/70 shadow-md scale-[1.02] cursor-pointer"
                      : "border-blue-600 bg-blue-50/70 shadow-md scale-[1.02] cursor-pointer"
                    : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer"
              }`}
            >
              {/* Image Box with Red Unavailable Badge Overlay */}
              <div className="relative w-full h-36 bg-slate-100 rounded-xl mb-3 overflow-hidden flex items-center justify-center border border-slate-200">
                {displayPhoto ? (
                  <img src={displayPhoto} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-center">
                    <IconComp size={36} className={isSco ? "text-purple-400" : "text-blue-400"} />
                    <span className="text-[11px] font-bold text-slate-500 mt-1">{item.name}</span>
                  </div>
                )}

                {/* Red Unavailable Badge Banner matching Reference Image 3 */}
                {!isAvailable && (
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center">
                    <div className="bg-rose-600 text-white font-extrabold text-xs px-4 py-1.5 rounded-full shadow-lg border border-rose-400 flex items-center gap-1.5 tracking-wider uppercase rotate-[-5deg]">
                      <XCircle size={15} />
                      <span>UNAVAILABLE</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Main Body */}
              <div className="flex flex-col flex-grow">
                
                {/* Header Row: Dept Tag & Availability Status */}
                <div className="flex justify-between items-center mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isSco ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                  }`}>
                    <IconComp size={16} />
                  </div>

                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                    isSco ? "bg-purple-100 border-purple-200 text-purple-700" : "bg-blue-100 border-blue-200 text-blue-700"
                  }`}>
                    {isSco ? "SCO Media" : "AVR Resource"}
                  </span>
                </div>

                <h4 className="font-extrabold text-slate-900 text-sm mb-1">{item.name}</h4>

                {/* Status Pill with Real-time Dynamic Availability Update */}
                <div className="mb-2">
                  {!isAvailable ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                      <XCircle size={12} />
                      {item.status === "lost" ? "Reported Lost" : (item.status === "maintenance" || item.status === "damaged") ? "Maintenance / Damaged" : "Out of Stock"}
                    </span>
                  ) : isChecked ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-600 text-white shadow-xs animate-in zoom-in-95">
                      <span>{remainingCount} Remaining</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ {availableCount} Available
                    </span>
                  )}
                </div>

                {/* Yellow Callout for Next Available Time matching Reference Image 3 */}
                {!isAvailable && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-xl mb-3 text-[11px] font-semibold flex items-center gap-1.5">
                    <Clock size={14} className="text-amber-600 flex-shrink-0" />
                    <span><strong>Next available:</strong> {nextTime}</span>
                  </div>
                )}

                <p className="text-xs text-slate-500 leading-relaxed mb-4">{item.description}</p>
              </div>

              {/* Action Button */}
              <div className={`mt-auto text-xs font-bold text-center py-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                !isAvailable
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : isChecked
                    ? isSco ? "bg-purple-600 text-white border-purple-600 shadow-xs" : "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
              }`}>
                {!isAvailable ? (
                  <span>Not Available</span>
                ) : isChecked ? (
                  <>
                    <Check size={14} />
                    <span>Added to Requisition</span>
                  </>
                ) : (
                  <span>Select Item</span>
                )}
              </div>

              {/* Plus & Minus Quantity Controls for Added Items */}
              {isChecked && isAvailable && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between bg-white/90 p-2 rounded-xl border border-slate-200 shadow-2xs"
                >
                  <span className="text-[11px] font-extrabold text-slate-700">Quantity:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange && handleQuantityChange(item.id, (itemQuantities[item.id] || 1) - 1, availableCount)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold flex items-center justify-center text-sm shadow-2xs transition-all cursor-pointer"
                      title="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="text-xs font-black text-slate-900 w-5 text-center font-mono">
                      {itemQuantities[item.id] || 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange && handleQuantityChange(item.id, (itemQuantities[item.id] || 1) + 1, availableCount)}
                      disabled={(itemQuantities[item.id] || 1) >= availableCount}
                      className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-extrabold flex items-center justify-center text-sm shadow-2xs transition-all cursor-pointer"
                      title="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Grid Pagination Controls (6-Grid Next/Prev Controls) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200/80 mb-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft size={14} />
            <span>Previous</span>
          </button>

          <span className="text-xs font-bold text-slate-600">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Back and Next Step Navigation Switches */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200/80">
        <Button
          type="button"
          variant="outline"
          onClick={() => onBack && onBack()}
          className="border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer"
        >
          <ChevronLeft size={16} />
          <span>Back to Requester Role</span>
        </Button>

        {(() => {
          const totalUnitsSelected = selectedItems.reduce((sum, id) => sum + (itemQuantities[id] || 1), 0);
          return (
            <Button
              type="button"
              disabled={selectedItems.length === 0}
              onClick={handleEquipmentSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              <span>Next: Fill Details ({totalUnitsSelected} item{totalUnitsSelected !== 1 ? 's' : ''} selected)</span>
              <ChevronRight size={16} />
            </Button>
          );
        })()}
      </div>

    </div>
  );
}
