import { Link } from "react-router-dom";
import { AlertCircle, Info, Search, Building2, PackageOpen } from "lucide-react";

export default function FeatureCards() {
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
              Reserve campus auditoriums, AVR facilities, halls, webcast studios, or conference rooms for university events and academic activities.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-border/60 w-full flex items-center justify-center">
            <span className="text-xs font-semibold text-primary group-hover:underline">
              Submit Venue Request →
            </span>
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
              Borrow audiovisual equipment, projectors, portable sound systems, microphones, and presentation accessories.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-border/60 w-full flex items-center justify-center">
            <span className="text-xs font-semibold text-primary group-hover:underline">
              Submit Equipment Request →
            </span>
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
