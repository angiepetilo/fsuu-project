import { useState, useEffect } from "react";
import { Eye, ChevronLeft, ChevronRight, Loader2, Info, ImageIcon, X, Clock } from "lucide-react";
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
    const s = String(defaultStatus || record.status || "").toUpperCase();
    
    if (s === "REJECTED" || s === "CANCELLED") {
      const reason = record.rejection_reason || record.remarks || record.notes || "";
      return (
        <div className="flex flex-col items-center justify-center gap-1 max-w-[220px] mx-auto text-center py-1">
          <span className={`text-[11px] font-bold ${s === "REJECTED" ? "text-rose-600" : "text-amber-600"}`}>
            {s === "REJECTED" ? "Rejected" : "Cancelled"}
          </span>
          {reason && (
             <span className="text-[10px] text-slate-500 font-medium italic leading-tight" title={reason}>
               {reason.length > 50 ? reason.substring(0, 50) + "..." : reason}
             </span>
          )}
        </div>
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
      rawNote = rawNote.replace(/Physical Facility \/ Furniture Damage/gi, "Property Damaged");
      rawNote = rawNote.replace(/Facility or Property Damage/gi, "Property Damaged");
      rawNote = rawNote.replace(/Property Damaged,\s*Property Damaged/gi, "Property Damaged");
    }
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
      <div className="space-y-2">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <span className="text-sm font-bold text-slate-900">Venue Booking Reports</span>
          <span className="text-xs font-semibold text-slate-400">{reportVenueBookings.length} records</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-10">#</th>
                <th className="py-3 px-4">TRACK NO.</th>
                <th className="py-3 px-4">REQUESTOR</th>
                <th className="py-3 px-4">DEPARTMENT</th>
                <th className="py-3 px-4">VENUE</th>
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">TIME</th>
                <th className="py-3 px-4">NOTE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    <Loader2 size={16} className="animate-spin inline mr-1.5 text-blue-600" />
                    Loading...
                  </td>
                </tr>
              ) : reportVenueBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">No venue booking records found.</td>
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
                      <td className="py-3 px-4 text-slate-400">{venueStartIndex + idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-700 font-mono">{trackNo}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{b.filer_name || b.requestor || "Filer"}</td>
                      <td className="py-3 px-4 text-slate-500">{b.program_office || b.dept || b.office || "CAS"}</td>
                      <td className="py-3 px-4 text-slate-700">{b.venue_name || b.venue?.name || b.venue || "Audio Visual Room"}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(b.date_of_usage || b.date)}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{timeFormatted || "08:00 AM – 04:00 PM"}</td>
                      <td className="py-3 px-4">{renderStatusAndInspectionNote(b, status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {reportVenueBookings.length > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-1">
            <span>{venueStartIndex + 1}–{Math.min(venueStartIndex + ITEMS_PER_PAGE, reportVenueBookings.length)} of {reportVenueBookings.length}</span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={venuePage === 1} onClick={() => setVenuePage(prev => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                <ChevronLeft size={13} /> Prev
              </button>
              <span className="px-2">{venuePage} / {venueTotalPages}</span>
              <button type="button" disabled={venuePage >= venueTotalPages} onClick={() => setVenuePage(prev => Math.min(prev + 1, venueTotalPages))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600">Report Notes</label>
          <textarea
            rows={2}
            value={venueReportNotes}
            onChange={(e) => { setVenueReportNotes(e.target.value); localStorage.setItem("fsuu_report_venue_notes", e.target.value); }}
            placeholder="Add venue booking observations or audit summary..."
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>
      </div>

      {/* ── 2. EQUIPMENT BORROWING REPORTS TABLE ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <span className="text-sm font-bold text-slate-900">Equipment Borrowing Reports</span>
          <span className="text-xs font-semibold text-slate-400">{reportEquipmentBorrowings.length} records</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-10">#</th>
                <th className="py-3 px-4">TRACK NO.</th>
                <th className="py-3 px-4">REQUESTOR</th>
                <th className="py-3 px-4">DEPARTMENT</th>
                <th className="py-3 px-4">EQUIPMENT</th>
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">TIME</th>
                <th className="py-3 px-4">LATE RETURN</th>
                <th className="py-3 px-4">MINS LATE</th>
                <th className="py-3 px-4">NOTE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    <Loader2 size={16} className="animate-spin inline mr-1.5 text-blue-600" />
                    Loading...
                  </td>
                </tr>
              ) : reportEquipmentBorrowings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">No equipment borrowing records found.</td>
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

                  const isLate =
                    Boolean(eb.is_late) ||
                    String(status).toUpperCase() === 'LATE RETURN' ||
                    String(status).toUpperCase() === 'RETURNED LATE' ||
                    String(eb.timeliness || "").toLowerCase().includes("late") ||
                    String(eb.violation_type || "").toLowerCase().includes("late") ||
                    String(eb.violation_type || "").toLowerCase().includes("overdue") ||
                    Number(eb.minutes_late) > 0;

                  const minutesLate = Number(eb.minutes_late || eb.inspection?.minutes_late || 0);

                  return (
                    <tr key={`rpt-equip-${eb.id || idx}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-400">{equipStartIndex + idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-700 font-mono">{trackNo}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{eb.filer_name || eb.requestor || "Filer"}</td>
                      <td className="py-3 px-4 text-slate-500">{eb.program_office || eb.dept || eb.office || "CAS"}</td>
                      <td className="py-3 px-4 text-slate-700">{equipLabel}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(eb.date_of_usage || eb.date)}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{timeFormatted || "08:00 AM – 04:00 PM"}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isLate ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {isLate ? "Late" : "On Time"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {isLate ? (minutesLate > 0 ? `${minutesLate}m` : "—") : "—"}
                      </td>
                      <td className="py-3 px-4">{renderStatusAndInspectionNote(eb, status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {reportEquipmentBorrowings.length > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-1">
            <span>{equipStartIndex + 1}–{Math.min(equipStartIndex + ITEMS_PER_PAGE, reportEquipmentBorrowings.length)} of {reportEquipmentBorrowings.length}</span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={equipPage === 1} onClick={() => setEquipPage(prev => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                <ChevronLeft size={13} /> Prev
              </button>
              <span className="px-2">{equipPage} / {equipTotalPages}</span>
              <button type="button" disabled={equipPage >= equipTotalPages} onClick={() => setEquipPage(prev => Math.min(prev + 1, equipTotalPages))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600">Report Notes</label>
          <textarea
            rows={2}
            value={equipReportNotes}
            onChange={(e) => { setEquipReportNotes(e.target.value); localStorage.setItem("fsuu_report_equipment_notes", e.target.value); }}
            placeholder="Add equipment borrowing observations or audit notes..."
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-400 transition-colors"
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
              {selectedRecord.type === "equipment" && (
                <>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Late Return Status:</span>
                    <span className="font-bold text-slate-900">
                      {selectedRecord.data.is_late || Number(selectedRecord.data.minutes_late) > 0 ? (
                        <span className="text-rose-600 font-extrabold">Late Return</span>
                      ) : (
                        <span className="text-emerald-600 font-bold">On Time</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Mins of Late Return:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {Number(selectedRecord.data.minutes_late || 0) > 0
                        ? `${selectedRecord.data.minutes_late} mins`
                        : "0 mins"}
                    </span>
                  </div>
                </>
              )}
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
