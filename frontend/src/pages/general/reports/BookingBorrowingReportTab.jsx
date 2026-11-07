import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { formatDate, formatTimeRange12 } from "@/lib/dateUtils";
import { formatTimeLate, formatTimeLateFull } from "@/lib/dateTimeUtils";

export default function BookingBorrowingReportTab({
  venueBookings = [],
  equipmentBorrowings = [],
  setShowPdfModal,
  loading = false,
}) {
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
    if (s === "PENDING" || s === "PENDING APPROVAL") {
      return <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Pending</span>;
    }
    if (s === "APPROVED" || s === "SCHEDULED" || s === "CONFIRMED") {
      return <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Approved</span>;
    }
    if (s === "ON-GOING" || s === "ONGOING" || s === "BORROWED" || s === "IN_USE" || s === "IN USE" || s === "RELEASED") {
      return <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">In Use</span>;
    }
    if (s === "COMPLETED" || s === "RETURNED" || s === "DONE" || s === "GOOD CONDITION" || s === "GOOD") {
      return (
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {s === "RETURNED" ? "Returned" : "Completed"}
        </span>
      );
    }
    if (s === "CANCELLED") {
      return <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Cancelled</span>;
    }
    if (s === "REJECTED" || s === "POLICY VIOLATION" || s === "DAMAGED" || s === "LOST" || s === "DAMAGE") {
      const label =
        s === "POLICY VIOLATION"
          ? "Policy Violation"
          : s === "DAMAGE"
          ? "Damaged"
          : s.charAt(0) + s.slice(1).toLowerCase();
      return <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">{label}</span>;
    }
    if (s === "LATE RETURN" || s === "RETURNED LATE") {
      return <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Late Return</span>;
    }
    return <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{s}</span>;
  };

  const renderInspectionNote = (record, defaultStatus) => {
    const s = String(defaultStatus || record.status || "").toUpperCase();

    if (s === "REJECTED" || s === "CANCELLED") {
      const reason = record.rejection_reason || record.remarks || record.notes || "";
      if (!reason) {
        return <span className="text-xs text-slate-300 dark:text-slate-600">—</span>;
      }
      return (
        <span
          className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight inline-block max-w-[220px] truncate"
          title={reason}
        >
          {reason}
        </span>
      );
    }

    let rawNote =
      record.inspection_notes ||
      record.notes ||
      record.violation ||
      record.violation_type ||
      record.inspection?.notes ||
      "";

    if (typeof rawNote === "string") {
      rawNote = rawNote.replace(/Late Return\s*\/\s*Extension/gi, "Late Return, Extension");
      rawNote = rawNote.replace(/Physical Facility\s*\/\s*Equipment Damage/gi, "Physical Facility, Equipment Damage");
      rawNote = rawNote.replace(/Physical Facility\s*\/\s*Furniture Damage/gi, "Property Damaged");
      rawNote = rawNote.replace(/Facility or Property Damage/gi, "Property Damaged");
      rawNote = rawNote.replace(/Property Damaged,\s*Property Damaged/gi, "Property Damaged");
      rawNote = rawNote.replace(/\s*\/\s*/g, ", ");
    }

    const condition = (record.inspection_condition || record.condition || "").toLowerCase();

    if (rawNote) {
      return (
        <span
          className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-snug inline-block max-w-[220px] truncate"
          title={rawNote}
        >
          {rawNote}
        </span>
      );
    }

    if (condition) {
      return (
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 capitalize">
          {condition === "good" || condition === "clean" ? "Good Condition" : condition}
        </span>
      );
    }

    return <span className="text-xs text-slate-300 dark:text-slate-600">—</span>;
  };

  return (
    <div className="space-y-8">
      {/* ── 1. VENUE BOOKING REPORTS TABLE ── */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-sm font-bold text-slate-900 dark:text-white">Venue Booking Reports</span>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{reportVenueBookings.length} records</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-4 w-10">#</th>
                <th className="py-3 px-4">TRACK NO.</th>
                <th className="py-3 px-4">REQUESTOR</th>
                <th className="py-3 px-4">DEPARTMENT</th>
                <th className="py-3 px-4">VENUE</th>
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">TIME</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">NOTE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400 dark:text-slate-500">
                    <Loader2 size={16} className="animate-spin inline mr-1.5 text-blue-600" />
                    Loading...
                  </td>
                </tr>
              ) : reportVenueBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400 dark:text-slate-500">No venue booking records found.</td>
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
                    <tr key={`rpt-venue-${b.id || idx}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400">{venueStartIndex + idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 font-mono whitespace-nowrap">{trackNo}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{b.filer_name || b.requestor || "Filer"}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{b.program_office || b.dept || b.office || "CAS"}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{b.venue_name || b.venue?.name || b.venue || "Audio Visual Room"}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(b.date_of_usage || b.date)}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{timeFormatted || "08:00 AM – 04:00 PM"}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{getStatusBadge(status)}</td>
                      <td className="py-3 px-4">{renderInspectionNote(b, status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {reportVenueBookings.length > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold pt-1">
            <span>{venueStartIndex + 1}–{Math.min(venueStartIndex + ITEMS_PER_PAGE, reportVenueBookings.length)} of {reportVenueBookings.length}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={venuePage === 1}
                onClick={() => setVenuePage(prev => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-slate-700 dark:text-slate-300"
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <span className="px-2 text-slate-700 dark:text-slate-300">{venuePage} / {venueTotalPages}</span>
              <button
                type="button"
                disabled={venuePage >= venueTotalPages}
                onClick={() => setVenuePage(prev => Math.min(prev + 1, venueTotalPages))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-slate-700 dark:text-slate-300"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Export Notes */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Venue Export Notes <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">(Included in PDF / Excel)</span>
            </label>
          </div>
          <textarea
            rows={2}
            value={venueReportNotes}
            onChange={(e) => { setVenueReportNotes(e.target.value); localStorage.setItem("fsuu_report_venue_notes", e.target.value); }}
            placeholder="Add venue booking observations or audit summary for exported reports..."
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* ── 2. EQUIPMENT BORROWING REPORTS TABLE ── */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-sm font-bold text-slate-900 dark:text-white">Equipment Borrowing Reports</span>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{reportEquipmentBorrowings.length} records</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-4 w-10">#</th>
                <th className="py-3 px-4">TRACK NO.</th>
                <th className="py-3 px-4">REQUESTOR</th>
                <th className="py-3 px-4">DEPARTMENT</th>
                <th className="py-3 px-4">EQUIPMENT</th>
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">TIME</th>
                <th className="py-3 px-4">TIMELINESS</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">NOTE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400 dark:text-slate-500">
                    <Loader2 size={16} className="animate-spin inline mr-1.5 text-blue-600" />
                    Loading...
                  </td>
                </tr>
              ) : reportEquipmentBorrowings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400 dark:text-slate-500">No equipment borrowing records found.</td>
                </tr>
              ) : (
                paginatedEquipRecords.map((eb, idx) => {
                  const trackNo =
                    eb.tracking_number?.reference_code ||
                    (typeof eb.tracking_number === "string" ? eb.tracking_number : "") ||
                    eb.track_number ||
                    eb.reference_code ||
                    `TRK-EQ-${1000 + (eb.id || idx)}`;
                  const status = eb.tracking_number?.status || eb.status || "PENDING";
                  const timeFormatted = formatTimeRange12(eb.time_start || eb.time, eb.time_end);
                  const isLate = Boolean(eb.is_late) || String(eb.timeliness || "").toLowerCase().includes("late");
                  const minutesLate = Number(eb.minutes_late || 0);

                  return (
                    <tr key={`rpt-equip-${eb.id || idx}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400">{equipStartIndex + idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 font-mono whitespace-nowrap">{trackNo}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{eb.filer_name || eb.requestor || "Borrower"}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{eb.program_office || eb.dept || eb.office || "CAS"}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{eb.items?.[0]?.equipmentType?.name || eb.equipment_name || "Equipment"}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(eb.date_of_usage || eb.date)}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{timeFormatted || "08:00 AM – 04:00 PM"}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isLate ? (
                          <span
                            className="text-xs font-semibold text-rose-600 dark:text-rose-400"
                            title={minutesLate > 0 ? formatTimeLateFull(minutesLate) : "Returned Late"}
                          >
                            {minutesLate > 0 ? `Late (${formatTimeLate(minutesLate)})` : "Late"}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            On Time
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{getStatusBadge(status)}</td>
                      <td className="py-3 px-4">{renderInspectionNote(eb, status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {reportEquipmentBorrowings.length > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold pt-1">
            <span>{equipStartIndex + 1}–{Math.min(equipStartIndex + ITEMS_PER_PAGE, reportEquipmentBorrowings.length)} of {reportEquipmentBorrowings.length}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={equipPage === 1}
                onClick={() => setEquipPage(prev => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-slate-700 dark:text-slate-300"
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <span className="px-2 text-slate-700 dark:text-slate-300">{equipPage} / {equipTotalPages}</span>
              <button
                type="button"
                disabled={equipPage >= equipTotalPages}
                onClick={() => setEquipPage(prev => Math.min(prev + 1, equipTotalPages))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors text-slate-700 dark:text-slate-300"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Export Notes */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Equipment Export Notes <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">(Included in PDF / Excel)</span>
            </label>
          </div>
          <textarea
            rows={2}
            value={equipReportNotes}
            onChange={(e) => { setEquipReportNotes(e.target.value); localStorage.setItem("fsuu_report_equipment_notes", e.target.value); }}
            placeholder="Add equipment borrowing observations or audit notes for exported reports..."
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Record Quick View Details Modal */}
      {selectedRecord && (
        <div role="dialog" aria-modal="true" className="modal-overlay fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="modal-title font-black text-slate-900 dark:text-white text-sm">
                  {selectedRecord.type === "venue" ? "Venue Booking Details" : "Equipment Borrowing Details"}
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-mono font-bold mt-0.5">
                  {selectedRecord.data.tracking_number?.reference_code || selectedRecord.data.reference_code || "Record"}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Requestor:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedRecord.data.filer_name || selectedRecord.data.requestor || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Department / Program:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedRecord.data.program_office || selectedRecord.data.dept || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Contact &amp; Email:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedRecord.data.email_address || selectedRecord.data.email || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Schedule:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatDate(selectedRecord.data.date_of_usage || selectedRecord.data.date)} ({formatTimeRange12(selectedRecord.data.time_start, selectedRecord.data.time_end)})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Purpose:</span>
                <span className="font-bold text-slate-900 dark:text-white max-w-[240px] text-right">{selectedRecord.data.purpose || selectedRecord.data.event || "—"}</span>
              </div>
              {selectedRecord.type === "equipment" && (
                <>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Timeliness:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedRecord.data.is_late || Number(selectedRecord.data.minutes_late) > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                          {Number(selectedRecord.data.minutes_late || 0) > 0
                            ? `Late (${formatTimeLate(selectedRecord.data.minutes_late)})`
                            : "Late Return"}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">On Time</span>
                      )}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Status:</span>
                <div>{getStatusBadge(selectedRecord.data.tracking_number?.status || selectedRecord.data.status)}</div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black cursor-pointer transition-colors"
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
