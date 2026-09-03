import { useState, useEffect } from "react";
import { Eye, ChevronLeft, ChevronRight, Loader2, Info, ImageIcon, X } from "lucide-react";
import { formatDate, formatTimeRange12 } from "@/lib/dateUtils";

export default function BookingBorrowingReportTab({
  venueBookings = [],
  equipmentBorrowings = [],
  setShowPdfModal,
  loading = false,
}) {
  const [evidenceModalImage, setEvidenceModalImage] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [venueReportNotes, setVenueReportNotes] = useState(() => localStorage.getItem("fsuu_report_venue_notes") || "");
  const [equipReportNotes, setEquipReportNotes] = useState(() => localStorage.getItem("fsuu_report_equipment_notes") || "");

  const [venuePage, setVenuePage] = useState(1);
  const [equipPage, setEquipPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filter completed or active records for report tables
  const reportVenueBookings = venueBookings.filter((b) => {
    return Boolean(b.id || b.reference_code || b.filer_name);
  });

  const reportEquipmentBorrowings = equipmentBorrowings.filter((eb) => {
    return Boolean(eb.id || eb.reference_code || eb.filer_name);
  });

  useEffect(() => {
    setVenuePage(1);
  }, [reportVenueBookings.length]);

  useEffect(() => {
    setEquipPage(1);
  }, [reportEquipmentBorrowings.length]);

  const venueTotalPages = Math.ceil(reportVenueBookings.length / ITEMS_PER_PAGE) || 1;
  const venueStartIndex = (venuePage - 1) * ITEMS_PER_PAGE;
  const paginatedVenueRecords = reportVenueBookings.slice(venueStartIndex, venueStartIndex + ITEMS_PER_PAGE);

  const equipTotalPages = Math.ceil(reportEquipmentBorrowings.length / ITEMS_PER_PAGE) || 1;
  const equipStartIndex = (equipPage - 1) * ITEMS_PER_PAGE;
  const paginatedEquipRecords = reportEquipmentBorrowings.slice(equipStartIndex, equipStartIndex + ITEMS_PER_PAGE);

  const getStatusBadge = (statusStr) => {
    const s = String(statusStr || "PENDING").toUpperCase();
    if (s === "PENDING") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-300">
          PENDING
        </span>
      );
    }
    if (s === "APPROVED" || s === "SCHEDULED") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
          {s}
        </span>
      );
    }
    if (s === "ON-GOING" || s === "ONGOING" || s === "BORROWED" || s === "IN_USE") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
          ON-GOING
        </span>
      );
    }
    if (s === "COMPLETED" || s === "RETURNED" || s === "DONE" || s === "GOOD CONDITION" || s === "GOOD") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
          {s}
        </span>
      );
    }
    if (s === "REJECTED" || s === "CANCELLED" || s === "POLICY VIOLATION" || s === "DAMAGED" || s === "LOST" || s === "DAMAGE") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
          {s}
        </span>
      );
    }
    if (s === "LATE RETURN" || s === "RETURNED LATE") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-300">
          LATE RETURN
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
        {s}
      </span>
    );
  };

  const renderStatusAndInspectionNote = (record, defaultStatus) => {
    const rawNote =
      record.inspection_notes ||
      record.notes ||
      record.violation ||
      record.violation_type ||
      record.inspection?.notes ||
      "";
    const condition = (record.inspection_condition || record.condition || "").toLowerCase();

    return (
      <div className="flex flex-col items-center justify-center gap-1 max-w-[220px] mx-auto text-center py-1">
        {rawNote ? (
          <span
            className="text-[11px] font-semibold text-slate-700 leading-snug break-words max-w-full text-center"
            title={rawNote}
          >
            {rawNote}
          </span>
        ) : condition ? (
          <span className="text-[11px] font-semibold text-slate-600 capitalize">
            {condition === "good" || condition === "clean" ? "*COMPLETE PHYSICAL UNIT*" : condition}
          </span>
        ) : (
          <span className="text-[10.5px] text-slate-400 font-normal italic">
            No inspection note
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* ── 1. VENUE BOOKING REPORTS TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Venue Booking Reports</h3>
          </div>
        </div>

        {/* Table layout matching Screenshot 1 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4 w-12 text-center">#</th>
                <th className="py-4 px-4">TRACK NUMBER</th>
                <th className="py-4 px-4">REQUESTOR</th>
                <th className="py-4 px-4">DEPARTMENT</th>
                <th className="py-4 px-4">VENUE</th>
                <th className="py-4 px-4">DATE</th>
                <th className="py-4 px-4">TIME</th>
                <th className="py-4 px-4 text-center">INSPECTION NOTE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Loader2 size={20} className="animate-spin inline mr-2 text-blue-600" />
                    <span>Loading venue booking reports...</span>
                  </td>
                </tr>
              ) : reportVenueBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No venue booking report records found.
                  </td>
                </tr>
              ) : (
                paginatedVenueRecords.map((b, idx) => {
                  const trackNo =
                    b.tracking_number?.reference_code ||
                    (typeof b.tracking_number === "string" ? b.tracking_number : "") ||
                    b.track_number ||
                    b.reference_code ||
                    `TRK-VB-${1000 + (b.id || idx)}`;
                  let status = b.tracking_number?.status || b.status || "PENDING";
                  if (String(status).toUpperCase() === "DAMAGED") {
                    status = "POLICY VIOLATION";
                  }
                  const timeFormatted = formatTimeRange12(b.time_start || b.time, b.time_end);

                  return (
                    <tr key={`rpt-venue-${b.id || idx}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-4 text-slate-400 font-bold text-center">{venueStartIndex + idx + 1}</td>
                      <td className="py-4 px-4 font-black text-blue-600 font-mono tracking-tight">{trackNo}</td>
                      <td className="py-4 px-4 font-black text-slate-900">{b.filer_name || b.requestor || "Filer"}</td>
                      <td className="py-4 px-4 text-slate-700 font-bold">{b.program_office || b.dept || b.office || "CAS"}</td>
                      <td className="py-4 px-4 font-bold text-blue-700">{b.venue_name || b.venue?.name || b.venue || "Audio Visual Room"}</td>
                      <td className="py-4 px-4 text-slate-600 whitespace-nowrap font-medium">{formatDate(b.date_of_usage || b.date)}</td>
                      <td className="py-4 px-4 text-slate-600 whitespace-nowrap font-medium">{timeFormatted || "08:00 AM – 04:00 PM"}</td>
                      <td className="py-4 px-4 text-center">{renderStatusAndInspectionNote(b, status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {reportVenueBookings.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-white border-t border-slate-100 text-xs font-semibold text-slate-600">
            <div>
              Showing <span className="font-extrabold text-slate-900">{venueStartIndex + 1}</span> to{" "}
              <span className="font-extrabold text-slate-900">{Math.min(venueStartIndex + ITEMS_PER_PAGE, reportVenueBookings.length)}</span> of{" "}
              <span className="font-extrabold text-slate-900">{reportVenueBookings.length}</span> venue bookings
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-bold">
                Page {venuePage} of {venueTotalPages}
              </span>
              <button
                type="button"
                disabled={venuePage === 1}
                onClick={() => setVenuePage(prev => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <button
                type="button"
                disabled={venuePage >= venueTotalPages}
                onClick={() => setVenuePage(prev => Math.min(prev + 1, venueTotalPages))}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* User Venue Report Typing Box */}
        <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100 space-y-2">
          <label className="block text-xs font-extrabold text-slate-800">
            Venue Booking Report Summary &amp; Notes
          </label>
          <textarea
            rows={3}
            value={venueReportNotes}
            onChange={(e) => {
              setVenueReportNotes(e.target.value);
              localStorage.setItem("fsuu_report_venue_notes", e.target.value);
            }}
            placeholder="Type your venue booking report observations, audit summary, or executive notes here..."
            className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs transition-all"
          />
        </div>
      </div>

      {/* ── 2. EQUIPMENT BORROWING REPORTS TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Equipment Borrowing Reports</h3>
          </div>
        </div>

        {/* Table layout matching Screenshot 1 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4 w-12 text-center">#</th>
                <th className="py-4 px-4">TRACK NUMBER</th>
                <th className="py-4 px-4">REQUESTOR</th>
                <th className="py-4 px-4">DEPARTMENT</th>
                <th className="py-4 px-4">EQUIPMENT</th>
                <th className="py-4 px-4">DATE</th>
                <th className="py-4 px-4">TIME</th>
                <th className="py-4 px-4 text-center">INSPECTION NOTE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Loader2 size={20} className="animate-spin inline mr-2 text-blue-600" />
                    <span>Loading equipment reports...</span>
                  </td>
                </tr>
              ) : reportEquipmentBorrowings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No equipment borrowing report records found.
                  </td>
                </tr>
              ) : (
                paginatedEquipRecords.map((eb, idx) => {
                  const trackNo =
                    eb.tracking_number?.reference_code ||
                    (typeof eb.tracking_number === "string" ? eb.tracking_number : "") ||
                    eb.track_number ||
                    eb.reference_code ||
                    `EQ-2026-${String(eb.id || idx + 1).padStart(5, "0")}`;
                  let status = eb.tracking_number?.status || eb.status || "PENDING";
                  if (eb.is_lost || String(eb.inspection_condition).toLowerCase() === 'lost') {
                    status = "LOST";
                  } else if (eb.has_damage || String(eb.inspection_condition).toLowerCase() === 'damaged') {
                    status = "DAMAGED";
                  } else if (eb.is_late || String(status).toUpperCase() === 'LATE RETURN' || String(status).toUpperCase() === 'RETURNED LATE' || String(eb.timeliness).toLowerCase() === 'late') {
                    status = "LATE RETURN";
                  } else if (eb.inspection_condition) {
                    status = (eb.inspection_condition === "good" || eb.inspection_condition === "clean") ? "COMPLETED" : eb.inspection_condition;
                  } else if (String(status).toUpperCase() === "COMPLETED" || String(status).toUpperCase() === "RETURNED") {
                    status = "COMPLETED";
                  }
                  const timeFormatted = formatTimeRange12(eb.time_start || eb.time, eb.time_end);
                  const equipLabel =
                    eb.equipment_name ||
                    eb.equipment?.name ||
                    eb.equipment_type?.name ||
                    eb.items?.[0]?.equipment_type?.eq_name ||
                    eb.items?.[0]?.equipment_type?.name ||
                    "Audio Visual Gear";

                  return (
                    <tr key={`rpt-equip-${eb.id || idx}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-4 text-slate-400 font-bold text-center">{equipStartIndex + idx + 1}</td>
                      <td className="py-4 px-4 font-black text-blue-600 font-mono tracking-tight">{trackNo}</td>
                      <td className="py-4 px-4 font-black text-slate-900">{eb.filer_name || eb.requestor || "Filer"}</td>
                      <td className="py-4 px-4 text-slate-700 font-bold">{eb.program_office || eb.dept || eb.office || "CAS"}</td>
                      <td className="py-4 px-4 font-bold text-blue-700">{equipLabel}</td>
                      <td className="py-4 px-4 text-slate-600 whitespace-nowrap font-medium">{formatDate(eb.date_of_usage || eb.date)}</td>
                      <td className="py-4 px-4 text-slate-600 whitespace-nowrap font-medium">{timeFormatted || "08:00 AM – 04:00 PM"}</td>
                      <td className="py-4 px-4 text-center">{renderStatusAndInspectionNote(eb, status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {reportEquipmentBorrowings.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-white border-t border-slate-100 text-xs font-semibold text-slate-600">
            <div>
              Showing <span className="font-extrabold text-slate-900">{equipStartIndex + 1}</span> to{" "}
              <span className="font-extrabold text-slate-900">{Math.min(equipStartIndex + ITEMS_PER_PAGE, reportEquipmentBorrowings.length)}</span> of{" "}
              <span className="font-extrabold text-slate-900">{reportEquipmentBorrowings.length}</span> equipment borrowings
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-bold">
                Page {equipPage} of {equipTotalPages}
              </span>
              <button
                type="button"
                disabled={equipPage === 1}
                onClick={() => setEquipPage(prev => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <button
                type="button"
                disabled={equipPage >= equipTotalPages}
                onClick={() => setEquipPage(prev => Math.min(prev + 1, equipTotalPages))}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs font-bold text-xs"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* User Equipment Report Typing Box */}
        <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100 space-y-2">
          <label className="block text-xs font-extrabold text-slate-800">
            Equipment Borrowing Report Summary &amp; Notes
          </label>
          <textarea
            rows={3}
            value={equipReportNotes}
            onChange={(e) => {
              setEquipReportNotes(e.target.value);
              localStorage.setItem("fsuu_report_equipment_notes", e.target.value);
            }}
            placeholder="Type your equipment borrowing report observations, utilization remarks, or audit notes here..."
            className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs transition-all"
          />
        </div>
      </div>

      {/* Record Quick View Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  {selectedRecord.type === "venue" ? "Venue Booking Details" : "Equipment Borrowing Details"}
                </h3>
                <p className="text-xs text-blue-600 font-mono font-bold mt-0.5">
                  {selectedRecord.data.tracking_number?.reference_code || selectedRecord.data.reference_code || "Record"}
                </p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Requestor:</span>
                <span className="font-bold text-slate-900">{selectedRecord.data.filer_name || selectedRecord.data.requestor || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Department / Program:</span>
                <span className="font-bold text-slate-900">{selectedRecord.data.program_office || selectedRecord.data.dept || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Contact & Email:</span>
                <span className="font-bold text-slate-900">{selectedRecord.data.email_address || selectedRecord.data.email || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Schedule:</span>
                <span className="font-bold text-slate-900">{formatDate(selectedRecord.data.date_of_usage || selectedRecord.data.date)} ({formatTimeRange12(selectedRecord.data.time_start, selectedRecord.data.time_end)})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Purpose:</span>
                <span className="font-bold text-slate-900 max-w-[240px] text-right">{selectedRecord.data.purpose || selectedRecord.data.event || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 font-semibold">Status:</span>
                <div>{getStatusBadge(selectedRecord.data.tracking_number?.status || selectedRecord.data.status)}</div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
