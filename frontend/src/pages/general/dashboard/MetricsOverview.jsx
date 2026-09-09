export default function MetricsOverview({
  totalVenueBookings = 0,
  pendingApproval = 0,
  totalEquipBorrows = 0,
  totalDamaged = 0,
  totalLost = 0,
  postInspectionPending = 0,
}) {
  const stats = [
    { label: "Venue Bookings", value: totalVenueBookings },
    { label: "Pending Approval", value: pendingApproval, warn: pendingApproval > 0 },
    { label: "Post Inspection", value: postInspectionPending, warn: postInspectionPending > 0 },
    { label: "Equipment Borrows", value: totalEquipBorrows },
    { label: "Equipment Damaged", value: totalDamaged, danger: totalDamaged > 0 },
    { label: "Equipment Lost", value: totalLost, danger: totalLost > 0 },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((s, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 space-y-1"
        >
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
          <p
            className={`text-2xl font-black tracking-tight ${
              s.danger ? "text-rose-600" : s.warn ? "text-amber-600" : "text-slate-900"
            }`}
          >
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}
