import { Link } from "react-router-dom";
import { ShieldCheck, Search } from "lucide-react";
import Hero from "./components/Hero";
import FeatureCards from "./components/FeatureCards";

export default function LandingPage() {
  return (
    <div className="w-full text-[#0f172a] font-sans relative">

      {/* Hero Section */}
      <Hero />

      {/* Choice Cards Grid */}
      <FeatureCards />

      {/* Booking Requirements Segment */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 mb-10 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-600 to-amber-500" />

        <h2 className="text-lg font-extrabold mb-6 text-slate-900">
          Requirements Needed Before Venue Booking
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Requirement 1 */}
          <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-xl transition-all duration-200 hover:border-slate-300 hover:shadow-xs">
            <p className="text-sm font-bold text-slate-900 mb-2 leading-snug">
              Formal request letter signed and endorsed by the Dean of Student Affairs (DSA)
            </p>
            <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 inline-block px-2.5 py-1 rounded-md">
              Organization Purposes
            </p>
          </div>

          {/* Requirement 2 */}
          <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-xl transition-all duration-200 hover:border-slate-300 hover:shadow-xs">
            <p className="text-sm font-bold text-slate-900 mb-2 leading-snug">
              Formal request letter signed and endorsed by the VP for Academic Affairs (VP Acad)
            </p>
            <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 inline-block px-2.5 py-1 rounded-md">
              Academic Purposes
            </p>
          </div>
        </div>

        {/* Important Payment Notice */}
        <div className="mt-5 p-4 bg-blue-50/70 border-l-4 border-blue-600 rounded-r-xl text-xs text-blue-950 font-medium leading-relaxed">
          <span className="font-bold text-blue-900">Important Payment Notice for external users:</span> Payment scheduling and transaction details will be finalized only after the request receives administrative approval.
        </div>
      </section>

      {/* Action Links Below Requirements Card (Small Minimalist Style) */}
      <div className="flex items-center justify-center gap-6 my-8 text-xs font-semibold text-slate-500">
        <Link
          to="/track"
          className="flex items-center gap-2 hover:text-slate-800 transition-colors group"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform" />
          <span>Track Booking</span>
        </Link>
        
        <span className="text-slate-300 font-bold">•</span>

        <Link
          to="/login"
          className="flex items-center gap-2 hover:text-slate-800 transition-colors group"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 group-hover:scale-125 transition-transform" />
          <span>Admin Portal</span>
        </Link>
      </div>

    </div>
  );
}
