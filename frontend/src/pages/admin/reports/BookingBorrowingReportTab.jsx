import { useState, useEffect } from "react";
import { Building2, PackageOpen, Download, AlertTriangle, Image as ImageIcon, X, Info, CheckCircle2, ShieldAlert, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatDate, formatTime } from "@/lib/dateUtils";

export default function BookingBorrowingReportTab({
  venueBookings = [],
  equipmentBorrowings = [],
  setShowPdfModal,
  loading = false,
}) {
  const [evidenceModalImage, setEvidenceModalImage] = useState(null);

  const [venuePage, setVenuePage] = useState(1);
  const [equipPage, setEquipPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filter completed venue bookings and equipment borrowings for reports view
  const reportVenueBookings = venueBookings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    return s === "completed" || s === "damaged" || s === "solved" || s === "done" || Boolean(b.reference_code);
  });

  const reportEquipmentBorrowings = equipmentBorrowings.filter((eb) => {
    const s = (eb.status || "").toLowerCase();
    return s === "completed" || s === "damaged" || s === "lost" || s === "done" || s === "returned" || Boolean(eb.reference_code);
  });

  useEffect(() => {
    setVenuePage(1);
  }, [reportVenueBookings.length]);

  useEffect(() => {
    setEquipPage(1);
  }, [reportEquipmentBorrowings.length]);

  const venueTotalPages = Math.ceil(reportVenueBookings.length / ITEMS_PER_PAGE) || 1;
  const venueStartIndex = (venuePage - 1) * ITEMS_PER_PAGE;
  const paginatedVenueViolations = reportVenueBookings.slice(venueStartIndex, venueStartIndex + ITEMS_PER_PAGE);

  const equipTotalPages = Math.ceil(reportEquipmentBorrowings.length / ITEMS_PER_PAGE) || 1;
  const equipStartIndex = (equipPage - 1) * ITEMS_PER_PAGE;
  const paginatedEquipViolations = reportEquipmentBorrowings.slice(equipStartIndex, equipStartIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Informational Banner */}
      <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex items-center gap-3 text-amber-900 text-xs font-bold shadow-2xs">
        <Info size={18} className="text-amber-600 shrink-0" />
        <span>
          This tab displays all venue bookings and equipment borrowings that have recorded rule violations, late returns, equipment damages, or lost items.
        </span>
      </div>

      {/* ── 1. VENUE BOOKING REPORTS TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-black text-slate-900 text-sm">Venue Booking Reports</h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Historical reservation records and facility status summary
          </p>
        </div>

        {/* Venue Table Columns: [Track Number, Requestor Name, Venue, Schedule, Dept / Office, Purpose, Remarks] */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {["Track Number", "Requestor Name", "Venue", "Schedule", "Dept / Office", "Purpose", "Remarks"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Loader2 size={20} className="animate-spin inline mr-2 text-blue-600" />
                    <span>Loading report records...</span>
                  </td>
                </tr>
              ) : venueBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No venue booking report records found.
                  </td>
                </tr>
              ) : (
                paginatedVenueViolations.map((b, idx) => {
                  const trackNo = b.tracking_number?.reference_code || (typeof b.tracking_number === 'string' ? b.tracking_number : '') || b.track_number || b.reference_code || `TRK-VB-${1000 + (b.id || idx)}`;
                  const isDamaged = Boolean(b.has_damage) || (b.status || "").toLowerCase() === "damaged" || (b.status || "").toLowerCase() === "violation";
                  const schedTime = formatTime(b.time_start || b.time);

                  return (
                    <tr key={`rpt-venue-${b.id || idx}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-black text-blue-700 font-mono">{trackNo}</td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-900">{b.filer_name || b.requestor || "Filer"}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">{b.venue_name || b.venue || "AVR Auditorium"}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                        {formatDate(b.date_of_usage || b.date)} ({schedTime})
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-extrabold">
                        {b.program_office || b.dept || b.office || "External"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">{b.purpose || b.event || "Academic Event"}</td>
                      <td className="px-4 py-3.5 font-extrabold">
                        {isDamaged ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200">VIOLATION</span>
                        ) : (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">CLEAN</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer - Venue Violations */}
      {reportVenueBookings.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 text-xs font-semibold text-slate-600">
          <div>
            Showing <span className="font-extrabold text-slate-900">{venueStartIndex + 1}</span> to{" "}
            <span className="font-extrabold text-slate-900">{Math.min(venueStartIndex + ITEMS_PER_PAGE, reportVenueBookings.length)}</span> of{" "}
            <span className="font-extrabold text-slate-900">{reportVenueBookings.length}</span> venue reports
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold mr-2">
              Page {venuePage} of {venueTotalPages}
            </span>
            <button
              type="button"
              disabled={venuePage === 1}
              onClick={() => setVenuePage(prev => Math.max(prev - 1, 1))}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <button
              type="button"
              disabled={venuePage >= venueTotalPages}
              onClick={() => setVenuePage(prev => Math.min(prev + 1, venueTotalPages))}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── 2. EQUIPMENT BORROWING REPORTS TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <h3 className="font-black text-slate-900 text-sm">Equipment Borrowing Reports</h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Historical borrowing logs and equipment status summary
            </p>
          </div>
        </div>

        {/* Equipment Table: [TRACK NUMBER, Requestor Name, Equipment, Quantity, Dept / Office, Purpose, Remarks] */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {["TRACK NUMBER", "Requestor Name", "Equipment", "Quantity", "Dept / Office", "Purpose", "Remarks"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Loader2 size={20} className="animate-spin inline mr-2 text-blue-600" />
                    <span>Loading equipment reports...</span>
                  </td>
                </tr>
              ) : equipmentBorrowings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No equipment borrowing records found.
                  </td>
                </tr>
              ) : (
                paginatedEquipViolations.map((eb, idx) => {
                  const trackNo = eb.tracking_number?.reference_code || (typeof eb.tracking_number === 'string' ? eb.tracking_number : '') || eb.track_number || eb.reference_code || `TRK-EB-${2000 + (eb.id || idx)}`;
                  const isDamaged = Boolean(eb.has_damage) || (eb.status || "").toLowerCase() === "damaged" || (eb.status || "").toLowerCase() === "lost";

                  return (
                    <tr key={eb.id || idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-blue-600 font-mono">{trackNo}</td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-900">{eb.filer_name || eb.requestor || "Filer"}</td>
                      <td className="px-4 py-3.5 font-bold text-blue-700">{eb.equipment_name || eb.equipment || "AV Projector HD"}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">{eb.quantity || eb.qty || 1} Units</td>
                      <td className="px-4 py-3.5 text-slate-700 font-extrabold">
                        {eb.program_office || eb.dept || eb.office || "External"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">{eb.purpose || "Academic Seminar"}</td>
                      <td className="px-4 py-3.5 font-extrabold">
                        {(eb.status || "").toLowerCase() === "lost" ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200">LOST</span>
                        ) : isDamaged ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200">VIOLATION</span>
                        ) : (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">CLEAN</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer - Equipment Violations */}
      {reportEquipmentBorrowings.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 text-xs font-semibold text-slate-600">
          <div>
            Showing <span className="font-extrabold text-slate-900">{equipStartIndex + 1}</span> to{" "}
            <span className="font-extrabold text-slate-900">{Math.min(equipStartIndex + ITEMS_PER_PAGE, reportEquipmentBorrowings.length)}</span> of{" "}
            <span className="font-extrabold text-slate-900">{reportEquipmentBorrowings.length}</span> equipment reports
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold mr-2">
              Page {equipPage} of {equipTotalPages}
            </span>
            <button
              type="button"
              disabled={equipPage === 1}
              onClick={() => setEquipPage(prev => Math.max(prev - 1, 1))}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <button
              type="button"
              disabled={equipPage >= equipTotalPages}
              onClick={() => setEquipPage(prev => Math.min(prev + 1, equipTotalPages))}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs font-bold text-xs"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Evidence Image Viewer Modal */}
      {evidenceModalImage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <ImageIcon size={18} className="text-blue-600" />
                Inspection Evidence Photo
              </h3>
              <button onClick={() => setEvidenceModalImage(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-96">
              <img src={evidenceModalImage} alt="Inspection Evidence" className="max-h-96 object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
