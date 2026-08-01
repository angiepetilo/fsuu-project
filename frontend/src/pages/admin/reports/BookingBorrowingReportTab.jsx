import { useState } from "react";
import { Building2, PackageOpen, Download, AlertTriangle, Image as ImageIcon, X } from "lucide-react";

export default function BookingBorrowingReportTab({
  venueBookings = [],
  equipmentBorrowings = [],
  setShowPdfModal,
}) {
  const [evidenceModalImage, setEvidenceModalImage] = useState(null);

  return (
    <div className="space-y-6">
      {/* ── 1. VENUE BOOKINGS REPORT TABLE (Item 22) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-blue-600" />
            <span className="font-bold text-slate-900 text-sm">Venue Booking Reports</span>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {venueBookings.length}
            </span>
          </div>

          <button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer"
          >
            <Download size={15} /> Export PDF Report
          </button>
        </div>

        {/* Venue Table: [#, Requestor Name, Venue, Schedule, Department / Office, Purpose, Violation] */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {["#", "Requestor Name", "Venue", "Schedule", "Dept / Office (External)", "Purpose", "Violation"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {venueBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No venue booking records recorded in report history.
                  </td>
                </tr>
              ) : (
                venueBookings.map((b, idx) => (
                  <tr key={b.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-900">{b.filer_name || b.requestor || "Filer"}</td>
                    <td className="px-4 py-3.5 font-bold text-blue-700">{b.venue_name || b.venue || "AVR Auditorium"}</td>
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
                      {b.violation || b.has_violation ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                          <AlertTriangle size={12} /> {b.violation || "Venue Policy Violation"}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          None (Good)
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 2. EQUIPMENT BORROWING REPORT TABLE (Item 23) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PackageOpen size={18} className="text-purple-600" />
            <span className="font-bold text-slate-900 text-sm">Equipment Borrowing Reports</span>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {equipmentBorrowings.length}
            </span>
          </div>
        </div>

        {/* Equipment Table: [#, Requestor Name, Equipment, Quantity, Dept / Office, Purpose, Violation, Late Return] */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {["#", "Requestor Name", "Equipment", "Quantity", "Dept / Office (External)", "Purpose", "Violation & Evidence", "Late Return"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {equipmentBorrowings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No equipment borrowing records recorded in report history.
                  </td>
                </tr>
              ) : (
                equipmentBorrowings.map((eb, idx) => (
                  <tr key={eb.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-400">{idx + 1}</td>
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
                      {eb.violation || eb.status === 'damaged' || eb.status === 'lost' ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            eb.status === 'lost' ? 'bg-red-900 text-white' : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}>
                            {eb.violation || (eb.status === 'lost' ? 'Lost Item' : 'Damaged Equipment')}
                          </span>
                          {eb.evidence_image && (
                            <button
                              onClick={() => setEvidenceModalImage(eb.evidence_image)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"
                              title="View Evidence Image"
                            >
                              <ImageIcon size={14} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          None (Intact)
                        </span>
                      )}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidence Image Viewer Modal (Clean White Header - Item 35) */}
      {evidenceModalImage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <ImageIcon size={18} className="text-blue-600" />
                Inspection Evidence Photo
              </h3>
              <button onClick={() => setEvidenceModalImage(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
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
