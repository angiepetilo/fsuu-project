import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Building2, PackageOpen, ShieldCheck, KeyRound } from "lucide-react";
import VenueBooking from "@/pages/public/VenueBooking/VenueBooking";
import EquipmentBorrowing from "@/pages/public/EquipmentBorrowing/EquipmentBorrowing";

export default function PortalInterface() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get("tab") === "equipment" ? "equipment" : "venue";
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="space-y-6">
      {/* Top Banner with Mode Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-3xl border border-slate-800 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-blue-500 text-white">
              Internal Portal Mode
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-slate-300">
              <ShieldCheck size={14} className="text-emerald-400" />
              Full Override & PIN Verification Enabled
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
            AVR Reservation & Borrowing Interface
          </h2>
          <p className="text-xs text-slate-300 font-medium max-w-2xl">
            Staff & Administrator desk reservation interface. Supports walk-ins, external organizations, extended equipment returns, tomorrow / short-notice bookings, and master PIN overrides.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-800/90 border border-slate-700 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("venue")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "venue"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-700/60"
            }`}
          >
            <Building2 size={15} />
            <span>Book Venue</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("equipment")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "equipment"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-700/60"
            }`}
          >
            <PackageOpen size={15} />
            <span>Borrow Equipment</span>
          </button>
        </div>
      </div>

      {/* Booking Form Canvas */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {activeTab === "venue" ? (
          <VenueBooking isPortal={true} />
        ) : (
          <EquipmentBorrowing isPortal={true} />
        )}
      </div>
    </div>
  );
}
