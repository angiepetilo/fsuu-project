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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Total Venue Bookings (recorded in history log) */}
      <MetricCard
        icon={Building2}
        label="Total Venue Bookings"
        value={totalVenueBookings}
        badge="Completed in History"
        badgeType="success"
        color="blue"
      />

      {/* 2. Pending Approval (recorded in venue booking page) */}
      <MetricCard
        icon={Clock}
        label="Pending Approval"
        value={pendingApproval}
        badge="Requires Admin Review"
        badgeType={pendingApproval > 0 ? "warning" : "success"}
        color="amber"
      />

      {/* 3. Total Equipment Borrows (recorded in history log) */}
      <MetricCard
        icon={PackageOpen}
        label="Total Equipment Borrows"
        value={totalEquipBorrows}
        badge="Completed in History"
        badgeType="success"
        color="purple"
      />

      {/* 4. Total Equipment Damages (recorded in inventory & stock) */}
      <MetricCard
        icon={AlertTriangle}
        label="Equipment Damages"
        value={totalDamaged}
        badge="Recorded in Inventory"
        badgeType={totalDamaged > 0 ? "danger" : "success"}
        color="rose"
      />

      {/* 5. Total Equipment Lost (recorded in inventory & stock) */}
      <MetricCard
        icon={ShieldAlert}
        label="Equipment Lost"
        value={totalLost}
        badge="Recorded in Inventory"
        badgeType={totalLost > 0 ? "danger" : "success"}
        color="red"
      />
    </div>
  );
}
