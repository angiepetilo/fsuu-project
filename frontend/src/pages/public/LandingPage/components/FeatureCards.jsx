import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Info, Search, Building2, PackageOpen, Clock } from "lucide-react";
import api from "@/lib/axios";

const CACHE_KEY = "fsuu_operating_hours_cache";

export default function FeatureCards() {
  const [schedules, setSchedules] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached && cached.venue && cached.equipment) {
        return cached;
      }
    } catch {}
    return { venue: null, equipment: null };
  });

  useEffect(() => {
    api.get("/public/operating-hours")
      .then((res) => {
        const d = res?.data;
        if (!d) return;

        const format12 = (tStr) => {
          if (!tStr) return "";
          const [h, m] = tStr.split(":").map(Number);
          const ampm = h >= 12 ? "PM" : "AM";
          const h12 = h % 12 || 12;
          return `${h12}:${String(m || 0).padStart(2, "0")} ${ampm}`;
        };

        const vSched = (d.venue_open_12 && d.venue_close_12)
          ? `${d.venue_open_12} – ${d.venue_close_12}`
          : (d.venue_open && d.venue_close ? `${format12(d.venue_open)} – ${format12(d.venue_close)}` : "7:30 AM – 5:00 PM");

        const eqSched = (d.equipment_open_12 && d.equipment_close_12)
          ? `${d.equipment_open_12} – ${d.equipment_close_12}`
          : (d.equipment_open && d.equipment_close ? `${format12(d.equipment_open)} – ${format12(d.equipment_close)}` : "7:30 AM – 5:00 PM");

        const updated = { venue: vSched, equipment: eqSched };
        setSchedules(updated);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        } catch {}
      })
      .catch(() => {
        setSchedules((prev) => ({
          venue: prev.venue || "7:30 AM – 5:00 PM",
          equipment: prev.equipment || "7:30 AM – 5:00 PM",
        }));
      });
  }, []);

  return (
    <div className="mb-14 sm:mb-16">
      {/* Choice Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8">

        {/* Card A: Venue Booking */}
        <Link
          to="/book-venue"
          className="bg-card border border-border hover:border-primary/50 rounded-2xl p-6 sm:p-8 text-center transition-all duration-200 hover:shadow-md relative flex flex-col justify-between items-center group no-underline cursor-pointer"
        >
          <div className="flex flex-col items-center text-center w-full">
            {/* Building Icon */}
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 flex items-center justify-center mx-auto mb-5 transition-transform duration-200 group-hover:scale-105">
              <Building2 size={32} />
            </div>

            {/* Institutional Warning Pill Badge */}
            <div className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30 uppercase tracking-wide mb-4 px-3.5 py-1 rounded-full">
              <AlertCircle size={14} className="shrink-0" />
              <span>Strictly 3 Days Prior Advance Notice</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-foreground text-center w-full group-hover:text-primary transition-colors">
              Venue Booking
            </h2>

            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed text-center mx-auto max-w-sm w-full">
              Reserve campus auditoriums for university events and academic activities.
            </p>

            {/* Operating Schedule Notice */}
            {schedules.venue ? (
              <div className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 px-3.5 py-1 rounded-full">
                <Clock size={13} className="shrink-0" />
                <span>Schedule: {schedules.venue}</span>
              </div>
            ) : (
              <div className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 px-4 py-1.5 rounded-full animate-pulse">
                <span className="w-32 h-3 bg-slate-300 dark:bg-slate-700 rounded-sm block" />
              </div>
            )}
          </div>
        </Link>

        {/* Card B: Equipment Borrowing */}
        <Link
          to="/borrow-equipment"
          className="bg-card border border-border hover:border-primary/50 rounded-2xl p-6 sm:p-8 text-center transition-all duration-200 hover:shadow-md relative flex flex-col justify-between items-center group no-underline cursor-pointer"
        >
          <div className="flex flex-col items-center text-center w-full">
            {/* Equipment Icon */}
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 flex items-center justify-center mx-auto mb-5 transition-transform duration-200 group-hover:scale-105">
              <PackageOpen size={32} />
            </div>

            {/* Institutional Notice Pill Badge */}
            <div className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 tracking-wide mb-4 px-3.5 py-1 rounded-full">
              <Info size={14} className="shrink-0" />
              <span>Valid School / Employee ID Required</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-foreground text-center w-full group-hover:text-primary transition-colors">
              Equipment Borrowing
            </h2>

            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed text-center mx-auto max-w-sm w-full">
              Borrow audio-visual equipment and presentation accessories.
            </p>

            {/* Operating Schedule Notice */}
            {schedules.equipment ? (
              <div className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 px-3.5 py-1 rounded-full">
                <Clock size={13} className="shrink-0" />
                <span>Schedule: {schedules.equipment}</span>
              </div>
            ) : (
              <div className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 px-4 py-1.5 rounded-full animate-pulse">
                <span className="w-32 h-3 bg-slate-300 dark:bg-slate-700 rounded-sm block" />
              </div>
            )}
          </div>
        </Link>

      </section>

      {/* Track Booking Button */}
      <div className="flex justify-center my-6">
        <Link
          to="/track"
          className="inline-flex items-center justify-center gap-2 px-8 sm:px-12 py-3 bg-card border border-border hover:border-primary hover:text-primary text-foreground rounded-xl text-sm font-semibold shadow-xs hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[44px] cursor-pointer"
        >
          <Search size={16} />
          <span>Track Reservation Status</span>
        </Link>
      </div>
    </div>
  );
}
