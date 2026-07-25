import { Link } from "react-router-dom";
import { Building2, Camera, AlertTriangle, ArrowRight } from "lucide-react";
import { AppCard } from "@/components/ui/app-card";

export default function FeatureCards() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 items-stretch">

      {/* Card A: Venue Booking */}
      <AppCard className="text-center group flex flex-col justify-between p-8 rounded-3xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div className="flex flex-col items-center">
          {/* Icon Container */}
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-105">
            <Building2 size={26} className="stroke-[2]" />
          </div>

          {/* Warning Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200/60 text-[11px] font-extrabold uppercase tracking-wider mb-4">
            <AlertTriangle size={12} className="shrink-0" />
            <span>Strictly 3 Days Booking. No Excuses!</span>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-3">
            <span className="text-blue-600">Venue</span> Booking
          </h2>

          {/* Description */}
          <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed mb-8 max-w-sm">
            Reserve AVR rooms, Hagenburg Hall, Webcast Studio, or Mini Theater at FSUU campuses for events, classes, and recordings.
          </p>
        </div>

        {/* Button */}
        <Link
          to="/book-venue"
          className="w-full py-3.5 px-5 rounded-2xl font-extrabold text-xs tracking-wide text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5"
        >
          <span>Proceed to Venue Booking</span>
          <ArrowRight size={15} />
        </Link>
      </AppCard>

      {/* Card B: Equipment Borrowing */}
      <AppCard className="text-center group flex flex-col justify-between p-8 rounded-3xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div className="flex flex-col items-center">
          {/* Icon Container */}
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-105">
            <Camera size={26} className="stroke-[2]" />
          </div>

          {/* Badge Placeholder for vertical balance */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200/60 text-[11px] font-extrabold uppercase tracking-wider mb-4 opacity-0 pointer-events-none select-none">
            <span>Placeholder</span>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-3">
            <span className="text-amber-600">Equipment</span> Borrowing
          </h2>

          {/* Description */}
          <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed mb-8 max-w-sm">
            Borrow multimedia items including projectors, projector screens, microphones, cameras, and corresponding extension items.
          </p>
        </div>

        {/* Button */}
        <Link
          to="/borrow-equipment"
          className="w-full py-3.5 px-5 rounded-2xl font-extrabold text-xs tracking-wide text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5"
        >
          <span>Proceed to Equipment Borrowing</span>
          <ArrowRight size={15} />
        </Link>
      </AppCard>

    </section>
  );
}
