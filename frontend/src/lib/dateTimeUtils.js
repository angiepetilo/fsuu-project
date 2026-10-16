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
 * Parse scheduled end datetime from any date and time string format.
 * Returns a valid local Date object or null if unparseable.
 */
export function parseScheduledEndDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
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

    if (!year || !month || !day) return null;

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
    return isNaN(endDateTime.getTime()) ? null : endDateTime;
  } catch (e) {
    return null;
  }
}

/**
 * Calculates how many minutes overdue an active event or borrowing is.
 * Returns 0 if not overdue, if scheduled end time is in the future, or invalid.
 */
export function getOverdueMinutes(dateStr, timeStr) {
  const endDateTime = parseScheduledEndDateTime(dateStr, timeStr);
  if (!endDateTime) return 0;
  const now = new Date();
  const diffMs = now.getTime() - endDateTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  return diffMins > 0 ? diffMins : 0;
}

/**
 * Determines whether a booking or equipment borrowing is eligible for post-event inspection.
 * Rule: Enabled starting 30 minutes before the scheduled end time (and remains enabled thereafter / overdue).
 * Disabled if current time is more than 30 minutes before the scheduled end time.
 *
 * @param {string|Date} dateStr - Scheduled end date or date of usage (e.g. reservation_end_date || date_of_usage)
 * @param {string} timeStr - Scheduled end time (e.g. time_end)
 * @param {number} [bufferMinutes=30] - Window before end time when inspection is allowed (default: 30)
 * @returns {{
 *   isReady: boolean,
 *   minutesUntilUnlock: number,
 *   unlockTimeStr: string,
 *   endTimeStr: string,
 *   endDateTime: Date | null,
 *   unlockDateTime: Date | null,
 *   reason: string
 * }}
 */
export function getInspectionEligibility(dateStr, timeStr, bufferMinutes = 30) {
  const endDateTime = parseScheduledEndDateTime(dateStr, timeStr);
  if (!endDateTime) {
    return {
      isReady: true,
      minutesUntilUnlock: 0,
      unlockTimeStr: "",
      endTimeStr: "",
      endDateTime: null,
      unlockDateTime: null,
      reason: "",
    };
  }

  const unlockDateTime = new Date(endDateTime.getTime() - bufferMinutes * 60 * 1000);
  const now = new Date();
  const diffToUnlockMs = unlockDateTime.getTime() - now.getTime();
  const isReady = diffToUnlockMs <= 0;
  const minutesUntilUnlock = isReady ? 0 : Math.ceil(diffToUnlockMs / 60000);

  const formatTime12h = (d) => {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  const isToday = unlockDateTime.toDateString() === now.toDateString();
  const unlockTimeStr = isToday
    ? formatTime12h(unlockDateTime)
    : `${unlockDateTime.toLocaleDateString([], { month: "short", day: "numeric" })} at ${formatTime12h(unlockDateTime)}`;

  const endTimeStr = isToday
    ? formatTime12h(endDateTime)
    : `${endDateTime.toLocaleDateString([], { month: "short", day: "numeric" })} at ${formatTime12h(endDateTime)}`;

  let reason = "";
  if (!isReady) {
    if (minutesUntilUnlock > 60) {
      const hrs = Math.floor(minutesUntilUnlock / 60);
      const remMins = minutesUntilUnlock % 60;
      const durStr = remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
      reason = `Available in ${durStr} (at ${unlockTimeStr}, 30 mins before end time)`;
    } else if (minutesUntilUnlock === 1) {
      reason = `Available in 1 minute (at ${unlockTimeStr})`;
    } else {
      reason = `Available in ${minutesUntilUnlock} minutes (at ${unlockTimeStr})`;
    }
  }

  return {
    isReady,
    minutesUntilUnlock,
    unlockTimeStr,
    endTimeStr,
    endDateTime,
    unlockDateTime,
    reason,
  };
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

/**
 * Format late minutes into readable time duration:
 * e.g. 59 -> "59m"
 *      60 -> "1h"
 *      69 -> "1h 9m"
 *      120 -> "2h"
 *      125 -> "2h 5m"
 */
export function formatTimeLate(mins) {
  const m = Math.round(Number(mins || 0));
  if (!m || m <= 0) return "—";
  if (m < 60) return `${m}m`;
  const hrs = Math.floor(m / 60);
  const remMins = m % 60;
  if (hrs < 24) {
    return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
  }
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  if (remHrs === 0 && remMins === 0) return `${days}d`;
  if (remMins === 0) return `${days}d ${remHrs}h`;
  if (remHrs === 0) return `${days}d ${remMins}m`;
  return `${days}d ${remHrs}h ${remMins}m`;
}

/**
 * Full verbose label for tooltips and modal details:
 * e.g. 59 -> "59 mins"
 *      60 -> "1 hour"
 *      69 -> "1 hour 9 mins"
 *      120 -> "2 hours"
 */
export function formatTimeLateFull(mins) {
  const m = Math.round(Number(mins || 0));
  if (!m || m <= 0) return "—";
  if (m < 60) return `${m} min${m === 1 ? '' : 's'}`;
  const hrs = Math.floor(m / 60);
  const remMins = m % 60;
  if (hrs < 24) {
    const hrText = `${hrs} hour${hrs === 1 ? '' : 's'}`;
    return remMins > 0 ? `${hrText} ${remMins} min${remMins === 1 ? '' : 's'}` : hrText;
  }
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  let text = `${days} day${days === 1 ? '' : 's'}`;
  if (remHrs > 0) text += ` ${remHrs} hour${remHrs === 1 ? '' : 's'}`;
  if (remMins > 0) text += ` ${remMins} min${remMins === 1 ? '' : 's'}`;
  return text;
}

