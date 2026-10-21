import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, PackageOpen, ChevronLeft, ChevronRight, XCircle, Clock, CalendarDays, AlertTriangle, AlertCircle, Search, Loader2, Home, Wrench, ShieldAlert, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomTimePicker from "@/components/ui/custom-time-picker";
import CustomCalendarPicker from "@/components/ui/custom-calendar-picker";
import api from "@/lib/axios";
import { resolveStorageUrl } from "@/lib/utils";
import { getTodayISO, isPastTimeToday, isPastDateTime } from "@/lib/dateTimeUtils";
import { getEquipmentBlockMessage, getEquipmentBlockInfo } from "@/lib/dateUtils";

function CategoryItemImage({ item }) {
  const [imgError, setImgError] = useState(false);
  const rawImg = item?.avatar || item?.photo || item?.image || item?.photo_url;
  const isCover = item?.photo_fit === "cover";
  const scale = item?.photo_scale ? Number(item.photo_scale) / 100 : 1;

  useEffect(() => {
    setImgError(false);
  }, [rawImg, item?.updated_at, item?.photo_fit, item?.photo_scale]);

  if (!rawImg || imgError) {
    return (
      <div className="p-3 flex flex-col items-center justify-center h-full w-full bg-slate-50/90 dark:bg-slate-800/60 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
        <PackageOpen className="w-8 h-8 text-slate-400 mb-1.5 shrink-0" />
        <span className="text-slate-600 dark:text-slate-300 font-bold text-xs leading-snug line-clamp-2 uppercase tracking-wide text-center" title={item?.name}>
          {item?.name}
        </span>
      </div>
    );
  }

  const resolved = resolveStorageUrl(rawImg) || rawImg;
  const srcUrl = resolved.startsWith("data:")
    ? resolved
    : `${resolved}${resolved.includes("?") ? "&" : "?"}v=${item?.updated_at ? new Date(item.updated_at).getTime() : "1"}`;

  return (
    <div className="w-full h-full overflow-hidden flex items-center justify-center">
      <img
        src={srcUrl}
        alt={item?.name || "Equipment"}
        className={`w-full h-full transition-transform duration-300 ${isCover ? "object-cover" : "object-contain"}`}
        style={{ transform: `scale(${scale})` }}
        onError={() => setImgError(true)}
      />
    </div>
  );
}

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
  isPortal = false,
}) {
  const navigate = useNavigate();

  // Responsive equipment pagination: 1 item on mobile, 4 items on desktop/tablet
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 640 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [equipSearch, setEquipSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 1 : 4;

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
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
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
    } catch { }
    return { max_items_per_borrow: 5, allow_advance_equipment_booking: true };
  });

  useEffect(() => {
    api.get("/public/system-settings")
      .then((res) => {
        if (res.data) setSysSettings(res.data);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!propOpHours) {
      api.get("/public/operating-hours")
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

  // Equipment overrides (closed / maintenance) from live API / localStorage
  const [equipmentOverrides, setEquipmentOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_equipment_overrides");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const fetchEquipmentOverrides = useCallback(() => {
    api.get("/public/equipment-overrides")
      .then(res => {
        if (Array.isArray(res.data)) {
          const map = {};
          res.data.forEach(item => {
            const raw = String(item.override_date || "").trim();
            let d = raw.substring(0, 10);
            if (raw.includes("T") && raw.length > 10) {
              const dt = new Date(raw);
              if (!isNaN(dt.getTime())) {
                const p = n => String(n).padStart(2, "0");
                d = `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
              }
            }
            if (d && (item.status === "closed" || item.status === "maintenance")) {
              map[d] = { ...item, override_date: d };
            }
          });
          setEquipmentOverrides(map);
          try {
            localStorage.setItem("fsuu_equipment_overrides", JSON.stringify(map));
          } catch { }
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetchEquipmentOverrides();
    const handleUpdate = () => fetchEquipmentOverrides();
    window.addEventListener("equipment_availability_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("equipment_availability_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [fetchEquipmentOverrides]);

  const todayOverride = equipmentOverrides[todayISO];
  const isTodayMaintenance = (todayOverride?.status || "").toLowerCase() === "maintenance";
  const isTodayClosed = (todayOverride?.status || "").toLowerCase() === "closed";
  const isTodayBlocked = isTodayMaintenance || isTodayClosed;

  const tomorrowOverride = equipmentOverrides[tomorrowISO];
  const isTomorrowMaintenance = (tomorrowOverride?.status || "").toLowerCase() === "maintenance";
  const isTomorrowClosed = (tomorrowOverride?.status || "").toLowerCase() === "closed";
  const isTomorrowBlocked = isTomorrowMaintenance || isTomorrowClosed;

  // Check if current real-time is past today's operating hours close or before opening
  const now = new Date();
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isPastClosingToday = currentHHMM >= kioskClose || currentHHMM < kioskOpen;

  // Determine initial borrow date mode (always start with today unless it's past operating hours AND today is not blocked)
  const initialDateMode = (isPastClosingToday && !isTodayBlocked && !isTomorrowBlocked) ? "tomorrow" : "today";
  const [borrowDateMode, setBorrowDateMode] = useState(initialDateMode);

  const activeBorrowDate = borrowDateMode === "tomorrow" ? tomorrowISO : todayISO;
  const activeOverride = equipmentOverrides[activeBorrowDate];
  const isActiveMaintenance = (activeOverride?.status || "").toLowerCase() === "maintenance";
  const isActiveClosed = (activeOverride?.status || "").toLowerCase() === "closed";
  const isActiveBlocked = isActiveMaintenance || isActiveClosed;

  // Dynamically calculate reopen info: earliest upcoming date/time when equipment is available
  const reopenInfo = useMemo(() => {
    if (!activeOverride) return null;
    const rawEnd = (activeOverride.end_time || activeOverride.endTime || kioskClose || "17:00").substring(0, 5);
    const rawClose = (kioskClose || "17:00").substring(0, 5);
    const rawOpen = (kioskOpen || "07:30").substring(0, 5);
    const isPartial = rawEnd < rawClose;

    if (isPartial) {
      const parts = activeBorrowDate.split("-").map(Number);
      const dObj = new Date(parts[0], parts[1] - 1, parts[2]);
      const dateFormatted = dObj.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      return {
        dateFormatted,
        timeFormatted: formatTime12(rawEnd),
        displayText: `${dateFormatted} at ${formatTime12(rawEnd)}`,
      };
    }

    // Full-day block: find earliest upcoming date from activeBorrowDate where equipment is available
    let cur = new Date(activeBorrowDate + "T00:00:00");
    for (let i = 1; i <= 60; i++) {
      cur.setDate(cur.getDate() + 1);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${d}`;
      const ov = equipmentOverrides[iso];
      if (!ov || (ov.status !== "maintenance" && ov.status !== "closed")) {
        const dateFormatted = cur.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric"
        });
        return {
          dateFormatted,
          timeFormatted: formatTime12(rawOpen),
          displayText: `${dateFormatted} at ${formatTime12(rawOpen)}`,
        };
      }
    }

    return {
      dateFormatted: "a later date",
      timeFormatted: formatTime12(rawOpen),
      displayText: "a later date",
    };
  }, [activeBorrowDate, activeOverride, equipmentOverrides, kioskOpen, kioskClose]);

  const defaultStart = isPastClosingToday || borrowDateMode === "tomorrow" ? kioskOpen : (currentHHMM > kioskOpen && currentHHMM < kioskClose ? currentHHMM : kioskOpen);
  const defaultEnd = kioskClose;
  const startTimeVal = getTimePart(startTime, defaultStart);
  const endTimeVal = getTimePart(endTime, defaultEnd);

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

  // Dedicated Under Maintenance / Closed Screen when equipment borrowing is blocked
  if (isActiveBlocked) {
    const blockInfo = getEquipmentBlockInfo(activeOverride, activeBorrowDate, equipmentOverrides, kioskOpen, kioskClose) || {
      prefixText: isActiveMaintenance
        ? "Sorry the Borrowing is Under on Maintenance."
        : "Sorry the Borrowing Equipment Are Closed.",
      reopenDate: reopenInfo?.dateFormatted || "Upcoming date",
      reopenTime: reopenInfo?.timeFormatted || "Opening time",
      displayText: reopenInfo?.displayText || "Upcoming available date",
    };

    return (
      <div className="p-4 sm:p-6 md:p-8 animate-in fade-in duration-300 max-w-4xl mx-auto space-y-6">
        {/* Primary Blocking Notice Card */}
        <div className={`relative overflow-hidden rounded-[32px] border-2 p-6 sm:p-10 text-center shadow-xl backdrop-blur-xs transition-all ${isActiveMaintenance
          ? "border-amber-400/80 bg-gradient-to-b from-amber-50/90 via-amber-50/30 to-white dark:from-amber-950/40 dark:via-[#111827] dark:to-[#111827] shadow-amber-500/10"
          : "border-rose-400/80 bg-gradient-to-b from-rose-50/90 via-rose-50/30 to-white dark:from-rose-950/40 dark:via-[#111827] dark:to-[#111827] shadow-rose-500/10"
          }`}>
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-wider mb-6 shadow-2xs border">
            {isActiveMaintenance ? (
              <span className="bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Under Maintenance
              </span>
            ) : (
              <span className="bg-rose-500/15 border-rose-500/30 text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                Equipment Borrowing Closed
              </span>
            )}
          </div>

          {/* Icon Hero Graphic */}
          <div className="mb-6 flex justify-center">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center shadow-lg transition-transform hover:scale-105 ${isActiveMaintenance
              ? "bg-amber-500 text-white shadow-amber-500/30 ring-8 ring-amber-100 dark:ring-amber-950/60"
              : "bg-rose-600 text-white shadow-rose-600/30 ring-8 ring-rose-100 dark:ring-rose-950/60"
              }`}>
              {isActiveMaintenance ? <Wrench size={42} className="stroke-[2.2]" /> : <ShieldAlert size={42} className="stroke-[2.2]" />}
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
            {isActiveMaintenance ? "Equipment Borrowing Under Maintenance" : "Equipment Borrowing is Closed"}
          </h2>

          {/* Exact Required Notice Message - Centered & Clean Two-Line Alignment */}
          <div className="max-w-2xl mx-auto mb-6 text-center space-y-1.5">
            <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-snug">
              {blockInfo.prefixText}
            </p>
            <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 leading-snug">
              Come back at <span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{blockInfo.reopenDate}</span> at <span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{blockInfo.reopenTime}</span>.
            </p>
          </div>

          {/* Optional Admin Reason/Notes */}
          {(activeOverride?.notes || activeOverride?.reason) && (
            <div className="mb-6 max-w-lg mx-auto p-3.5 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-700 dark:text-slate-300 font-medium text-left flex items-start gap-2.5 shadow-2xs">
              <AlertCircle size={16} className={`shrink-0 mt-0.5 ${isActiveMaintenance ? "text-amber-600" : "text-rose-600"}`} />
              <div>
                <span className="font-extrabold text-slate-900 dark:text-white block mb-0.5">Notice:</span>
                <span>{activeOverride.notes || activeOverride.reason}</span>
              </div>
            </div>
          )}

          {/* Metadata pill container */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left mb-8">
            <div className="p-3.5 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Schedule Date</span>
              <span className="text-xs font-black text-slate-900 dark:text-white mt-1 block">
                {formattedDisplayDate}
              </span>
            </div>
            <div className="p-3.5 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operating Hours</span>
              <span className="text-xs font-black text-slate-900 dark:text-white mt-1 block">
                {formatTime12(kioskOpen)} – {formatTime12(kioskClose)}
              </span>
            </div>
            <div className="p-3.5 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expected Return/Reopen</span>
              <span className="text-xs font-black text-slate-900 dark:text-white mt-1 block leading-tight">
                {blockInfo.displayText || reopenInfo?.displayText || "Upcoming available date"}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {/* Primary Back Button to Home Page */}
            <Button
              type="button"
              onClick={() => navigate("/")}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-7 py-3 rounded-full font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer transition-all"
            >
              <Home size={15} />
              <span>Back to Home Page</span>
            </Button>

            {/* Back to Step 1 (Role Selection) */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onBack && onBack()}
              className="w-full sm:w-auto text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-xs py-3 px-5 rounded-full flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft size={15} />
              <span>Change Role</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 md:p-8 animate-in slide-in-from-top-2 duration-300">
      {/* Section Header with Search Bar aligned to the right */}
      <div className="mb-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-slate-900 text-xl tracking-tight mb-1">Select Equipment</h3>
          <p className="text-xs text-slate-500 font-medium">Walk-in physical custody & equipment requisition</p>
        </div>

        {/* Equipment Search Bar aligned to the right side */}
        <div className="relative w-full sm:w-80 md:w-96">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search equipment"
            value={equipSearch}
            onChange={(e) => {
              setEquipSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-full text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Main Grid: Left 2x2 Catalog + Right Same-Day Time Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left Column: Equipment Catalog (2x2 Grid) */}
        <div className="lg:col-span-7 sm:col-span-12 space-y-4">
          {catalogLoading && (filteredCatalog || []).length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
              <Loader2 size={32} className="mx-auto text-blue-600 animate-spin" />
              <p className="text-xs font-bold text-slate-700">Loading equipment inventory...</p>
              <p className="text-[11px] text-slate-400">Loading live stock availability</p>
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
                      if (isAvailable && !isActiveBlocked) handleEquipmentToggle(item.id);
                    }}
                    className={`relative border rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between overflow-hidden ${isActiveBlocked
                      ? "border-slate-200 bg-slate-50/50 dark:bg-card/50 opacity-60 cursor-not-allowed shadow-none"
                      : isMaintenance
                        ? "border-amber-300/80 bg-amber-50/20 opacity-90 cursor-not-allowed shadow-2xs"
                        : !isAvailable
                          ? "border-slate-200 bg-white dark:bg-card opacity-90 cursor-pointer"
                          : isChecked
                            ? "border-blue-600 bg-white dark:bg-card shadow-md ring-2 ring-blue-500/20 cursor-pointer"
                            : "border-slate-200 dark:border-border bg-white dark:bg-card hover:border-blue-500/60 hover:shadow-xs cursor-pointer"
                      }`}
                  >
                    <div>
                      {/* Top Image Box: Syncs with Public View Card Preview in Category Settings */}
                      <div className={`w-full aspect-video bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden flex flex-col items-center justify-center text-center relative group shadow-2xs ${
                        item?.photo_fit === "cover" ? "p-0" : "p-2"
                      }`}>
                        <CategoryItemImage item={item} />
                      </div>

                      {/* Equipment Metadata */}
                      <div className="mt-3.5 space-y-1">
                        <h4 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-sm leading-tight truncate" title={item.name}>{item.name}</h4>
                        <div className="pt-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${remainingAvailable === 0
                            ? "bg-amber-500/15 border border-amber-400/30 text-amber-700 dark:text-[#FCD34D]"
                            : "bg-emerald-500/15 border border-emerald-400/30 text-emerald-700 dark:text-[#6EE7B7]"
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${remainingAvailable === 0 ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
                            {remainingAvailable} Available Now
                          </span>
                        </div>
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
                disabled={safeCurrentPage <= 1}
                className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <span className="text-xs font-black text-slate-700 px-2">
                {safeCurrentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Walk-In / Same-Day & Next-Day Schedule Controls */}
        <div className="lg:col-span-5 sm:col-span-12 space-y-4 relative z-10 mt-4 lg:mt-0">
          <div className="bg-white dark:bg-[#111C38] p-5 rounded-[28px] border border-slate-200/90 dark:border-[#1E2D56] shadow-md space-y-4 static lg:sticky lg:top-24 z-10">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-xs uppercase tracking-wider">
                Borrow Schedule
              </h4>
            </div>

            {/* Date Selection Mode (Today vs Tomorrow) */}
            <div className="space-y-1.5">
              <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setBorrowDateMode("today")}
                  disabled={isPastClosingToday || (isTodayBlocked && !isTomorrowBlocked && borrowDateMode === "tomorrow")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${borrowDateMode === "today"
                    ? (isTodayMaintenance
                      ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shadow-2xs"
                      : isTodayClosed
                        ? "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 shadow-2xs"
                        : "bg-white dark:bg-[#18264B] text-blue-600 dark:text-[#93C5FD] shadow-2xs")
                    : (isPastClosingToday)
                      ? "text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-[#F8FAFC] cursor-pointer"
                    }`}
                >
                  Today {isTodayMaintenance ? "(Maintenance)" : isTodayClosed ? "(Closed)" : ""}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if ((!isPortal && !isPastClosingToday && !isTodayBlocked) || isTomorrowBlocked) return;
                    setBorrowDateMode("tomorrow");
                  }}
                  disabled={((!isPortal && !isPastClosingToday && !isTodayBlocked) || isTomorrowBlocked)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition-all ${borrowDateMode === "tomorrow"
                    ? (isTomorrowMaintenance
                      ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shadow-2xs"
                      : isTomorrowClosed
                        ? "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 shadow-2xs"
                        : "bg-white dark:bg-[#18264B] text-blue-600 dark:text-[#93C5FD] shadow-2xs")
                    : ((!isPortal && !isPastClosingToday && !isTodayBlocked) || isTomorrowBlocked)
                      ? "text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-[#F8FAFC] cursor-pointer"
                    }`}
                  title={
                    isTomorrowMaintenance
                      ? "Tomorrow is under maintenance for equipment borrowing"
                      : isTomorrowClosed
                        ? "Tomorrow is closed for equipment borrowing"
                        : (!isPortal && !isPastClosingToday && !isTodayBlocked)
                          ? `Tomorrow's borrowing is only available after operating hours end (${formatTime12(kioskClose)})`
                          : "Next-Day Borrowing"
                  }
                >
                  Tomorrow {isTomorrowMaintenance ? "(Maintenance)" : isTomorrowClosed ? "(Closed)" : ""}
                </button>
              </div>

              {isActiveMaintenance ? (
                <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl flex items-start gap-2 text-xs text-amber-950 dark:text-amber-200 font-bold leading-relaxed">
                  <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Sorry the Borrowing is Under on Maintenance. Come back at <span className="whitespace-nowrap">{reopenInfo?.displayText || "a later date"}</span>.
                  </span>
                </div>
              ) : isActiveClosed ? (
                <div className="p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 rounded-xl flex items-start gap-2 text-xs text-rose-900 dark:text-rose-200 font-bold leading-relaxed">
                  <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>Sorry the Borrowing Equipment Are Closed. Come back at <span className="whitespace-nowrap">{reopenInfo?.displayText || "a later date"}</span>.</span>
                </div>
              ) : isPastClosingToday ? (
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-700/60 rounded-xl flex items-start gap-2 text-xs text-amber-900 dark:text-[#FCD34D] font-bold leading-relaxed">
                  <AlertCircle size={15} className="text-amber-600 dark:text-[#FCD34D] shrink-0 mt-0.5" />
                  <span>Today borrowing is closed. Reservation is automatically set for tomorrow ({formattedDisplayDate}).</span>
                </div>
              ) : (
                <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl text-[11px] text-blue-900 dark:text-[#93C5FD] font-medium leading-relaxed flex items-center justify-between">
                  <span>Today walk-in borrowing active</span>
                  <span className="text-[10px] font-bold text-blue-700 dark:text-[#93C5FD] bg-white dark:bg-[#111C38] px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800" title="Next-day reservation unlocks once today's operating hours end">
                    Next-day unlocks at {formatTime12(kioskClose)}
                  </span>
                </div>
              )}
            </div>

            {/* Time Settings */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-800 dark:text-[#CBD5E1] block">
                  Start
                </label>
                <CustomTimePicker
                  value={startTimeVal}
                  onChange={(newStartTime) => {
                    setStartTime && setStartTime(`${activeBorrowDate}T${newStartTime}`);
                    // Ensure end time is at least 1 hour after start time
                    const [sh, sm] = (newStartTime || "08:00").split(":").map(Number);
                    const [eh, em] = (endTimeVal || "17:00").split(":").map(Number);
                    const startMins = (sh || 0) * 60 + (sm || 0);
                    const endMins = (eh || 0) * 60 + (em || 0);
                    if (endMins <= startMins) {
                      const newEndMins = Math.min(1439, startMins + 60);
                      const nH = String(Math.floor(newEndMins / 60)).padStart(2, '0');
                      const nM = String(newEndMins % 60).padStart(2, '0');
                      setEndTime && setEndTime(`${activeBorrowDate}T${nH}:${nM}`);
                    }
                  }}
                  minuteStep={5}
                  align="left"
                  dropUp
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-800 dark:text-[#CBD5E1] block">
                  End
                </label>
                <CustomTimePicker
                  value={endTimeVal}
                  onChange={(newEndTime) => {
                    setEndTime && setEndTime(`${activeBorrowDate}T${newEndTime}`);
                  }}
                  minuteStep={5}
                  align="left"
                  dropUp
                />
              </div>

              {endTimeVal <= startTimeVal && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-xs font-bold text-rose-800 dark:text-[#FCA5A5] flex items-center gap-2">
                  <AlertTriangle size={15} className="text-rose-600 dark:text-[#FCA5A5] shrink-0" />
                  <span>Expected return time ({formatTime12(endTimeVal)}) cannot be earlier than or equal to start time ({formatTime12(startTimeVal)}).</span>
                </div>
              )}

              {borrowDateMode === "today" && isPastTimeToday(todayISO, startTimeVal) && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-xs font-bold text-rose-800 dark:text-[#FCA5A5] flex items-center gap-2">
                  <AlertTriangle size={15} className="text-rose-600 dark:text-[#FCA5A5] shrink-0" />
                  <span>Selected start time ({formatTime12(startTimeVal)}) has already passed for today. Please select a future time slot or reserve for tomorrow.</span>
                </div>
              )}

              {/* Extended Multi-day Return for Portal Mode */}
              {isPortal && (
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-900 dark:text-[#CBD5E1] flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wishesToExtend}
                        onChange={(e) => {
                          setWishesToExtend && setWishesToExtend(e.target.checked);
                          if (!e.target.checked) {
                            setEndTime && setEndTime(`${activeBorrowDate}T${endTimeVal}`);
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Allow Extended Multi-Day Return</span>
                    </label>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-200 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200">
                      Portal Mode
                    </span>
                  </div>
                  {wishesToExtend && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">Target Return Date</label>
                      <CustomCalendarPicker
                        minDate={activeBorrowDate}
                        value={endTime ? endTime.split("T")[0] : activeBorrowDate}
                        onChange={(newEndDate) => {
                          setEndTime && setEndTime(`${newEndDate}T${endTimeVal}`);
                        }}
                        triggerClassName="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Operating Hours Notice Banner */}
            {(() => {
              const isOutside = startTimeVal < kioskOpen || endTimeVal > kioskClose;

              if (isOutside) {
                if (isPortal) {
                  return (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">
                          Outside Operating Hours ({formatTime12(kioskOpen)} – {formatTime12(kioskClose)})
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-normal leading-relaxed">
                        Selected borrowing/return time ({formatTime12(startTimeVal)} – {formatTime12(endTimeVal)}) is outside operating hours. Verification PIN is required for authorization.
                      </p>
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
                                  title: "Outside Operating Hours PIN",
                                  description: `Selected borrowing time (${formatTime12(startTimeVal)} - ${formatTime12(endTimeVal)}) is outside operating hours (${formatTime12(kioskOpen)} - ${formatTime12(kioskClose)}). Verification PIN is required.`,
                                });
                              }
                              setShowPinModal && setShowPinModal(true);
                            }}
                            className="w-full py-2 px-3 rounded-lg border border-blue-600 bg-blue-50/70 hover:bg-blue-600 text-blue-700 hover:text-white active:bg-blue-700 font-semibold text-xs transition-all cursor-pointer text-center shadow-2xs"
                          >
                            Verify PIN
                          </button>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1 mt-2">
                      <div className="flex items-center gap-1.5 font-bold text-rose-900">
                        <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                        <span>Outside Operating Hours</span>
                      </div>
                      <p className="text-[11px] font-semibold text-rose-700 leading-snug">
                        Must be schedule within Operating Hours [ {formatTime12(kioskOpen)} - {formatTime12(kioskClose)} ].
                      </p>
                    </div>
                  );
                }
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
          className="border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs py-3 px-4 sm:px-5 rounded-full cursor-pointer flex items-center gap-1.5 shrink-0"
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
          const isDateBlocked = isActiveBlocked;

          return (
            <div className="flex flex-col items-end gap-1">
              <Button
                type="button"
                disabled={
                  !selectedItems ||
                  selectedItems.length === 0 ||
                  isPastSlot ||
                  isDateBlocked ||
                  endTimeVal <= startTimeVal ||
                  isBlocked
                }
                onClick={handleEquipmentSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 sm:px-7 py-3 rounded-full font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
              >
                <span className="sm:hidden">Next Step ({totalSelectedCount})</span>
                <span className="hidden sm:inline">Next: Fill Details ({totalSelectedCount} items selected)</span>
                <ChevronRight size={16} />
              </Button>
              {isPortal && isBlocked && !isPinVerified ? (
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
