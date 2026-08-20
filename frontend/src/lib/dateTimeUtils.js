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
