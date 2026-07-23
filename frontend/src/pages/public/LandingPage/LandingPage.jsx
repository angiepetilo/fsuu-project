import { Link } from "react-router-dom";
import { Info, ShieldCheck, FileText } from "lucide-react";
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
      <section className="bg-[#ffffff] border border-[#e2e8f0] rounded-[24px] p-[2.5rem] sm:p-[4rem] mb-[5rem] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] relative overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-700 delay-500 fill-mode-both">
        <div className="absolute top-0 left-0 w-[6px] h-full bg-gradient-to-b from-[#2563eb] to-[#d97706]"></div>

        <h2 className="text-[1.75rem] font-[800] mb-[2.5rem] flex items-center gap-[0.75rem] text-[#0f172a]">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Requirements Needed Before Venue Booking
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[2.5rem]">
          <div className="bg-[#f8fafc] border border-[#e2e8f0] p-[2.5rem] rounded-[20px] transition-all duration-300 hover:border-[#cbd5e1] hover:shadow-md hover:-translate-y-[2px]">
            <h3 className="text-[1.15rem] font-[700] text-[#0f172a] mb-[1.25rem] leading-[1.5] flex items-start gap-[0.75rem]">
              <FileText size={24} className="text-[#2563eb] shrink-0 mt-0.5" />
              <span>Formal request letter signed and endorsed by the Dean of Student Affairs (DSA)</span>
            </h3>
            <ul className="list-none text-[#64748b] text-[1.05rem] leading-[1.6] font-[500]">
              <li className="relative pl-[2rem] before:content-['✓'] before:absolute before:left-0 before:color-[#059669] before:font-[800]">
                Organization Purposes
              </li>
            </ul>
          </div>

          <div className="bg-[#f8fafc] border border-[#e2e8f0] p-[2.5rem] rounded-[20px] transition-all duration-300 hover:border-[#cbd5e1] hover:shadow-md hover:-translate-y-[2px]">
            <h3 className="text-[1.15rem] font-[700] text-[#0f172a] mb-[1.25rem] leading-[1.5] flex items-start gap-[0.75rem]">
              <FileText size={24} className="text-[#2563eb] shrink-0 mt-0.5" />
              <span>Formal request letter signed and endorsed by the VP for Academic Affairs (VP Acad)</span>
            </h3>
            <ul className="list-none text-[#64748b] text-[1.05rem] leading-[1.6] font-[500]">
              <li className="relative pl-[2rem] before:content-['✓'] before:absolute before:left-0 before:color-[#059669] before:font-[800]">
                Academic Purposes
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-[3rem] p-[1.25rem_1.75rem] bg-[#eff6ff] border-l-[4px] border-[#2563eb] rounded-r-[12px] text-[1.05rem] text-[#1e40af] leading-[1.6] font-[500] flex items-center gap-[1rem]">
          <Info size={24} className="text-[#1e40af] shrink-0" />
          <div>
            <strong>Important Payment Notice for external users:</strong> Payment scheduling and transaction details will be finalized only after the request receives administrative approval.
          </div>
        </div>
      </section>

      {/* Footer Navigation Bar Links */}
      <div className="flex flex-wrap items-center justify-center gap-6 my-6 text-xs font-bold text-[#64748b]">
        <span>•</span>
        <Link to="/login" className="flex items-center gap-1.5 hover:text-[#2563eb] transition-colors">
          <ShieldCheck size={14} className="text-[#d97706]" />
          <span>Administrative Staff Portal</span>
        </Link>
      </div>

    </div>
  );
}
