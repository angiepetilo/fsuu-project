import { useState, useEffect } from "react";
import { Building2, Download, ChevronLeft, ChevronRight } from "lucide-react";

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
              {["#", "Requestor Name", "Venue", "Schedule", "Department", "Purpose", "Status"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-semibold">
            {filteredVenueBookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  No venue booking records available.
                </td>
              </tr>
            ) : (
              paginatedVenueBookings.map((b, idx) => {
                const displayIndex = startIndex + idx + 1;
                return (
                  <tr key={b.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-400">{displayIndex}</td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-900">{b.requestor}</td>
                    <td className="px-4 py-3.5 font-bold text-blue-700">{b.venue}</td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{b.date} ({b.time})</td>
                    <td className="px-4 py-3.5 text-slate-600">{b.department}</td>
                    <td className="px-4 py-3.5 text-slate-600">{b.purpose}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                        b.status === "approved" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-green-50 text-green-700 border border-green-200"
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

      {/* Pagination Footer */}
      {filteredVenueBookings.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 text-xs font-semibold text-slate-600">
          <div>
            Showing <span className="font-extrabold text-slate-900">{startIndex + 1}</span> to{" "}
            <span className="font-extrabold text-slate-900">{Math.min(startIndex + ITEMS_PER_PAGE, filteredVenueBookings.length)}</span> of{" "}
            <span className="font-extrabold text-slate-900">{filteredVenueBookings.length}</span> venue report records
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold mr-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
