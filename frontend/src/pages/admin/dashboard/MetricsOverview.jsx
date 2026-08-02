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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Venue Bookings */}
      <MetricCard
        icon={Building2}
        label="Total Venue Bookings"
        value={totalVenueBookings}
        badge="Completed in History"
        badgeType="success"
        color="blue"
      />

      {/* 2. Total Equipment Borrows */}
      <MetricCard
        icon={PackageOpen}
        label="Total Equipment Borrows"
        value={totalEquipBorrows}
        badge="Completed in History"
        badgeType="success"
        color="purple"
      />

      {/* 3. Pending Approval */}
      <MetricCard
        icon={Clock}
        label="Pending Approval"
        value={pendingApproval}
        badge={pendingApproval > 0 ? "Action Required" : "Up to date"}
        badgeType={pendingApproval > 0 ? "warning" : "success"}
        color="amber"
      />

      {/* 4. Equipment Damages & Lost */}
      <MetricCard
        icon={AlertTriangle}
        label="Damaged & Lost Items"
        value={totalDamaged + totalLost}
        badge={totalDamaged + totalLost > 0 ? "Requires Audit" : "Clean Stock"}
        badgeType={totalDamaged + totalLost > 0 ? "danger" : "success"}
        color="rose"
      />
    </div>
  );
}
