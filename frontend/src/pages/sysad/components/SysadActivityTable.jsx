import { ContentCard } from "@/components/ui/app-card";
import { Building2, PackageOpen, Eye } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/ui/status-badge";

export default function SysadActivityTable({
  typeFilter,
  setTypeFilter,
  filteredTableRecords,
  setViewingRecord,
}) {
  return (
    <div className="w-full">
      <ContentCard
        title="Recent System Reservations & Borrowing Activities"
        subtitle="Combined record of venue bookings and equipment borrowings with filter & detail actions"
        className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4"
      >
        {/* Filter Buttons Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Filter By Type:</span>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
              <button
                onClick={() => setTypeFilter("All")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  typeFilter === "All" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All Records
              </button>
              <button
                onClick={() => setTypeFilter("Venue")}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  typeFilter === "Venue" ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Building2 size={13} /> Venue Bookings
              </button>
              <button
                onClick={() => setTypeFilter("Equipment")}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  typeFilter === "Equipment" ? "bg-purple-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <PackageOpen size={13} /> Equipment Borrowing
              </button>
            </div>
          </div>

          <span className="text-[11px] font-extrabold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {filteredTableRecords.length} Items Found
          </span>
        </div>

        {/* Reused Table Columns */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Ref #</th>
                <th className="pb-3">Requestor</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Details / Date</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTableRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs font-semibold">
                    No activity records found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTableRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Ref # */}
                    <td className="py-3.5 pl-2 font-mono font-extrabold text-slate-900">
                      {item.refNo}
                    </td>

                    {/* Requestor */}
                    <td className="py-3.5 font-extrabold text-slate-900">
                      {item.requestor}
                    </td>

                    {/* Department */}
                    <td className="py-3.5 font-semibold text-slate-600">
                      {item.department}
                    </td>

                    {/* Type */}
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase border ${
                        item.type === "Venue"
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-purple-50 border-purple-200 text-purple-700"
                      }`}>
                        {item.type}
                      </span>
                    </td>

                    {/* Details / Date */}
                    <td className="py-3.5">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900">{item.details}</span>
                        <span className="text-[11px] font-semibold text-slate-400">{item.date}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 text-center">
                      <StatusBadge status={item.status} />
                    </td>

                    {/* Action (Eye Button) */}
                    <td className="py-3.5 text-right pr-2">
                      <Tooltip text={`View ${item.type} Details`}>
                        <button
                          onClick={() => setViewingRecord(item)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 text-slate-600 hover:text-white transition-all shadow-2xs cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ContentCard>
    </div>
  );
}
