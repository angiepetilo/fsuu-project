import { useState, useEffect } from "react";
import { Sparkles, Check, PackageOpen, ChevronLeft, ChevronRight, XCircle, Clock, CalendarDays, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";

export default function Step2Equipment({
  equipmentCategory, setEquipmentCategory,
  filteredCatalog,
  selectedItems, handleEquipmentToggle,
  itemQuantities = {}, handleQuantityChange,
  isScoSelected, isAvrSelected,
  startTime, setStartTime,
  endTime, setEndTime,
  wishesToExtend = false, setWishesToExtend,
  isPinVerified = false, setIsPinVerified,
  setShowPinModal,
  handleEquipmentSubmit,
  onBack,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const catalogList = filteredCatalog || [];
  const totalPages = Math.ceil(catalogList.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentGridItems = catalogList.slice(startIndex, startIndex + itemsPerPage);
  const totalSelectedCount = (selectedItems || []).reduce((sum, id) => sum + (itemQuantities[id] || 1), 0);

  const [opHours, setOpHours] = useState(null);

  useEffect(() => {
    api.get("/public/operating-hours")
      .catch(() => api.get("/admin/operating-hours"))
      .then(res => {
        if (res?.data) setOpHours(res.data);
      })
      .catch(() => {});
  }, []);

  const formatTime12 = (tStr) => {
    if (!tStr) return "";
    const [h, m] = tStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  };

  // Helper to extract time HH:mm from ISO string
  const getTimePart = (isoStr, defaultTime) => {
    if (!isoStr || !isoStr.includes("T")) return defaultTime;
    return isoStr.split("T")[1].slice(0, 5);
  };

  const getDatePart = (isoStr) => {
    if (!isoStr) return "2026-08-04";
    return isoStr.split("T")[0];
  };

  const currentDate = getDatePart(startTime);
  const startTimeVal = getTimePart(startTime, "08:00");
  const endTimeVal = getTimePart(endTime, "17:00");

  // Calculate Next Available Date for 0 stock / borrowed items from reports & borrowings log
  const getNextAvailableInfo = (item) => {
    try {
      const savedBorrowings = localStorage.getItem("fsuu_equipment_borrowings");
      if (savedBorrowings) {
        const borrowings = JSON.parse(savedBorrowings);
        const activeLoans = borrowings.filter(b => {
          const status = (b.status || "").toLowerCase();
          const matches = (b.equipment_name && item.name && b.equipment_name.toLowerCase() === item.name.toLowerCase()) ||
                          (b.items && Array.isArray(b.items) && b.items.some(i => (i.name || i.equipment_name || "").toLowerCase() === (item.name || "").toLowerCase()));
          return matches && status !== "completed" && status !== "rejected" && status !== "cancelled";
        });

        if (activeLoans.length > 0) {
          let returnTimes = activeLoans.map(l => l.return_date || l.endTime || l.expected_return).filter(Boolean);
          if (returnTimes.length > 0) {
            returnTimes.sort();
            const earliest = new Date(returnTimes[0]);
            if (!isNaN(earliest.getTime())) {
              const formattedDate = earliest.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const formattedTime = earliest.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
              return `Borrowed (Next Available: ${formattedDate} at ${formattedTime})`;
            }
          }
          return "Borrowed (Next Available: Aug 05, 2026 at 05:00 PM)";
        }
      }
    } catch {}
    return "No Stock / Unavailable";
  };

  // Calculate live available stock count from physical equipment units & reports inventory data
  const getLiveStockCount = (item) => {
    try {
      const savedUnitsStr = localStorage.getItem("fsuu_equipment_units");
      if (savedUnitsStr) {
        const savedUnits = JSON.parse(savedUnitsStr);
        if (Array.isArray(savedUnits) && savedUnits.length > 0) {
          const itemCatName = (item.name || item.equipment_name || item.category || "").toLowerCase().trim();
          const categoryUnits = savedUnits.filter(u => {
            const uCat = (u.assigned_category || u.category || u.equipment_name || "").toLowerCase().trim();
            return uCat === itemCatName || uCat.includes(itemCatName) || itemCatName.includes(uCat);
          });

          if (categoryUnits.length > 0) {
            return categoryUnits.filter(u => (u.status || "available").toLowerCase() === "available").length;
          }
        }
      }
    } catch {}

    try {
      const savedTypesStr = localStorage.getItem("fsuu_equipment_types");
      if (savedTypesStr) {
        const savedTypes = JSON.parse(savedTypesStr);
        if (Array.isArray(savedTypes)) {
          const itemCatName = (item.name || item.equipment_name || "").toLowerCase().trim();
          const match = savedTypes.find(t => (t.name || t.eq_name || "").toLowerCase().trim() === itemCatName);
          if (match && typeof match.available_count === "number") {
            return match.available_count;
          }
        }
      }
    } catch {}

    if (typeof item.available_count === "number") return item.available_count;
    if (typeof item.available_units === "number") return item.available_units;
    if (typeof item.total_quantity === "number") return item.total_quantity;

    return 0;
  };

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      {/* Category Campus Location Tabs & Section Header with Top-Right Pagination (Matching Screenshot) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-black text-slate-900 text-xl tracking-tight mb-1">1. Select Equipment</h3>
          <p className="text-xs text-slate-500 font-medium">Choose from available university equipment</p>
        </div>

        {/* Top-Right Pill Pagination Controls (Matching Screenshot `< Prev 4` `1 / 2` `Next 4 >`) */}
        <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <ChevronLeft size={14} />
            <span>Prev 4</span>
          </button>

          <span className="text-xs font-black text-slate-700 px-1">
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <span>Next 4</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Grid: Left 2x2 Catalog + Right Calendar & Time Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left Column: Equipment Catalog (2x2 Grid) */}
        <div className="lg:col-span-7 sm:col-span-12 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {currentGridItems.map((item) => {
              const isChecked = selectedItems.includes(item.id);
              const isMaintenance = item.status === "maintenance" || item.status === "under_maintenance" || item.is_maintenance === true;
              const isDamagedOrLost = item.status === "damaged" || item.status === "lost";
              const availableTotal = getLiveStockCount(item);
              const selectedQty = isChecked ? (itemQuantities[item.id] || 1) : 0;
              const remainingCount = Math.max(0, availableTotal - selectedQty);

              const isAvailable = !isMaintenance && !isDamagedOrLost && item.is_available !== false && availableTotal > 0;
              const nextAvailText = getNextAvailableInfo(item);
              const isBorrowed = availableTotal === 0 && !isMaintenance && nextAvailText.startsWith("Borrowed");

              const displayPhoto = item.avatar || item.image || item.photo;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isAvailable) handleEquipmentToggle(item.id);
                  }}
                  className={`relative border-2 rounded-[28px] p-5 transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                    isMaintenance
                      ? "border-amber-300/80 bg-amber-50/20 opacity-90 cursor-not-allowed shadow-2xs"
                      : !isAvailable
                      ? "border-slate-200/90 bg-slate-50/70 opacity-90 cursor-not-allowed shadow-2xs"
                      : isChecked
                      ? "border-blue-600 bg-white shadow-md ring-4 ring-blue-50/60 cursor-pointer"
                      : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs cursor-pointer"
                  }`}
                >
                  <div>
                    {/* Thumbnail Image Container */}
                    <div className="relative w-full h-40 bg-slate-100/90 rounded-2xl mb-4 overflow-hidden flex items-center justify-center border border-slate-200/70">
                      {displayPhoto ? (
                        <img src={displayPhoto} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-3 text-center">
                          <PackageOpen size={38} className="text-blue-500" />
                          <span className="text-xs font-extrabold text-slate-500 mt-1">{item.name}</span>
                        </div>
                      )}

                      {/* Maintenance Block Overlay (Matching Screenshot) */}
                      {isMaintenance && (
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-2 text-center">
                          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[11px] px-4 py-1.5 rounded-full shadow-lg border border-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                            <AlertTriangle size={14} className="shrink-0 text-white" />
                            <span>MAINTENANCE BLOCK</span>
                          </div>
                        </div>
                      )}

                      {/* No Stock / Borrowed Overlay */}
                      {!isAvailable && !isMaintenance && (
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-2 text-center">
                          <div className={`text-white font-extrabold text-[10px] px-3 py-1 rounded-full shadow-lg border flex items-center gap-1 uppercase ${
                            isBorrowed ? "bg-amber-600 border-amber-400" : "bg-rose-600 border-rose-400"
                          }`}>
                            <XCircle size={12} />
                            <span>{isBorrowed ? "BORROWED" : "NO STOCK"}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Badges Row (Office Tag & Stock Status Pill) */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-xl border border-blue-200/80 bg-blue-50 text-blue-700 shrink-0">
                        {item.dept === "sco" ? "SCO ASSET" : "AVR RESOURCE"}
                      </span>

                      {/* Right Stock Status Badge */}
                      {isMaintenance ? (
                        <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 inline-flex items-center gap-1">
                          <AlertTriangle size={11} /> Maintenance
                        </span>
                      ) : isChecked ? (
                        <span className="text-[11px] font-extrabold text-white bg-blue-600 px-3.5 py-1 rounded-full shadow-xs inline-flex items-center gap-1">
                          {remainingCount} Remaining
                        </span>
                      ) : availableTotal > 0 ? (
                        <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80 inline-flex items-center gap-1">
                          ✓ {availableTotal} Available
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200/80 inline-flex items-center gap-1">
                          🚫 No Stock
                        </span>
                      )}
                    </div>

                    {/* Item Title & Location/Specs */}
                    <h4 className="font-extrabold text-slate-900 text-base mb-1 tracking-tight line-clamp-1">{item.name}</h4>
                    <p className="text-xs text-slate-500 font-medium mb-4 line-clamp-1">
                      {item.spec || item.description || "Audio / Visual Equipment"}
                    </p>
                  </div>

                  {/* Bottom Action Controls */}
                  <div className="pt-2 border-t border-slate-100">
                    {isMaintenance ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-full border border-amber-300/80 bg-amber-50 text-amber-800 text-xs font-black flex items-center justify-center gap-1.5 opacity-90 cursor-not-allowed"
                      >
                        <XCircle size={14} className="text-amber-600" />
                        <span>Unavailable</span>
                      </button>
                    ) : !isAvailable ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700 text-xs font-black flex items-center justify-center gap-1.5 opacity-80 cursor-not-allowed"
                      >
                        <XCircle size={14} className="text-rose-500" />
                        <span>No Stock</span>
                      </button>
                    ) : !isChecked ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEquipmentToggle(item.id);
                        }}
                        className="w-full py-2.5 rounded-full border border-slate-200 bg-slate-50/80 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-xs font-black transition-all cursor-pointer shadow-2xs"
                      >
                        Select Item
                      </button>
                    ) : (
                      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleEquipmentToggle(item.id)}
                          className="w-full py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Check size={14} />
                          <span>Added to Requisition</span>
                        </button>

                        <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                          <span className="text-[11px] font-extrabold text-slate-700">Quantity:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange && handleQuantityChange(item.id, Math.max(1, (itemQuantities[item.id] || 1) - 1), availableTotal)}
                              className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-extrabold text-xs text-slate-900 w-5 text-center">
                              {itemQuantities[item.id] || 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange && handleQuantityChange(item.id, (itemQuantities[item.id] || 1) + 1, availableTotal)}
                              disabled={(itemQuantities[item.id] || 1) >= availableTotal}
                              className="w-6 h-6 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Calendar & Time Settings */}
        <div className="lg:col-span-5 sm:col-span-12">
          <div className="bg-white/95 backdrop-blur-md p-5 rounded-[28px] border border-slate-200/90 shadow-md space-y-4 sticky top-4">
            {/* Clean Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-2 uppercase tracking-wider">
                <Clock size={16} className="text-blue-600" />
                Borrow Date & Time Settings
              </h4>
            </div>

            {/* Interactive Calendar Card displaying Month */}
            <div className="bg-slate-100/70 p-3.5 rounded-[22px] border border-slate-200/80 space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <CalendarDays size={15} className="text-blue-600" />
                  August 2026
                </span>
                <span className="text-[10px] font-extrabold text-blue-700 bg-white px-2.5 py-1 rounded-full border border-blue-200 shadow-2xs">
                  Selected: {currentDate}
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 uppercase">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, idx) => <div key={idx}>{d}</div>)}
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                {Array.from({ length: 31 }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `2026-08-${String(dayNum).padStart(2, '0')}`;
                  const isSelected = currentDate === dateStr;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => {
                        setStartTime && setStartTime(`${dateStr}T${startTimeVal}`);
                        setEndTime && setEndTime(`${dateStr}T${endTimeVal}`);
                      }}
                      className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center mx-auto transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white font-black shadow-md scale-105"
                          : "bg-white/90 hover:bg-blue-50 text-slate-700 border border-slate-200/80 shadow-2xs"
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Settings (Time Only Selectors, Date drive by Calendar) */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <span>Borrow Release Start Time</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={startTimeVal}
                  onChange={(e) => setStartTime && setStartTime(`${currentDate}T${e.target.value}`)}
                  className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <span>Expected Return End Time</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={endTimeVal}
                  onChange={(e) => setEndTime && setEndTime(`${currentDate}T${e.target.value}`)}
                  className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Operating Hours Notice Banner */}
            {(() => {
              const kioskOpen = opHours?.equipment_open?.substring(0, 5) || "08:00";
              const kioskClose = opHours?.equipment_close?.substring(0, 5) || "17:00";
              const isOutside = startTimeVal < kioskOpen || endTimeVal > kioskClose;

              if (isOutside) {
                return (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-800">
                      <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                      <span>Kiosk Hours Notice ({formatTime12(kioskOpen)} - {formatTime12(kioskClose)})</span>
                    </div>
                    <p className="text-[10.5px] text-amber-800 font-medium leading-snug">
                      Selected return time ({formatTime12(endTimeVal)}) is outside standard kiosk hours. You must check <strong>"Wish to Extend Return Borrowing"</strong> and verify the AVR Head PIN to proceed.
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            {/* Wish to Extend Return Borrowing Gate */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wishesToExtend || false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setWishesToExtend && setWishesToExtend(checked);
                    if (!checked && setIsPinVerified) setIsPinVerified(false);
                  }}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded-md border-amber-300 focus:ring-blue-500"
                />
                <div>
                  <span className="font-extrabold text-slate-900 text-xs">Wish to Extend Return Borrowing</span>
                  <p className="text-[10px] text-slate-600 font-medium leading-tight mt-0.5">
                    Check if returning next-day or extending beyond standard 5:00 PM cutoff.
                  </p>
                </div>
              </label>

              {wishesToExtend && (
                <div className="pt-2 border-t border-amber-200/60 space-y-2 animate-in fade-in duration-200">
                  {!isPinVerified ? (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                        <XCircle size={14} className="text-amber-600 shrink-0" />
                        <span>AVR Head / Admin PIN verification required before proceeding.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPinModal && setShowPinModal(true)}
                        className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Clock size={14} />
                        <span>Verify AVR Head PIN Now</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-extrabold flex items-center gap-2">
                      <Check size={16} className="text-emerald-700" />
                      <span>AVR Head PIN Verified for Extension</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation Bar */}
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

        <div className="flex flex-col items-end gap-1">
          <Button
            type="button"
            disabled={
              !selectedItems ||
              selectedItems.length === 0 ||
              ((wishesToExtend || endTimeVal > (opHours?.equipment_close?.substring(0, 5) || "17:00") || startTimeVal < (opHours?.equipment_open?.substring(0, 5) || "08:00")) && !isPinVerified)
            }
            onClick={handleEquipmentSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
          >
            <span>Next: Fill Details ({totalSelectedCount} items selected)</span>
            <ChevronRight size={16} />
          </Button>
          {wishesToExtend && !isPinVerified ? (
            <span className="text-[10px] font-bold text-rose-600">
              Verify AVR Head PIN to proceed with extended borrowing
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
