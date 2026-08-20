import { MetricCard } from "@/components/ui/app-card";
import { Building2, PackageOpen, Clock, AlertTriangle, ShieldAlert } from "lucide-react";

export default function MetricsOverview({
  totalVenueBookings,
  pendingApproval,
  totalEquipBorrows,
  totalDamaged,
  totalLost,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* 1. Total Venue Bookings */}
      <MetricCard
        icon={Building2}
        label="TOTAL VENUE BOOKINGS"
        value={totalVenueBookings}
        badge="Completed in History"
        badgeType="success"
        color="blue"
      />

      {/* 2. Pending Approval */}
      <MetricCard
        icon={Clock}
        label="PENDING APPROVAL"
        value={pendingApproval}
        badge={pendingApproval > 0 ? "Action Required" : "Up to date"}
        badgeType={pendingApproval > 0 ? "warning" : "success"}
        color="amber"
      />

      {/* 3. Total Equipment Borrows */}
      <MetricCard
        icon={PackageOpen}
        label="TOTAL EQUIPMENT BORROWS"
        value={totalEquipBorrows}
        badge="Completed in History"
        badgeType="success"
        color="blue"
      />

      {/* 4. Total Equipment Damages */}
      <MetricCard
        icon={AlertTriangle}
        label="TOTAL EQUIPMENT DAMAGES"
        value={totalDamaged}
        badge={totalDamaged > 0 ? "Damaged gear" : "Clean Stock"}
        badgeType={totalDamaged > 0 ? "danger" : "success"}
        color="rose"
      />

      {/* 5. Total Equipment Lost */}
      <MetricCard
        icon={ShieldAlert}
        label="TOTAL EQUIPMENT LOST"
        value={totalLost}
        badge={totalLost > 0 ? "Unreturned items" : "All Accounts"}
        badgeType={totalLost > 0 ? "danger" : "success"}
        color="rose"
      />
    </div>
  );
}

