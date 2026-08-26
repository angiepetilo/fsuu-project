/**
 * Date & Time Utility Helpers for Booking & Borrowing Validation
 */

export function getTodayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getCurrentHHMM() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isPastDate(dateStr) {
  if (!dateStr) return false;
  const todayStr = getTodayISO();
  return dateStr < todayStr;
}

export function isPastTimeToday(dateStr, timeStr) {
  if (!dateStr || !timeStr) return false;
  const todayStr = getTodayISO();
  if (dateStr !== todayStr) return false;
  const nowHHMM = getCurrentHHMM();
  return timeStr < nowHHMM;
}

export function isPastDateTime(dateStr, timeStr) {
  if (!dateStr) return false;
  if (isPastDate(dateStr)) return true;
  if (timeStr && isPastTimeToday(dateStr, timeStr)) return true;
  return false;
}

/**
 * Calculates how many minutes overdue an active event or borrowing is.
 * Returns 0 if not overdue, if scheduled end time is in the future, or invalid.
 */
export function getOverdueMinutes(dateStr, timeStr) {
  if (!dateStr || !timeStr) return 0;
  try {
    // 1. Extract clean Year, Month (1-12), Day
    let year, month, day;

    if (dateStr instanceof Date) {
      year = dateStr.getFullYear();
      month = dateStr.getMonth() + 1;
      day = dateStr.getDate();
    } else {
      const rawDateStr = String(dateStr).trim();
      // Handle UTC ISO format like "2026-08-27T00:00:00.000000Z"
      if (rawDateStr.includes("T") || rawDateStr.includes("Z") || rawDateStr.length > 10) {
        const d = new Date(rawDateStr);
        if (!isNaN(d.getTime())) {
          year = d.getFullYear();
          month = d.getMonth() + 1;
          day = d.getDate();
        }
      }
      
      // Fallback: extract YYYY-MM-DD
      if (!year) {
        const dateMatch = rawDateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (dateMatch) {
          year = parseInt(dateMatch[1], 10);
          month = parseInt(dateMatch[2], 10);
          day = parseInt(dateMatch[3], 10);
        }
      }
    }

    if (!year || !month || !day) return 0;

    // 2. Extract clean Hours & Minutes from time string
    let cleanTime = String(timeStr).trim();

    // If timeStr is a range like "08:00 AM – 10:00 AM" or "08:00 - 10:00", take the end time
    if (cleanTime.includes("–")) {
      cleanTime = cleanTime.split("–").pop().trim();
    } else if (cleanTime.includes(" - ")) {
      cleanTime = cleanTime.split(" - ").pop().trim();
    } else if (cleanTime.toLowerCase().includes(" to ")) {
      cleanTime = cleanTime.toLowerCase().split(" to ").pop().trim();
    }

    // If timeStr is a full ISO datetime like "2026-08-27T10:00:00"
    if (cleanTime.includes("T")) {
      cleanTime = cleanTime.split("T")[1].replace("Z", "").trim();
    } else if (cleanTime.includes(" ") && cleanTime.length > 11 && cleanTime.includes("-")) {
      cleanTime = cleanTime.split(" ")[1].trim();
    }

    let hours = 0;
    let minutes = 0;

    // Handle 12-hour AM/PM format (e.g. "10:00 AM", "05:00 PM")
    if (/am|pm/i.test(cleanTime)) {
      const isPM = /pm/i.test(cleanTime);
      const digitsOnly = cleanTime.replace(/[^0-9:]/g, "");
      const [h, m] = digitsOnly.split(":").map(Number);
      hours = Number(h || 0);
      minutes = Number(m || 0);
      if (isPM && hours < 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
    } else {
      // 24-hour format (e.g. "10:00:00" or "10:00")
      const parts = cleanTime.split(":").map(Number);
      hours = Number(parts[0] || 0);
      minutes = Number(parts[1] || 0);
    }

    // 3. Construct local Date object representing the exact scheduled end time
    const endDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    if (isNaN(endDateTime.getTime())) return 0;

    // 4. Compare with current client time
    const now = new Date();
    const diffMs = now.getTime() - endDateTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    return diffMins > 0 ? diffMins : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Format overdue minutes into a sleek, clean, plain string:
 * e.g. "35m overdue", "2h 15m overdue", "3d overdue"
 */
export function formatOverdueDuration(mins) {
  if (!mins || mins <= 0) return null;
  if (mins < 60) return `${mins}m overdue`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hrs < 24) {
    return remainingMins > 0 ? `${hrs}h ${remainingMins}m overdue` : `${hrs}h overdue`;
  }
  const days = Math.floor(hrs / 24);
  const remainingHrs = hrs % 24;
  return remainingHrs > 0 ? `${days}d ${remainingHrs}h overdue` : `${days}d overdue`;
}
