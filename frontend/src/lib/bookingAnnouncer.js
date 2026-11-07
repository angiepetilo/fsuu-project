import { notify } from "@/lib/notify";

// The same new booking can arrive up to three ways (Pusher, cross-tab storage ping,
// in-tab custom event). Each reference is announced once per minute.
const ANNOUNCE_WINDOW_MS = 60 * 1000;
const recentlyAnnounced = new Map();

/**
 * Shows the "New booking" toast once per reference code.
 *
 * @param {{type?: string, ref?: string, filer?: string, office?: string, place?: string}} booking
 * @returns {boolean} true when a toast was shown, false when it was a duplicate.
 */
export function announceNewBooking({ type, ref, filer, office, place } = {}) {
  const now = Date.now();
  for (const [key, time] of recentlyAnnounced) {
    if (now - time > ANNOUNCE_WINDOW_MS) recentlyAnnounced.delete(key);
  }

  const key = ref || `${type}|${filer}|${place}`;
  if (recentlyAnnounced.has(key)) return false;
  recentlyAnnounced.set(key, now);

  const title = type === "venue_booking" ? "New Venue Reservation" : "New Equipment Borrow";
  const details = [filer || "Applicant", office, place].filter(Boolean).join(" · ");
  notify.info(ref ? `${title} • ${ref}` : title, details);
  return true;
}
