import { Link } from "react-router-dom";
import { AlertTriangle, Info } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

export default function FeatureCards() {
  return (
    <section className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-[2.5rem] mb-[6rem]">

      {/* Card A: Venue Booking */}
      <Link
        to="/book-venue"
        className="bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] p-[2.5rem_2rem] sm:p-[3rem_2.5rem] text-center transition-all duration-400 ease-out hover:-translate-y-[8px] hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] hover:border-[#2563eb]/40 relative flex flex-col justify-center items-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] overflow-hidden group animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200 fill-mode-both no-underline cursor-pointer"
      >
        <div className="flex flex-col items-center text-center w-full">
          {/* House / Building Outline Icon Wrapper */}
          <div className="w-[88px] h-[88px] rounded-[24px] bg-[#eff6ff] text-[#2563eb] flex items-center justify-center mx-auto mb-[2rem] transition-all duration-300 group-hover:scale-105 group-hover:rotate-[3deg]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="38"
              height="38"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>

          {/* Warning Pill Badge with Tooltip */}
          <Tooltip text="All venue reservations must be submitted at least 72 hours prior to the event start date.">
            <div className="inline-flex items-center justify-center gap-1.5 text-[0.75rem] font-[700] text-[#b91c1c] uppercase tracking-[0.05em] mb-[1.5rem] px-[1rem] py-[0.35rem] rounded-full bg-[#fef2f2] border border-[#fecaca] cursor-help">
              <AlertTriangle size={14} className="text-[#b91c1c] shrink-0" />
              <span>Strictly 3 Days Booking. No Excuses!</span>
            </div>
          </Tooltip>

          <h2 className="text-[1.875rem] font-[800] mb-[1rem] text-[#0f172a] text-center w-full group-hover:text-[#2563eb] transition-colors duration-200">
            <span className="text-[#2563eb]">Venue</span> Booking
          </h2>

          <p className="text-xs font-medium text-slate-500 leading-relaxed text-center mx-auto max-w-sm w-full">
            Reserve AVR rooms, Hagenburg Hall, Webcast Studio, or Mini Theater at FSUU campuses for events, classes, and recordings
          </p>
        </div>
      </Link>

      {/* Card B: Equipment Borrowing */}
      <Link
        to="/borrow-equipment"
        className="bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] p-[2.5rem_2rem] sm:p-[3rem_2.5rem] text-center transition-all duration-400 ease-out hover:-translate-y-[8px] hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] hover:border-[#d97706]/40 relative flex flex-col justify-center items-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] overflow-hidden group animate-in fade-in slide-in-from-bottom-5 duration-700 delay-400 fill-mode-both no-underline cursor-pointer"
      >
        <div className="flex flex-col items-center text-center w-full">
          {/* Camera Icon Wrapper */}
          <div className="w-[88px] h-[88px] rounded-[24px] bg-[#fefce8] text-[#d97706] flex items-center justify-center mx-auto mb-[2rem] transition-all duration-300 group-hover:scale-105 group-hover:rotate-[3deg]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="38"
              height="38"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>

          {/* Notice Pill Badge with Tooltip */}
          <Tooltip text="A physical FSUU Student or Faculty ID must be presented upon equipment collection.">
            <div className="inline-flex items-center justify-center gap-1.5 text-[0.75rem] font-[700] text-[#92400e] tracking-[0.03em] mb-[1.5rem] px-[1rem] py-[0.35rem] rounded-full bg-[#fef3c7] border border-[#fde68a] cursor-help">
              <Info size={14} className="text-[#92400e] shrink-0" />
              <span>School ID required for pickup.</span>
            </div>
          </Tooltip>

          <h2 className="text-[1.875rem] font-[800] mb-[1rem] text-[#0f172a] text-center w-full group-hover:text-[#d97706] transition-colors duration-200">
            <span className="text-[#d97706]">Equipment</span> Borrowing
          </h2>

          <p className="text-xs font-medium text-slate-500 leading-relaxed text-center mx-auto max-w-sm w-full">
            Borrow multimedia items including projectors, projector screens, microphones, cameras, and corresponding extension items.
          </p>
        </div>
      </Link>

    </section>
  );
}

