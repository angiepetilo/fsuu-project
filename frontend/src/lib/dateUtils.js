/**
 * Shared date & time formatting utilities.
 * Import from here instead of redefining in each page/component.
 */

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Formats a raw date string to "Aug 12, 2026" display format.
 * Accurately handles YYYY-MM-DD strings and ISO strings without UTC day shifts.
 * @param {string|null} rawDate
 * @returns {string}
 */
export const formatDate = (rawDate) => {
  if (!rawDate) return "—";
  const str = String(rawDate).trim();

  // If it's a date-only string like "2026-09-10" or starts with "2026-09-10" without time
  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|\s)/);
  if (ymdMatch && !str.includes("T")) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
      return `${MONTH_NAMES[month]} ${day}, ${year}`;
    }
  }

  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return String(rawDate);
    // Use Asia/Manila or system local timezone for ISO strings containing UTC offset
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    });
  } catch {
    return String(rawDate);
  }
};

/**
 * Converts a 24-hour time string "HH:MM" to "08:00 AM" format.
 * @param {string|null} timeStr
 * @returns {string}
 */
export const formatTime = (timeStr) => {
  if (!timeStr) return "08:00 AM";
  if (String(timeStr).includes("AM") || String(timeStr).includes("PM")) return timeStr;
  const parts = String(timeStr).split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

/**
 * Same as formatTime but also handles ISO datetime strings (extracts time part first).
 * @param {string|null} timeStr
 * @returns {string}
 */
export const formatTime12 = (timeStr) => {
  if (!timeStr) return "08:00 AM";
  const str = String(timeStr).trim();
  if (str.includes("AM") || str.includes("PM")) return str;
  if (str.includes("T") || (str.includes(" ") && str.length > 10)) {
    try {
      const d = new Date(str.replace(" ", "T"));
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      }
    } catch {}
  }
  const parts = str.split(":");
  if (parts.length < 2) return str;
  let hh = parseInt(parts[0], 10);
  const mm = parts[1].slice(0, 2);
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  return `${String(hh).padStart(2, "0")}:${mm} ${ampm}`;
};

/**
 * Alias for formatTime12
 */
export const formatRealTime = formatTime12;

/**
 * Formats a start/end time pair as "08:00 AM – 05:00 PM".
 * @param {string|null} start
 * @param {string|null} end
 * @returns {string}
 */
export const formatTimeRange = (start, end) => {
  if (!start && !end) return "08:00 AM – 05:00 PM";
  return `${formatTime(start)} – ${formatTime(end)}`;
};

/**
 * Same as formatTimeRange but extracts time portions from ISO strings first.
 * @param {string|null} start
 * @param {string|null} end
 * @returns {string}
 */
export const formatTimeRange12 = (start, end) => {
  if (!start && !end) return "08:00 AM – 05:00 PM";
  const extractTime = (s) => {
    if (!s) return "";
    if (s.includes("T")) return s.split("T")[1];
    if (s.includes(" ") && s.length > 10) return s.split(" ")[1];
    return s;
  };
  return `${formatTime12(extractTime(start))} – ${formatTime12(extractTime(end))}`;
};

/**
 * Formats a date range.
 * If start date and end date are the same (single day), returns only "Aug 26, 2026".
 * If different (multi-day), returns "Aug 26, 2026 — Aug 28, 2026".
 * @param {string|null} start
 * @param {string|null} end
 * @returns {string}
 */
export const formatDateRange = (start, end) => {
  if (!start && !end) return "—";

  const formattedStart = formatDate(start);
  const formattedEnd = end ? formatDate(end) : null;

  if (!formattedEnd || formattedEnd === "—" || formattedStart === formattedEnd) {
    return formattedStart;
  }
  return `${formattedStart} — ${formattedEnd}`;
};

/**
 * Formats date and time as "Aug 26, 2026 | 02:30 PM".
 * @param {string|null} dateStr
 * @returns {string}
 */
export const formatDateTime = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${datePart} | ${timePart}`;
  } catch {
    return String(dateStr);
  }
};

/**
 * Constructs the standard notice message when equipment borrowing is blocked
 * (Closed or Under Maintenance) on a single day or multi-day span.
 *
 * @param {object|null} override
 * @param {string} targetDateStr
 * @param {object} allOverrides
 * @returns {string|null}
 */
export const getEquipmentBlockInfo = (override, targetDateStr, allOverrides = {}, kioskOpen = "07:30", kioskClose = "17:00") => {
  if (!override) return null;
  const status = (override.status || "").toLowerCase();
  if (status !== "closed" && status !== "maintenance") return null;

  let startDateStr = override.range_start || override.startDate || targetDateStr;
  let endDateStr = override.range_end || override.endDate || targetDateStr;

  // Auto-detect contiguous date blocks with matching status if range not explicitly set
  if (startDateStr === endDateStr && allOverrides) {
    try {
      let s = new Date(targetDateStr + "T00:00:00");
      let e = new Date(targetDateStr + "T00:00:00");

      for (let i = 0; i < 30; i++) {
        const prev = new Date(s);
        prev.setDate(prev.getDate() - 1);
        const y = prev.getFullYear();
        const m = String(prev.getMonth() + 1).padStart(2, "0");
        const d = String(prev.getDate()).padStart(2, "0");
        const prevIso = `${y}-${m}-${d}`;
        if (allOverrides[prevIso] && (allOverrides[prevIso].status || "").toLowerCase() === status) {
          s = prev;
        } else {
          break;
        }
      }

      for (let i = 0; i < 30; i++) {
        const next = new Date(e);
        next.setDate(next.getDate() + 1);
        const y = next.getFullYear();
        const m = String(next.getMonth() + 1).padStart(2, "0");
        const d = String(next.getDate()).padStart(2, "0");
        const nextIso = `${y}-${m}-${d}`;
        if (allOverrides[nextIso] && (allOverrides[nextIso].status || "").toLowerCase() === status) {
          e = next;
        } else {
          break;
        }
      }

      const pad = (n) => String(n).padStart(2, "0");
      startDateStr = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
      endDateStr = `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}`;
    } catch {}
  }

  const isMultiDay = startDateStr !== endDateStr;
  const endOverride = (allOverrides && allOverrides[endDateStr]) || override;
  const rawEndTime = (endOverride.end_time || endOverride.endTime || override.end_time || override.endTime || "17:00").substring(0, 5);
  const rawKioskClose = (kioskClose || "17:00").substring(0, 5);
  const rawKioskOpen = (kioskOpen || "07:30").substring(0, 5);

  const formatDateLong = (dStr) => {
    try {
      const parts = (dStr || "").split("-").map(Number);
      if (parts.length < 3 || isNaN(parts[0])) return dStr;
      return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dStr;
    }
  };

  const formattedStart = formatDateLong(startDateStr);
  const formattedEnd = formatDateLong(endDateStr);

  // Partial-day check: if maintenance/closure ends before daily office closing time (e.g. 12:00 PM < 05:00 PM)
  const isPartialDay = rawEndTime < rawKioskClose;

  let reopenDateStr = endDateStr;
  let reopenTimeStr = rawEndTime;

  if (isPartialDay) {
    reopenDateStr = endDateStr;
    reopenTimeStr = rawEndTime;
  } else {
    // Full day block: find next available operating day
    let cur = new Date(endDateStr + "T00:00:00");
    let found = false;
    for (let i = 1; i <= 60; i++) {
      cur.setDate(cur.getDate() + 1);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${d}`;
      const ov = allOverrides && allOverrides[iso];
      if (!ov || (ov.status !== "maintenance" && ov.status !== "closed")) {
        reopenDateStr = iso;
        found = true;
        break;
      }
    }
    if (!found) {
      const cur2 = new Date(endDateStr + "T00:00:00");
      cur2.setDate(cur2.getDate() + 1);
      const pad = (n) => String(n).padStart(2, "0");
      reopenDateStr = `${cur2.getFullYear()}-${pad(cur2.getMonth() + 1)}-${pad(cur2.getDate())}`;
    }
    reopenTimeStr = rawKioskOpen;
  }

  const formattedReopenDate = formatDateLong(reopenDateStr);
  const formattedReopenTime = formatTime12(reopenTimeStr);

  const prefix = status === "closed"
    ? "Sorry the Borrowing Equipment Are Closed"
    : "Sorry the Borrowing is Under on Maintenance";

  const prefixText = isMultiDay
    ? `${prefix} from ${formattedStart} to ${formattedEnd}.`
    : `${prefix}.`;

  const reopenInstruction = `Come back at ${formattedReopenDate} at ${formattedReopenTime}.`;
  const fullMessage = `${prefixText} ${reopenInstruction}`;

  return {
    status,
    isMaintenance: status === "maintenance",
    isClosed: status === "closed",
    isMultiDay,
    formattedStart,
    formattedEnd,
    prefixText,
    reopenInstruction,
    reopenDate: formattedReopenDate,
    reopenTime: formattedReopenTime,
    displayText: `${formattedReopenDate} at ${formattedReopenTime}`,
    fullMessage,
  };
};

/**
 * Returns formatted block message string for equipment borrowing
 * @returns {string|null}
 */
export const getEquipmentBlockMessage = (override, targetDateStr, allOverrides = {}, kioskOpen = "07:30", kioskClose = "17:00") => {
  const info = getEquipmentBlockInfo(override, targetDateStr, allOverrides, kioskOpen, kioskClose);
  return info ? info.fullMessage : null;
};



