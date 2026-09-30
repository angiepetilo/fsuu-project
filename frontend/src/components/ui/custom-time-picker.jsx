import React, { useState, useEffect, useRef } from "react";

/**
 * Parses a 24-hour time string ("HH:mm" or "HH:mm:ss") into 12-hour components.
 */
function parse24To12(timeStr) {
  if (!timeStr) {
    return { hour12: "08", minute: "00", period: "AM" };
  }
  const clean = String(timeStr).trim();
  const [hStr, mStr] = clean.split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) h = 8;
  let m = parseInt(mStr, 10);
  if (isNaN(m)) m = 0;

  const period = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;

  return {
    hour12: String(h12).padStart(2, "0"),
    minute: String(m).padStart(2, "0"),
    period,
  };
}

/**
 * Converts 12-hour components to a 24-hour "HH:mm" string.
 */
function format12To24(hour12Str, minuteStr, period) {
  let h = parseInt(hour12Str, 10);
  if (isNaN(h)) h = 12;
  const m = String(minuteStr || "00").padStart(2, "0");

  if (period === "AM") {
    if (h === 12) h = 0;
  } else {
    // PM
    if (h < 12) h += 12;
  }

  return `${String(h).padStart(2, "0")}:${m}`;
}

/**
 * Custom Time Picker with 5-minute increments (00, 05, 10, 15... 55)
 */
export default function CustomTimePicker({
  value = "08:00",
  onChange,
  minuteStep = 5,
  disabled = false,
  minTime,
  maxTime,
  align = "left",
  className = "",
  triggerClassName = "",
  id,
  dropUp = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(dropUp);
  const containerRef = useRef(null);

  const { hour12, minute, period } = parse24To12(value);

  // Auto-detect whether to open upward to prevent page overflow and redundant scroll
  useEffect(() => {
    if (dropUp) {
      setOpenUpward(true);
      return;
    }
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 280 && rect.top > 220) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen, dropUp]);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Generate hour options: 01 - 12
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

  // Generate minute options based on minuteStep (e.g. 00, 05, 10 ... 55)
  const minutes = [];
  for (let m = 0; m < 60; m += minuteStep) {
    minutes.push(String(m).padStart(2, "0"));
  }

  const handleSelectHour = (newHour) => {
    const next24 = format12To24(newHour, minute, period);
    if (onChange) onChange(next24);
  };

  const handleSelectMinute = (newMin) => {
    const next24 = format12To24(hour12, newMin, period);
    if (onChange) onChange(next24);
  };

  const handleSelectPeriod = (newPeriod) => {
    const next24 = format12To24(hour12, minute, newPeriod);
    if (onChange) onChange(next24);
  };

  const displayTime = `${hour12}:${minute} ${period}`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button - Plain Text, Flat Design, No Icon */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={
          triggerClassName ||
          `w-full px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-300 dark:border-slate-600 rounded-md cursor-pointer transition-colors text-left font-semibold text-xs text-slate-900 dark:text-slate-100 ${isOpen ? "border-blue-600 ring-1 ring-blue-600" : ""
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`
        }
      >
        <span>{displayTime}</span>
      </button>

      {/* 3-Column Floating Picker Popover - Flat Design */}
      {isOpen && (
        <div className={`absolute z-50 ${openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"} w-64 bg-white dark:bg-slate-900 rounded-md border border-slate-300 dark:border-slate-700 p-2.5 text-xs ${align === "right" ? "right-0" : "left-0"}`}>
          {/* Header Preview */}
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md mb-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Selected</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{hour12}:{minute} {period}</span>
          </div>

          {/* 3 Columns: Hour | Minute | Period */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
            {/* Column 1: Hour */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 pb-1 border-b border-slate-200 dark:border-slate-700 mb-1">
                Hour
              </div>
              <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {hours.map((h) => {
                  const isSelected = h === hour12;
                  return (
                    <button
                      key={`h-${h}`}
                      type="button"
                      onClick={() => handleSelectHour(h)}
                      className={`w-full py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${isSelected
                          ? "bg-blue-600 text-white"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Minute */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 pb-1 border-b border-slate-200 dark:border-slate-700 mb-1">
                Minute
              </div>
              <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {minutes.map((m) => {
                  const isSelected = m === minute;
                  return (
                    <button
                      key={`m-${m}`}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      className={`w-full py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${isSelected
                          ? "bg-blue-600 text-white"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 3: Period */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 pb-1 border-b border-slate-200 dark:border-slate-700 mb-1">
                Period
              </div>
              <div className="space-y-1 pt-1">
                {["AM", "PM"].map((p) => {
                  const isSelected = p === period;
                  return (
                    <button
                      key={`p-${p}`}
                      type="button"
                      onClick={() => handleSelectPeriod(p)}
                      className={`w-full py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${isSelected
                          ? "bg-blue-600 text-white"
                          : "text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                        }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
