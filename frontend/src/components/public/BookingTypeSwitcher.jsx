import { Link, useLocation } from "react-router-dom";
import { Building2, PackageOpen } from "lucide-react";

export default function BookingTypeSwitcher() {
  const location = useLocation();
  const isVenue = location.pathname.includes("venue");
  const isEquipment = location.pathname.includes("equipment");

  return (
    <div className="flex items-center justify-center mb-8">
      <div className="inline-flex p-1.5 rounded-xl bg-[#F1F5F9] dark:bg-card border border-[#E2E8F0] dark:border-border shadow-2xs gap-1.5 w-full max-w-md">
        <Link
          to="/book-venue"
          className={`flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all text-center cursor-pointer ${
            isVenue
              ? "bg-[#2563EB] text-white shadow-xs"
              : "text-[#64748B] dark:text-muted-foreground hover:text-[#0F172A] dark:hover:text-foreground"
          }`}
        >
          <Building2 size={16} />
          <span>Book Venue</span>
        </Link>
        <Link
          to="/borrow-equipment"
          className={`flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all text-center cursor-pointer ${
            isEquipment
              ? "bg-[#2563EB] text-white shadow-xs"
              : "text-[#64748B] dark:text-muted-foreground hover:text-[#0F172A] dark:hover:text-foreground"
          }`}
        >
          <PackageOpen size={16} />
          <span>Borrow Equipment</span>
        </Link>
      </div>
    </div>
  );
}
