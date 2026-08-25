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
 * Returns 0 if not overdue or invalid.
 */
export function getOverdueMinutes(dateStr, timeStr) {
  if (!dateStr || !timeStr) return 0;
  try {
    const cleanDate = typeof dateStr === "string" ? dateStr.substring(0, 10) : "";
    let cleanTime = typeof timeStr === "string" ? timeStr.trim() : "";
    if (!cleanDate || !cleanTime) return 0;

    // Handle 12-hour format "05:00 PM"
    if (cleanTime.includes(" ")) {
      const parts = cleanTime.split(/\s+/);
      let [h, m] = parts[0].split(":").map(Number);
      const mer = (parts[1] || "").toUpperCase();
      if (mer === "PM" && h < 12) h += 12;
      if (mer === "AM" && h === 12) h = 0;
      cleanTime = `${String(h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}:00`;
    } else if (cleanTime.length === 5) {
      cleanTime = `${cleanTime}:00`;
    }

    const endDateTime = new Date(`${cleanDate}T${cleanTime}`);
    if (isNaN(endDateTime.getTime())) return 0;

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
