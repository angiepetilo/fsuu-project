import { Building2, Download } from "lucide-react";

export default function VenueReportsTab({
  filteredVenueBookings,
  setShowPdfModal,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-blue-600" />
          <span className="font-bold text-slate-900 text-sm">Venue Usage & Reservations Log</span>
          <span className="ml-1 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {filteredVenueBookings.length}
          </span>
        </div>

        <button
          onClick={() => setShowPdfModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer"
        >
          <Download size={15} /> Export PDF Report
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["#", "Requestor Name", "Venue", "Schedule", "Office / Campus", "Department", "Purpose", "Status"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {filteredVenueBookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  No venue booking records available for selected office scope.
                </td>
              </tr>
            ) : (
              filteredVenueBookings.map((b, idx) => (
                <tr key={b.id || idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3.5 font-extrabold text-slate-900">{b.requestor}</td>
                  <td className="px-4 py-3.5 font-bold text-blue-700">{b.venue}</td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{b.date} ({b.time})</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                      {b.office}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">{b.dept}</td>
                  <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">{b.event}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
