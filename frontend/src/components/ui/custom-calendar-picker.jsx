import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon } from "lucide-react";

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (n) => String(n).padStart(2, "0");

const toDateString = (year, month, day) => {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
};

const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/**
 * CalendarHeader
 * Reusable header with `< [Month ⌵]  [Year ⌵] >` quick jump drop-downs.
 */
export function CalendarHeader({
  currentMonth,
  currentYear,
  onPrevMonth,
  onNextMonth,
  onSelectMonth,
  onSelectYear,
  yearOptions,
  theme = "dark",
  className = "",
}) {
  const [isMonthSelectOpen, setIsMonthSelectOpen] = useState(false);
  const [isYearSelectOpen, setIsYearSelectOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setIsMonthSelectOpen(false);
        setIsYearSelectOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const years = useMemo(() => {
    if (yearOptions && yearOptions.length > 0) return yearOptions;
    const baseYear = new Date().getFullYear();
    const list = [];
    for (let y = baseYear - 3; y <= baseYear + 10; y++) {
      list.push(y);
    }
    return list;
  }, [yearOptions]);

  const isDark = theme === "dark";

  return (
    <div ref={headerRef} className={`flex items-center justify-between px-1 mb-4 relative z-20 ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsMonthSelectOpen(false);
          setIsYearSelectOpen(false);
          onPrevMonth && onPrevMonth(e);
        }}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
          isDark
            ? "hover:bg-slate-800/80 text-slate-400 hover:text-white"
            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700"
        }`}
        aria-label="Previous month"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="flex items-center space-x-1 sm:space-x-2">
        {/* Month Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsYearSelectOpen(false);
              setIsMonthSelectOpen((prev) => !prev);
            }}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
              isDark
                ? "text-white hover:bg-slate-800/70"
                : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span>{MONTH_NAMES[currentMonth]}</span>
            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform duration-200 ${
                isMonthSelectOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isMonthSelectOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-44 bg-[#1a1d24] border border-slate-700/80 rounded-2xl shadow-xl p-2 grid grid-cols-3 gap-1 z-50">
              {MONTH_NAMES.map((m, idx) => (
                <button
                  key={m}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMonth && onSelectMonth(idx);
                    setIsMonthSelectOpen(false);
                  }}
                  className={`text-xs font-semibold py-1.5 px-2 rounded-lg transition-colors cursor-pointer text-center ${
                    idx === currentMonth
                      ? "bg-white text-black font-black"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Year Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMonthSelectOpen(false);
              setIsYearSelectOpen((prev) => !prev);
            }}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
              isDark
                ? "text-white hover:bg-slate-800/70"
                : "text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <span>{currentYear}</span>
            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform duration-200 ${
                isYearSelectOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isYearSelectOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-36 max-h-48 overflow-y-auto bg-[#1a1d24] border border-slate-700/80 rounded-2xl shadow-xl p-2 flex flex-col gap-1 z-50 custom-scrollbar">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectYear && onSelectYear(y);
                    setIsYearSelectOpen(false);
                  }}
                  className={`text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors cursor-pointer text-left ${
                    y === currentYear
                      ? "bg-white text-black font-black"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsMonthSelectOpen(false);
          setIsYearSelectOpen(false);
          onNextMonth && onNextMonth(e);
        }}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
          isDark
            ? "hover:bg-slate-800/80 text-slate-400 hover:text-white"
            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700"
        }`}
        aria-label="Next month"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

/**
 * CustomCalendarPicker
 * Sleek, modern calendar component with quick Month/Year drop-downs,
 * trailing/leading days, today pills, and capsule active states.
 */
export default function CustomCalendarPicker({
  value = "",
  endDate = "",
  isMultiDay = false,
  onChange,
  onRangeChange,
  minDate = "",
  maxDate = "",
  inline = false,
  getDayStatus,
  isDateDisabled,
  placeholder = "Select date",
  className = "",
  triggerClassName = "",
  popoverAlign = "left",
  title = "",
}) {
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  // Parse initial view year and month
  const todayStr = useMemo(() => getTodayString(), []);

  const parsedActiveDate = useMemo(() => {
    const target = value || minDate || todayStr;
    const parts = String(target).split("-");
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(y) && !isNaN(m)) return { year: y, month: m };
    }
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [value, minDate, todayStr]);

  const [currentYear, setCurrentYear] = useState(parsedActiveDate.year);
  const [currentMonth, setCurrentMonth] = useState(parsedActiveDate.month);

  // Sync view when value changes from outside
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [yStr, mStr] = value.split("-");
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      if (!isNaN(y) && !isNaN(m)) {
        setCurrentYear(y);
        setCurrentMonth(m);
      }
    }
  }, [value]);

  // Click outside listener for popover mode
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (!inline) setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inline]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Calendar math: generate grid days including trailing and leading days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
    const daysInCurrMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];

    // 1. Trailing days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = toDateString(prevYear, prevMonthIdx, d);
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isPrev: true,
      });
    }

    // 2. Days in current month
    for (let d = 1; d <= daysInCurrMonth; d++) {
      const dateStr = toDateString(currentYear, currentMonth, d);
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
      });
    }

    // 3. Leading days for next month to complete the row / 35-42 grid
    const totalSlots = cells.length <= 35 ? 35 : 42;
    const remaining = totalSlots - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = toDateString(nextYear, nextMonthIdx, d);
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isNext: true,
      });
    }

    return cells;
  }, [currentYear, currentMonth]);

  const handleDayClick = (cell) => {
    const dateStr = cell.dateStr;

    // If day is outside current month, auto-switch month view
    if (cell.isPrev) {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear((y) => y - 1);
      } else {
        setCurrentMonth((m) => m - 1);
      }
    } else if (cell.isNext) {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear((y) => y + 1);
      } else {
        setCurrentMonth((m) => m + 1);
      }
    }

    if (isDateDisabled && isDateDisabled(dateStr)) {
      return;
    }

    if (minDate && dateStr < minDate) {
      return;
    }

    if (maxDate && dateStr > maxDate) {
      return;
    }

    if (isMultiDay && onRangeChange) {
      onRangeChange(dateStr);
    } else if (onChange) {
      onChange(dateStr);
    }

    if (!inline && !isMultiDay) {
      setIsOpen(false);
    }
  };

  // Format trigger label
  const formattedDisplay = useMemo(() => {
    if (!value) return placeholder;
    const parts = value.split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return `${MONTH_NAMES[m]} ${d}, ${y}`;
      }
    }
    return value;
  }, [value, placeholder]);

  // Calendar Card Content
  const calendarContent = (
    <div className="w-[320px] max-w-full bg-[#121417] dark:bg-[#0f1115] text-slate-100 p-4 rounded-3xl border border-slate-800/80 shadow-2xl select-none font-sans relative">
      {/* Calendar Header: < [Oct ⌵] [2026 ⌵] > */}
      <CalendarHeader
        currentMonth={currentMonth}
        currentYear={currentYear}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onSelectMonth={(m) => setCurrentMonth(m)}
        onSelectYear={(y) => setCurrentYear(y)}
        theme="dark"
      />

      {/* Weekday headers: Su Mo Tu We Th Fr Sa */}
      <div className="grid grid-cols-7 mb-2 text-center text-xs font-semibold text-slate-400">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Day Grid */}
      <div className="grid grid-cols-7 gap-y-1.5 text-center text-sm font-medium">
        {calendarDays.map((cell, idx) => {
          const dateStr = cell.dateStr;
          const isToday = dateStr === todayStr;
          const isSelected = value === dateStr;

          // Range calculation if multi-day is on
          const isStart = isMultiDay && value === dateStr;
          const isEnd = isMultiDay && (endDate || value) === dateStr;
          const hasRange = Boolean(isMultiDay && endDate && endDate > value);
          const isInRange = hasRange && dateStr > value && dateStr < endDate;

          // Day custom status from parent callback (e.g. booked, maintenance, closed)
          const customStatus = getDayStatus ? getDayStatus(dateStr) : null;
          const isCustomDisabled = isDateDisabled ? isDateDisabled(dateStr) : false;
          const isPastMin = minDate && dateStr < minDate;
          const isBeyondMax = maxDate && dateStr > maxDate;
          const isDisabled = isCustomDisabled || isPastMin || isBeyondMax || customStatus?.disabled;

          // Day cell class generation
          let cellStyle = "text-slate-200 hover:bg-slate-800/60";

          if (!cell.isCurrentMonth) {
            cellStyle = "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30";
          }

          if (isDisabled) {
            cellStyle = "text-slate-600 opacity-40 cursor-not-allowed line-through";
          } else if (isStart || isSelected || isEnd) {
            // Active Selected Capsule (matches screenshot: white capsule with dark text)
            cellStyle = "bg-white text-black font-black rounded-2xl shadow-lg ring-2 ring-white/40 cursor-pointer z-10";
          } else if (isInRange) {
            cellStyle = "bg-blue-600/30 text-blue-200 font-bold rounded-none cursor-pointer";
          } else if (isToday) {
            // Today indicator: soft dark pill (matches screenshot 22 button)
            cellStyle = "bg-[#252830] text-slate-100 font-bold rounded-2xl hover:bg-[#2e323c] cursor-pointer";
          }

          // Override for maintenance / closed badges if defined in customStatus
          if (!isDisabled && !isSelected && !isStart && !isEnd && customStatus) {
            if (customStatus.status === "closed") {
              cellStyle += " text-rose-400";
            } else if (customStatus.status === "maintenance") {
              cellStyle += " text-amber-400";
            }
          }

          return (
            <div
              key={`${dateStr}-${idx}`}
              className={`relative h-10 flex items-center justify-center ${
                isInRange
                  ? "bg-blue-600/20"
                  : isStart && hasRange
                  ? "bg-blue-600/20 rounded-l-2xl"
                  : isEnd && hasRange
                  ? "bg-blue-600/20 rounded-r-2xl"
                  : ""
              }`}
            >
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => handleDayClick(cell)}
                className={`w-9 h-9 text-xs flex items-center justify-center transition-all ${cellStyle}`}
                title={customStatus?.reason || dateStr}
              >
                {cell.dayNumber}
              </button>

              {/* Status Dot indicator if parent provides customStatus and not selected */}
              {customStatus?.hasDot && !isSelected && !isStart && !isEnd && (
                <span
                  className={`absolute bottom-1 w-1 h-1 rounded-full ${
                    customStatus.dotColor || "bg-blue-400"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // If inline mode: render the calendar card directly
  if (inline) {
    return (
      <div ref={containerRef} className={`inline-block ${className}`}>
        {calendarContent}
      </div>
    );
  }

  // Popover mode (replaces native <input type="date">)
  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {title && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          {title}
        </label>
      )}

      {/* Popover trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-white text-xs hover:border-blue-500 dark:hover:border-blue-500 transition-colors shadow-2xs cursor-pointer ${triggerClassName}`}
      >
        <span className={value ? "text-slate-900 dark:text-white" : "text-slate-400"}>
          {formattedDisplay}
        </span>
        <CalendarIcon size={15} className="text-slate-400 dark:text-slate-500 shrink-0 ml-2" />
      </button>

      {/* Floating Popover Calendar */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 z-50 ${
            popoverAlign === "right" ? "right-0" : "left-0"
          } animate-in fade-in zoom-in-95 duration-150`}
        >
          {calendarContent}
        </div>
      )}
    </div>
  );
}
