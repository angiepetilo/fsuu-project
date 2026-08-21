import { useState, useEffect } from "react";
import { Sparkles, Check, PackageOpen, ChevronLeft, ChevronRight, XCircle, Clock, CalendarDays, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { getTodayISO, isPastDate, isPastTimeToday, isPastDateTime } from "@/lib/dateTimeUtils";

export default function Step2Equipment({
  identity,
  equipmentCategory, setEquipmentCategory,
  uniqueCategories = ["all"],
  filteredCatalog,
  selectedItems, handleEquipmentToggle,
  itemQuantities = {}, handleQuantityChange,
  isScoSelected, isAvrSelected,
  startTime, setStartTime,
  endTime, setEndTime,
  wishesToExtend = false, setWishesToExtend,
  isPinVerified = false, setIsPinVerified,
  setShowPinModal,
  setPinModalMeta,
  opHours: propOpHours,
  pinRules: propPinRules,
  handleEquipmentSubmit,
  onBack,
  catalogLoading = false,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const catalogList = filteredCatalog || [];
  const totalPages = Math.ceil(catalogList.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentGridItems = catalogList.slice(startIndex, startIndex + itemsPerPage);
  const totalSelectedCount = (selectedItems || []).reduce((sum, id) => sum + (itemQuantities[id] || 1), 0);

  const [opHours, setOpHours] = useState(propOpHours || null);
  const [pinRules, setPinRules] = useState(propPinRules || null);

  useEffect(() => {
    if (propOpHours) setOpHours(propOpHours);
  }, [propOpHours]);

  useEffect(() => {
    if (propPinRules) setPinRules(propPinRules);
  }, [propPinRules]);

  useEffect(() => {
    if (!propOpHours) {
      api.get("/public/operating-hours")
        .catch(() => api.get("/admin/operating-hours"))
        .then(res => {
          if (res?.data) setOpHours(res.data);
        })
        .catch(() => {});
    }
  }, [propOpHours]);

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
    if (!isoStr) return getTodayISO();
    return isoStr.split("T")[0];
  };

  const currentDate = getDatePart(startTime);
  const startTimeVal = getTimePart(startTime, "08:00");
  const endTimeVal = getTimePart(endTime, "17:00");

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const monthLabel = new Date(calYear, calMonth).toLocaleString("default", { month: "long", year: "numeric" });
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const pad = (n) => String(n).padStart(2, "0");

  // Calculate Next Available Date for 0 stock / borrowed items
  const getNextAvailableInfo = (item) => {
    return "No Stock / Unavailable";
  };

  // Calculate live available stock count
  const getLiveStockCount = (item) => {
    if (!item) return 0;
    if (typeof item.available_count === "number") return item.available_count;
    if (typeof item.available_units === "number") return item.available_units;
    if (typeof item.total_quantity === "number") return item.total_quantity;

    return 0;
  };

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      {/* Section Header */}
      <div className="mb-6 pb-4 border-b border-slate-100">
        <h3 className="font-black text-slate-900 text-xl tracking-tight mb-1">1. Select Equipment</h3>
        <p className="text-xs text-slate-500 font-medium">Choose from available university equipment</p>
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
              const remainingAvailable = isChecked ? Math.max(0, availableTotal - selectedQty) : availableTotal;

              const isAvailable = !isMaintenance && !isDamagedOrLost && item.is_available !== false && availableTotal > 0;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isAvailable) handleEquipmentToggle(item.id);
                  }}
                  className={`relative border-2 rounded-[32px] p-6 transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                    isMaintenance
                      ? "border-amber-300/80 bg-amber-50/20 opacity-90 cursor-not-allowed shadow-2xs"
                      : !isAvailable
                      ? "border-slate-100 bg-white opacity-90 cursor-pointer"
                      : isChecked
                      ? "border-blue-600 bg-white shadow-lg ring-4 ring-blue-50/60 cursor-pointer"
                      : "border-slate-100 bg-white hover:border-slate-300 hover:shadow-xs cursor-pointer"
                  }`}
                >
                  <div>
                    {/* Top Image / Placeholder Box (Screenshot 1) */}
                    <div className="w-full h-[160px] bg-blue-50/70 border border-blue-100/80 rounded-3xl overflow-hidden flex flex-col items-center justify-center text-center relative">
                      {item.avatar || item.photo || item.image || item.photo_url ? (
                        <img src={item.avatar || item.photo || item.image || item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="p-6 flex flex-col items-center justify-center h-full w-full">
                          <PackageOpen size={44} className="text-blue-600 mb-2.5 shrink-0" />
                          <span className="text-blue-950 font-extrabold text-sm leading-snug line-clamp-2" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Equipment Metadata (Screenshot 1) */}
                    <div className="mt-4 space-y-1">
                      <h4 className="font-extrabold text-slate-900 text-sm leading-tight truncate" title={item.name}>{item.name}</h4>
                      <p className={`text-xs font-bold ${remainingAvailable === 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        {remainingAvailable} Available
                      </p>
                    </div>
                  </div>

                  {/* Bottom Action Pill Button (Screenshot 1) */}
                  <div className="mt-5">
                    {isMaintenance ? (
                      <button
                        disabled
                        className="w-full py-3 rounded-full border border-amber-300 bg-amber-50 text-amber-800 text-xs font-extrabold flex items-center justify-center gap-1.5 opacity-90 cursor-not-allowed"
                      >
                        <AlertTriangle size={14} className="text-amber-600" />
                        <span>Maintenance Block</span>
                      </button>
                    ) : !isAvailable ? (
                      <button
                        disabled
                        className="w-full py-3 rounded-full border border-slate-200 bg-slate-50 text-slate-500 text-xs font-extrabold flex items-center justify-center gap-1.5 opacity-80 cursor-not-allowed"
                      >
                        <XCircle size={14} className="text-slate-400" />
                        <span>No Stock Available</span>
                      </button>
                    ) : isChecked ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleEquipmentToggle(item.id); }}
                          className="flex-1 py-3 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                        >
                          <Check size={14} />
                          <span>Selected</span>
                        </button>
                        <div className="flex items-center border border-blue-200 rounded-full px-2 py-1 bg-blue-50">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleQuantityChange && handleQuantityChange(item.id, Math.max(1, (itemQuantities[item.id] || 1) - 1), availableTotal); }}
                            className="w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-white text-blue-700 font-bold text-xs flex items-center justify-center hover:bg-blue-100 shadow-2xs cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-extrabold text-xs px-2 text-blue-900">{itemQuantities[item.id] || 1}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleQuantityChange && handleQuantityChange(item.id, (itemQuantities[item.id] || 1) + 1, availableTotal); }}
                            disabled={(itemQuantities[item.id] || 1) >= availableTotal}
                            className="w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-blue-600 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-xs flex items-center justify-center shadow-2xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleEquipmentToggle(item.id); }}
                        className="w-full py-3 rounded-full border border-slate-200 bg-white hover:bg-blue-600 hover:text-white hover:border-blue-600 text-slate-800 text-xs font-black transition-all cursor-pointer shadow-2xs"
                      >
                        Select Item
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls Below Equipment Selection */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Prev 4</span>
              </button>

              <span className="text-xs font-black text-slate-700 px-2">
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
          )}
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
                  {monthLabel}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="w-6 h-6 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="w-6 h-6 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center shadow-2xs cursor-pointer"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 uppercase">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, idx) => <div key={idx}>{d}</div>)}
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(dayNum)}`;
                  const isSelected = currentDate === dateStr;
                  const disabled = isPastDate(dateStr);

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (!disabled) {
                          setStartTime && setStartTime(`${dateStr}T${startTimeVal}`);
                          setEndTime && setEndTime(`${dateStr}T${endTimeVal}`);
                        }
                      }}
                      className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center mx-auto transition-all ${
                        disabled
                          ? "bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed"
                          : isSelected
                            ? "bg-blue-600 text-white font-black shadow-md scale-105 cursor-pointer"
                            : "bg-white/90 hover:bg-blue-50 text-slate-700 border border-slate-200/80 shadow-2xs cursor-pointer"
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

              {isPastTimeToday(currentDate, startTimeVal) && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                  <span>Selected start time ({formatTime12(startTimeVal)}) has already passed for today. Please select a future time slot.</span>
                </div>
              )}
            </div>

            {/* Operating Hours Notice Banner */}
            {(() => {
              const kioskOpen = opHours?.equipment_open?.substring(0, 5) || "08:00";
              const kioskClose = opHours?.equipment_close?.substring(0, 5) || "17:00";
              const isOutside = startTimeVal < kioskOpen || endTimeVal > kioskClose;
              const requiresPinForOutside = (pinRules?.requirePinOutsideHours !== false) && isOutside;

              if (isOutside) {
                return (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        Outside Office Hours ({formatTime12(kioskOpen)} – {formatTime12(kioskClose)})
                      </span>
                      {requiresPinForOutside && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-200 text-slate-700">
                          PIN Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 font-normal leading-relaxed">
                      Selected borrowing/return time ({formatTime12(startTimeVal)} – {formatTime12(endTimeVal)}) is outside campus hours.
                      {requiresPinForOutside ? " AVR Head / Admin Verification PIN is required." : ""}
                    </p>
                    {requiresPinForOutside && (
                      <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between gap-2">
                        {isPinVerified ? (
                          <span className="text-xs font-medium text-slate-700">
                            ✓ PIN verified for outside hours
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (setPinModalMeta) {
                                setPinModalMeta({
                                  title: "Outside Office Hours PIN",
                                  description: `Selected borrowing time (${formatTime12(startTimeVal)} - ${formatTime12(endTimeVal)}) is outside campus hours (${formatTime12(kioskOpen)} - ${formatTime12(kioskClose)}). AVR Head / Admin Verification PIN is required.`,
                                });
                              }
                              setShowPinModal && setShowPinModal(true);
                            }}
                            className="w-full py-2 px-3 rounded-lg border border-blue-600 bg-blue-50/70 hover:bg-blue-600 text-blue-700 hover:text-white active:bg-blue-700 active:scale-[0.99] font-semibold text-xs transition-all cursor-pointer text-center shadow-2xs"
                          >
                            Verify PIN
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })()}

            {/* Wish to Extend Return Borrowing Gate */}
            {(() => {
              let diffDays = 0;
              const dateEnd = getDatePart(endTime);
              if (dateEnd && currentDate && dateEnd > currentDate) {
                const startD = new Date(currentDate);
                const endD = new Date(dateEnd);
                const diffTime = endD - startD;
                diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              }
              const isMultiDay = diffDays >= 1;
              const requiresPinForMultiDay = (pinRules?.requirePinMultiDayEquipment !== false) && isMultiDay;

              return (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wishesToExtend || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setWishesToExtend && setWishesToExtend(checked);
                        if (!checked) {
                          setEndTime && setEndTime(`${currentDate}T${endTimeVal}`);
                          if (setIsPinVerified) setIsPinVerified(false);
                        }
                      }}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 text-xs">Wish to Extend Return Borrowing</span>
                      <p className="text-xs text-slate-500 font-normal leading-tight mt-0.5">
                        Check if returning next-day or extending beyond standard cutoff.
                      </p>
                    </div>
                  </label>

                  {wishesToExtend && (
                    <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-700">Return End Date</label>
                        <input
                          type="date"
                          min={currentDate || getTodayISO()}
                          value={dateEnd || currentDate || ''}
                          onChange={e => {
                            const newDate = e.target.value;
                            if (setEndTime) setEndTime(`${newDate}T${endTimeVal}`);
                          }}
                          className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs font-normal text-slate-800 focus:outline-none transition-colors ${dateEnd < currentDate ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-600'}`}
                        />
                      </div>

                      {requiresPinForMultiDay && (
                        !isPinVerified ? (
                          <div className="space-y-1.5 pt-1">
                            <p className="text-xs text-slate-600 font-normal">
                              Multi-day borrowing requires AVR Head / Admin verification PIN.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                if (setPinModalMeta) {
                                  setPinModalMeta({
                                    title: "Extended Borrowing PIN",
                                    description: "Multi-day borrowing requires AVR Head / Admin Verification PIN for authorization.",
                                  });
                                }
                                setShowPinModal && setShowPinModal(true);
                              }}
                              className="w-full py-2 px-3 rounded-lg border border-blue-600 bg-blue-50/70 hover:bg-blue-600 text-blue-700 hover:text-white active:bg-blue-700 active:scale-[0.99] font-semibold text-xs transition-all cursor-pointer text-center shadow-2xs"
                            >
                              Verify PIN
                            </button>
                          </div>
                        ) : (
                          <div className="pt-1 text-xs font-semibold text-emerald-700">
                            ✓ PIN verified for multi-day extension
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

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

        {(() => {
          const kioskOpen = opHours?.equipment_open?.substring(0, 5) || "08:00";
          const kioskClose = opHours?.equipment_close?.substring(0, 5) || "17:00";
          const isOutside = startTimeVal < kioskOpen || endTimeVal > kioskClose;
          const requiresPinForOutside = (pinRules?.requirePinOutsideHours !== false) && isOutside;
          
          let diffDays = 0;
          const dateEnd = getDatePart(endTime);
          if (dateEnd && currentDate && dateEnd > currentDate) {
            const startD = new Date(currentDate);
            const endD = new Date(dateEnd);
            const diffTime = endD - startD;
            diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
          const isMultiDay = diffDays > 2;
          const requiresPinForMultiDay = (pinRules?.requirePinMultiDayEquipment !== false) && isMultiDay;
          
          const requiresPin = requiresPinForMultiDay || requiresPinForOutside || (pinRules?.enableExternalEquipment !== false && identity === "external");
          const isBlocked = requiresPin && !isPinVerified;

          return (
            <div className="flex flex-col items-end gap-1">
              <Button
                type="button"
                disabled={
                  !selectedItems ||
                  selectedItems.length === 0 ||
                  isPastDateTime(currentDate, startTimeVal) ||
                  (getDatePart(endTime) < currentDate) ||
                  isBlocked
                }
                onClick={handleEquipmentSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
              >
                <span>Next: Fill Details ({totalSelectedCount} items selected)</span>
                <ChevronRight size={16} />
              </Button>
              {isBlocked ? (
                <span className="text-[10px] font-bold text-rose-600">
                  Verify AVR Head PIN to proceed with requisition
                </span>
              ) : null}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
