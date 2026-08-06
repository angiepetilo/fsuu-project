import { useState, useEffect } from "react";
import { Building2, PackageOpen, Download, AlertTriangle, Image as ImageIcon, X, Info, CheckCircle2, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";

export default function BookingBorrowingReportTab({
  venueBookings = [],
  equipmentBorrowings = [],
  setShowPdfModal,
}) {
  const [evidenceModalImage, setEvidenceModalImage] = useState(null);

  const [venuePage, setVenuePage] = useState(1);
  const [equipPage, setEquipPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Strictly filter to items with recorded violations, late returns, damages, or lost status
  const violationVenueBookings = venueBookings.filter(
    (b) =>
      Boolean(b.violation) ||
      Boolean(b.has_violation) ||
      b.status === "damaged" ||
      b.status === "solved" ||
      Number(b.violations || 0) > 0
  );

  const violationEquipmentBorrowings = equipmentBorrowings.filter(
    (eb) =>
      Boolean(eb.violation) ||
      Boolean(eb.has_violation) ||
      eb.status === "damaged" ||
      eb.status === "lost" ||
      eb.status === "solved" ||
      Boolean(eb.is_late) ||
      Boolean(eb.late_hours) ||
      Number(eb.violations || 0) > 0
  );

  useEffect(() => {
    setVenuePage(1);
  }, [violationVenueBookings.length]);

  useEffect(() => {
    setEquipPage(1);
  }, [violationEquipmentBorrowings.length]);

  const venueTotalPages = Math.ceil(violationVenueBookings.length / ITEMS_PER_PAGE) || 1;
  const venueStartIndex = (venuePage - 1) * ITEMS_PER_PAGE;
  const paginatedVenueViolations = violationVenueBookings.slice(venueStartIndex, venueStartIndex + ITEMS_PER_PAGE);

  const equipTotalPages = Math.ceil(violationEquipmentBorrowings.length / ITEMS_PER_PAGE) || 1;
  const equipStartIndex = (equipPage - 1) * ITEMS_PER_PAGE;
  const paginatedEquipViolations = violationEquipmentBorrowings.slice(equipStartIndex, equipStartIndex + ITEMS_PER_PAGE);

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
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-blue-600" />
            <span className="font-bold text-slate-900 text-sm">Venue Booking Reports (Violation Records)</span>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {violationVenueBookings.length}
            </span>
          </div>

          <button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer"
          >
            <Download size={15} /> Export PDF Report
          </button>
        </div>

        {/* Venue Table Columns: [Track Number, Requestor Name, Venue, Schedule, Dept / Office (External), Purpose, Violation] */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {["Track Number", "Requestor Name", "Venue", "Schedule", "Dept / Office (External)", "Purpose", "Violation"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {violationVenueBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <ShieldAlert size={16} className="inline mr-1 text-slate-400" /> No venue booking violations recorded in report history.
                  </td>
                </tr>
              ) : (
                violationVenueBookings.map((b, idx) => {
                  const trackNo = b.tracking_number || b.track_number || `TRK-VB-${1000 + (b.id || idx)}`;
                  const isSolved = b.status === "solved" || b.is_solved;

                  return (
                    <tr key={b.id || idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-black text-blue-700 font-mono">{trackNo}</td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-900">{b.filer_name || b.requestor || "Filer"}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">{b.venue_name || b.venue || "AVR Auditorium"}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                        {b.date_of_usage || b.date} ({b.time_start || b.time || "08:00 AM"})
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                          {b.program_office || b.dept || b.office || "External"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">{b.purpose || b.event || "Academic Event"}</td>
                      <td className="px-4 py-3.5">
                        {isSolved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={12} /> Solved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle size={12} /> {b.violation || "Venue Policy Violation"}
                          </span>
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
      {violationVenueBookings.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 text-xs font-semibold text-slate-600">
          <div>
            Showing <span className="font-extrabold text-slate-900">{venueStartIndex + 1}</span> to{" "}
            <span className="font-extrabold text-slate-900">{Math.min(venueStartIndex + ITEMS_PER_PAGE, violationVenueBookings.length)}</span> of{" "}
            <span className="font-extrabold text-slate-900">{violationVenueBookings.length}</span> venue violation reports
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
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PackageOpen size={18} className="text-purple-600" />
            <span className="font-bold text-slate-900 text-sm">Equipment Borrowing Reports (Violation Records)</span>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {violationEquipmentBorrowings.length}
            </span>
          </div>
        </div>

        {/* Equipment Table: [TRACK NUMBER, Requestor Name, Equipment, Quantity, Dept / Office, Purpose, Violation & Evidence, Late Return] */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {["TRACK NUMBER", "Requestor Name", "Equipment", "Quantity", "Dept / Office (External)", "Purpose", "Violation & Evidence", "Late Return"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {violationEquipmentBorrowings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    <ShieldAlert size={16} className="inline mr-1 text-slate-400" /> No equipment borrowing violations, damages, or late returns recorded.
                  </td>
                </tr>
              ) : (
                paginatedEquipViolations.map((eb, idx) => {
                  const trackNo = eb.tracking_number || eb.track_number || `TRK-EB-${2000 + (eb.id || idx)}`;
                  const isSolved = eb.status === "solved" || eb.is_solved;

                  return (
                    <tr key={eb.id || idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-black text-purple-700 font-mono">{trackNo}</td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-900">{eb.filer_name || eb.requestor || "Filer"}</td>
                      <td className="px-4 py-3.5 font-bold text-purple-700">{eb.equipment_name || eb.equipment || "AV Projector HD"}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">{eb.quantity || eb.qty || 1} Units</td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                          {eb.program_office || eb.dept || eb.office || "External"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">{eb.purpose || "Academic Seminar"}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {isSolved ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Solved
                            </span>
                          ) : (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                eb.status === "lost"
                                  ? "bg-red-900 text-white border-red-950"
                                  : "bg-rose-100 text-rose-800 border-rose-300"
                              }`}
                            >
                              {eb.violation || (eb.status === "lost" ? "Lost Equipment" : "Damaged Equipment")}
                            </span>
                          )}

                          {eb.evidence_image && (
                            <button
                              onClick={() => setEvidenceModalImage(eb.evidence_image)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer"
                              title="View Evidence Image"
                            >
                              <ImageIcon size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {eb.is_late || eb.late_hours ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                            Late ({eb.late_hours || "+1.5 hrs"})
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">On-time</span>
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
      {violationEquipmentBorrowings.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 border-t border-slate-100 text-xs font-semibold text-slate-600">
          <div>
            Showing <span className="font-extrabold text-slate-900">{equipStartIndex + 1}</span> to{" "}
            <span className="font-extrabold text-slate-900">{Math.min(equipStartIndex + ITEMS_PER_PAGE, violationEquipmentBorrowings.length)}</span> of{" "}
            <span className="font-extrabold text-slate-900">{violationEquipmentBorrowings.length}</span> equipment violation reports
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
