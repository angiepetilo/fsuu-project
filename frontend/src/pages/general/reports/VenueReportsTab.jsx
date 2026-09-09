import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

export default function VenueReportsTab({
  filteredVenueBookings = [],
  setShowPdfModal,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredVenueBookings.length]);

  const totalPages = Math.ceil(filteredVenueBookings.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedVenueBookings = filteredVenueBookings.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">Venue Usage & Reservations</span>
          <span className="text-xs font-semibold text-slate-400">{filteredVenueBookings.length} records</span>
        </div>
        <button
          onClick={() => setShowPdfModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          <Download size={13} /> Export PDF
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              {["#", "Requestor", "Venue", "Schedule", "Department", "Purpose", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {filteredVenueBookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400">No venue booking records.</td>
              </tr>
            ) : (
              paginatedVenueBookings.map((b, idx) => {
                const displayIndex = startIndex + idx + 1;
                return (
                  <tr key={b.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-slate-400">{displayIndex}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{b.requestor}</td>
                    <td className="px-4 py-3 text-slate-700">{b.venue}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{b.date} ({b.time})</td>
                    <td className="px-4 py-3 text-slate-500">{b.department}</td>
                    <td className="px-4 py-3 text-slate-500">{b.purpose}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                        b.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {b.status || "Completed"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredVenueBookings.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-1">
          <span>
            {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredVenueBookings.length)} of {filteredVenueBookings.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="px-2 text-slate-500">{currentPage} / {totalPages}</span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
