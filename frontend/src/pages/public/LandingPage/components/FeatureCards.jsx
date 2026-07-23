import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

export default function FeatureCards() {
  return (
    <section className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-[2.5rem] mb-[6rem]">

      {/* Card A: Venue Booking */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] p-[2.5rem_2rem] sm:p-[3rem_2.5rem] text-center transition-all duration-400 ease-out hover:-translate-y-[8px] hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] hover:border-[#cbd5e1] relative flex flex-col justify-between shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] overflow-hidden group animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200 fill-mode-both">
        <div>
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

          {/* Warning Pill Badge */}
          <div className="inline-flex items-center justify-center gap-1.5 text-[0.75rem] font-[700] text-[#b91c1c] uppercase tracking-[0.05em] mb-[1.5rem] px-[1rem] py-[0.35rem] rounded-full bg-[#fef2f2] border border-[#fecaca]">
            <AlertTriangle size={14} className="text-[#b91c1c] shrink-0" />
            <span>Strictly 3 Days Booking. No Excuses!</span>
          </div>

          <h2 className="text-[1.875rem] font-[800] mb-[1rem] text-[#0f172a]">
            <span className="text-[#2563eb]">Venue</span> Booking
          </h2>

          <p className="text-[#64748b] text-[1.05rem] leading-[1.6] mb-[2.5rem] font-[500]">
            Reserve AVR rooms, Hagenburg Hall, Webcast Studio, or Mini Theater at FSUU campuses for events, classes, and recordings.
          </p>
        </div>

        <Link
          to="/book-venue"
          className="w-full p-[1.125rem] rounded-[16px] border-none font-[700] text-[1.05rem] cursor-pointer transition-all duration-300 flex items-center justify-center gap-[0.5rem] text-[#ffffff] bg-[#2563eb] hover:bg-[#1d4ed8] hover:-translate-y-[2px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_15px_-3px_rgba(37,99,235,0.3)] text-decoration-none"
        >
          <span>Proceed to Venue Booking</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>

      {/* Card B: Equipment Borrowing */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] p-[2.5rem_2rem] sm:p-[3rem_2.5rem] text-center transition-all duration-400 ease-out hover:-translate-y-[8px] hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] hover:border-[#cbd5e1] relative flex flex-col justify-between shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] overflow-hidden group animate-in fade-in slide-in-from-bottom-5 duration-700 delay-400 fill-mode-both">
        <div>
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

          <div className="h-[1.5rem] mb-[1.5rem]"></div> {/* Spacing alignment */}

          <h2 className="text-[1.875rem] font-[800] mb-[1rem] text-[#0f172a]">
            <span className="text-[#d97706]">Equipment</span> Borrowing
          </h2>

          <p className="text-[#64748b] text-[1.05rem] leading-[1.6] mb-[2.5rem] font-[500]">
            Borrow multimedia items including projectors, projector screens, microphones, cameras, and corresponding extension items.
          </p>
        </div>

        <Link
          to="/borrow-equipment"
          className="w-full p-[1.125rem] rounded-[16px] border-none font-[700] text-[1.05rem] cursor-pointer transition-all duration-300 flex items-center justify-center gap-[0.5rem] text-[#ffffff] bg-[#d97706] hover:bg-[#b45309] hover:-translate-y-[2px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_15px_-3px_rgba(217,119,6,0.3)] text-decoration-none"
        >
          <span>Proceed to Equipment Borrowing</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>

    </section>
  );
}
