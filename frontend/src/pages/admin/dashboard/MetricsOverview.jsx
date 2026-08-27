import { MetricCard } from "@/components/ui/app-card";
import { Building2, PackageOpen, Clock, AlertTriangle, ShieldAlert, ClipboardCheck } from "lucide-react";

export default function MetricsOverview({
  totalVenueBookings = 0,
  pendingApproval = 0,
  totalEquipBorrows = 0,
  totalDamaged = 0,
  totalLost = 0,
  postInspectionPending = 0,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
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

      {/* 3. Post Inspection Pending */}
      <MetricCard
        icon={ClipboardCheck}
        label="POST INSPECTION PENDING"
        value={postInspectionPending}
        badge={postInspectionPending > 0 ? "Pending Turnover" : "All Clear"}
        badgeType={postInspectionPending > 0 ? "warning" : "success"}
        color="indigo"
      />

      {/* 4. Total Equipment Borrows */}
      <MetricCard
        icon={PackageOpen}
        label="TOTAL EQUIPMENT BORROWS"
        value={totalEquipBorrows}
        badge="Completed in History"
        badgeType="success"
        color="blue"
      />

      {/* 5. Total Equipment Damages */}
      <MetricCard
        icon={AlertTriangle}
        label="TOTAL EQUIPMENT DAMAGES"
        value={totalDamaged}
        badge={totalDamaged > 0 ? "Damaged gear" : "Clean Stock"}
        badgeType={totalDamaged > 0 ? "danger" : "success"}
        color="rose"
      />

      {/* 6. Total Equipment Lost */}
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
