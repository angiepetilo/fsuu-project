import { useState, useEffect } from "react";
import { Check, PackageOpen, ChevronLeft, ChevronRight, XCircle, Clock, CalendarDays, AlertTriangle, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { getTodayISO, isPastTimeToday, isPastDateTime } from "@/lib/dateTimeUtils";

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
  const [equipSearch, setEquipSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const rawCatalogList = filteredCatalog || [];
  const catalogList = rawCatalogList.filter(item => {
    if (!equipSearch.trim()) return true;
    const q = equipSearch.toLowerCase();
    const name = (item.name || "").toLowerCase();
    const cat = (item.category || item.eq_type || "").toLowerCase();
    const brand = (item.brand || "").toLowerCase();
    const model = (item.model || "").toLowerCase();
    return name.includes(q) || cat.includes(q) || brand.includes(q) || model.includes(q);
  });

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

  const [sysSettings, setSysSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_system_settings");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { max_items_per_borrow: 5, allow_advance_equipment_booking: true };
  });

  useEffect(() => {
    api.get("/public/system-settings")
      .then((res) => {
        if (res.data) setSysSettings(res.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!propOpHours) {
      api.get("/public/operating-hours")
        .catch(() => api.get("/admin/operating-hours"))
        .then(res => {
          if (res?.data) setOpHours(res.data);
        })
        .catch(() => { });
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

  const kioskOpen = opHours?.equipment_open?.substring(0, 5) || "08:00";
  const kioskClose = opHours?.equipment_close?.substring(0, 5) || "17:00";

  // Calculate Today and Tomorrow ISO & formatted strings
  const todayISO = getTodayISO();
  const getTomorrowISO = () => {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    const pad = n => String(n).padStart(2, '0');
    return `${tom.getFullYear()}-${pad(tom.getMonth() + 1)}-${pad(tom.getDate())}`;
  };
  const tomorrowISO = getTomorrowISO();

  // Check if current real-time is past today's operating hours close
  const now = new Date();
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isPastClosingToday = currentHHMM >= kioskClose;

  // Determine initial borrow date mode (if past closing hours, auto-shift to tomorrow)
  const initialDateMode = isPastClosingToday || (startTime && startTime.startsWith(tomorrowISO)) ? "tomorrow" : "today";
  const [borrowDateMode, setBorrowDateMode] = useState(initialDateMode);

  const activeBorrowDate = borrowDateMode === "tomorrow" ? tomorrowISO : todayISO;
  const startTimeVal = getTimePart(startTime, kioskOpen);
  const endTimeVal = getTimePart(endTime, kioskClose);

  // Sync date with start/end time
  useEffect(() => {
    if (!startTime || !startTime.startsWith(activeBorrowDate)) {
      setStartTime && setStartTime(`${activeBorrowDate}T${startTimeVal}`);
    }
    if (!endTime || !endTime.startsWith(activeBorrowDate)) {
      setEndTime && setEndTime(`${activeBorrowDate}T${endTimeVal}`);
    }
  }, [activeBorrowDate]);

  const targetDateObj = borrowDateMode === "tomorrow" ? new Date(Date.now() + 86400000) : new Date();
  const formattedDisplayDate = targetDateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

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
        <p className="text-xs text-slate-500 font-medium">Walk-in physical custody & equipment requisition</p>
      </div>

      {/* Main Grid: Left 2x2 Catalog + Right Same-Day Time Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left Column: Equipment Catalog (2x2 Grid) */}
        <div className="lg:col-span-7 sm:col-span-12 space-y-4">
          {catalogLoading && (filteredCatalog || []).length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
              <Loader2 size={32} className="mx-auto text-blue-600 animate-spin" />
              <p className="text-xs font-bold text-slate-700">Loading equipment inventory...</p>
              <p className="text-[11px] text-slate-400">Fetching live stock availability</p>
            </div>
          ) : catalogList.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80">
              <PackageOpen size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">
                {(filteredCatalog || []).length === 0 ? "No equipment categories registered yet" : "No equipment found matching your search"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {(filteredCatalog || []).length === 0 ? "Please check back later or contact the PMO/AVR office." : "Try searching with another category or name"}
              </p>
            </div>
          ) : (
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
                  className={`relative border-2 rounded-[32px] p-6 transition-all duration-300 flex flex-col justify-between overflow-hidden ${isMaintenance
                    ? "border-amber-300/80 bg-amber-50/20 opacity-90 cursor-not-allowed shadow-2xs"
                    : !isAvailable
                      ? "border-slate-100 bg-white opacity-90 cursor-pointer"
                      : isChecked
                        ? "border-blue-600 bg-white shadow-lg ring-4 ring-blue-50/60 cursor-pointer"
                        : "border-slate-100 bg-white hover:border-slate-300 hover:shadow-xs cursor-pointer"
                    }`}
                >
                  <div>
                    {/* Top Image / Placeholder Box (Clean without icon) */}
                    <div className="w-full h-[160px] bg-blue-50/70 border border-blue-100/80 rounded-3xl overflow-hidden flex flex-col items-center justify-center text-center relative">
                      {item.avatar || item.photo || item.image || item.photo_url ? (
                        <img src={item.avatar || item.photo || item.image || item.photo_url} alt={item.name} className="w-full h-full object-contain p-2" />
                      ) : (
                        <div className="p-6 flex flex-col items-center justify-center h-full w-full">
                          <span className="text-blue-950 font-extrabold text-sm leading-snug line-clamp-2" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Equipment Metadata */}
                    <div className="mt-4 space-y-1">
                      <h4 className="font-extrabold text-slate-900 text-sm leading-tight truncate" title={item.name}>{item.name}</h4>
                      <p className={`text-xs font-bold ${remainingAvailable === 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        {remainingAvailable} Available Now
                      </p>
                    </div>
                  </div>

                  {/* Bottom Action Pill Button */}
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
          )}

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
                <span>Prev</span>
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
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Equipment Search + Walk-In / Same-Day & Next-Day Schedule Controls */}
        <div className="lg:col-span-5 sm:col-span-12 space-y-4">
          {/* Equipment Search Bar */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search equipment item, category, brand..."
              value={equipSearch}
              onChange={(e) => {
                setEquipSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9.5 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-xs"
            />
          </div>

          <div className="bg-white/95 backdrop-blur-md p-5 rounded-[28px] border border-slate-200/90 shadow-md space-y-4 sticky top-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Borrow Schedule ({borrowDateMode === "tomorrow" ? "Next-Day" : "Same-Day"})
              </h4>
            </div>

            {/* Date Selection Mode (Today vs Tomorrow) */}
            <div className="space-y-1.5">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setBorrowDateMode("today")}
                  disabled={isPastClosingToday}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${borrowDateMode === "today"
                    ? "bg-white text-blue-600 shadow-2xs"
                    : isPastClosingToday
                      ? "text-slate-400 cursor-not-allowed opacity-60"
                      : "text-slate-600 hover:text-slate-900 cursor-pointer"
                    }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setBorrowDateMode("tomorrow")}
                  disabled={!isPastClosingToday}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${borrowDateMode === "tomorrow"
                    ? "bg-white text-blue-600 shadow-2xs"
                    : !isPastClosingToday
                      ? "text-slate-400 cursor-not-allowed opacity-60"
                      : "text-slate-600 hover:text-slate-900 cursor-pointer"
                    }`}
                  title={!isPastClosingToday ? `Advance booking for tomorrow unlocks after operating hours end at ${formatTime12(kioskClose)}.` : "Next-Day Borrowing"}
                >
                  Tomorrow
                </button>
              </div>

              {!isPastClosingToday && (
                <p className="text-[10px] text-slate-400 font-medium text-center">
                  Tomorrow's schedule opens after today's operating hours end ({formatTime12(kioskClose)}).
                </p>
              )}
            </div>

            {/* Borrowing Date Card Banner */}
            <div className={`p-4 rounded-2xl border space-y-1.5 shadow-2xs ${borrowDateMode === "tomorrow"
              ? "bg-amber-50/70 border-amber-200/80"
              : "bg-blue-50/80 border-blue-200/80"
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-extrabold text-xs">
                  <CalendarDays size={16} className={borrowDateMode === "tomorrow" ? "text-amber-600 shrink-0" : "text-blue-600 shrink-0"} />
                  <span className={borrowDateMode === "tomorrow" ? "text-amber-900" : "text-blue-800"}>
                    Borrowing Date: <b>{borrowDateMode === "tomorrow" ? "Tomorrow" : "Today"}</b>
                  </span>
                </div>
                {isPastClosingToday && borrowDateMode === "tomorrow" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200/70 text-amber-900">
                    Next-Day Window
                  </span>
                )}
              </div>
              <p className="text-xs font-black text-slate-900 ml-6">
                {formattedDisplayDate}
              </p>
              <p className="text-[11px] text-slate-600 font-medium ml-6 leading-relaxed">
                {borrowDateMode === "tomorrow"
                  ? "Physical units will be reserved and pre-allocated for tomorrow's session."
                  : "Physical units are audited and released at the counter for today's session."}
              </p>
            </div>

            {/* Time Settings */}
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
                  onChange={(e) => {
                    const newStartTime = e.target.value;
                    setStartTime && setStartTime(`${activeBorrowDate}T${newStartTime}`);
                    // Ensure end time is at least 1 hour after start time
                    const [sh, sm] = (newStartTime || "08:00").split(":").map(Number);
                    const [eh, em] = (endTimeVal || "17:00").split(":").map(Number);
                    const startMins = (sh || 0) * 60 + (sm || 0);
                    const endMins = (eh || 0) * 60 + (em || 0);
                    if (endMins <= startMins) {
                      const newEndMins = Math.min(1439, startMins + 60);
                      const newEndH = String(Math.floor(newEndMins / 60)).padStart(2, "0");
                      const newEndM = String(newEndMins % 60).padStart(2, "0");
                      setEndTime && setEndTime(`${activeBorrowDate}T${newEndH}:${newEndM}`);
                    }
                  }}
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
                  onChange={(e) => setEndTime && setEndTime(`${activeBorrowDate}T${e.target.value}`)}
                  className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all shadow-inner"
                />
              </div>

              {endTimeVal <= startTimeVal && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                  <span>Expected return time ({formatTime12(endTimeVal)}) cannot be earlier than or equal to start time ({formatTime12(startTimeVal)}).</span>
                </div>
              )}

              {borrowDateMode === "today" && isPastTimeToday(todayISO, startTimeVal) && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                  <span>Selected start time ({formatTime12(startTimeVal)}) has already passed for today. Please select a future time slot or reserve for tomorrow.</span>
                </div>
              )}
            </div>

            {/* Operating Hours Notice Banner */}
            {(() => {
              const isOutside = startTimeVal < kioskOpen || endTimeVal > kioskClose;
              const requiresPinForOutside = (pinRules?.requirePinOutsideHours !== false) && isOutside;

              if (isOutside) {
                return (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        Outside Office Hours ({formatTime12(kioskOpen)} – {formatTime12(kioskClose)})
                      </span>
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
          </div>
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200/80">
        <Button
          type="button"
          variant="outline"
          onClick={() => onBack && onBack()}
          className="border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs py-5 px-5 rounded-xl cursor-pointer"
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </Button>

        {(() => {
          const isOutside = startTimeVal < kioskOpen || endTimeVal > kioskClose;
          const requiresPinForOutside = (pinRules?.requirePinOutsideHours !== false) && isOutside;

          const requiresPin = requiresPinForOutside || (pinRules?.enableExternalEquipment !== false && identity === "external");
          const isBlocked = requiresPin && !isPinVerified;

          const isPastSlot = borrowDateMode === "today" && isPastTimeToday(todayISO, startTimeVal);

          return (
            <div className="flex flex-col items-end gap-1">
              <Button
                type="button"
                disabled={
                  !selectedItems ||
                  selectedItems.length === 0 ||
                  isPastSlot ||
                  endTimeVal <= startTimeVal ||
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
