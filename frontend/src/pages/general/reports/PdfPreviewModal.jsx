import React, { useState, useEffect } from "react";
import { Printer, Download, X, Loader2, Edit3 } from "lucide-react";

export default function PdfPreviewModal({
  open,
  onClose,
  tabLabels = {},
  activeTab = "booking_borrowing",
  officeScope = "All Offices",
  user,
  isExportingPdf,
  onDownloadPDF,
  onPrintPDF,
  filteredVenueBookings = [],
  filteredEquipmentBorrowings = [],
  filteredRuleViolations = [],
  filteredInventoryItems = [],
  filteredUnits = [],
  currentVenueNotes = "",
  currentEquipNotes = "",
  currentBreachesNotes = "",
}) {
  const defaultTitle = tabLabels[activeTab] || "Official Report";
  const [editableReportTitle, setEditableReportTitle] = useState(defaultTitle);
  const [editableVenueNotes, setEditableVenueNotes] = useState(currentVenueNotes || "");
  const [editableEquipNotes, setEditableEquipNotes] = useState(currentEquipNotes || "");
  const [editableBreachesNotes, setEditableBreachesNotes] = useState(currentBreachesNotes || "");

  useEffect(() => {
    setEditableReportTitle(tabLabels[activeTab] || "Official Report");
  }, [activeTab, tabLabels]);

  useEffect(() => {
    setEditableVenueNotes(currentVenueNotes || "");
  }, [currentVenueNotes]);

  useEffect(() => {
    setEditableEquipNotes(currentEquipNotes || "");
  }, [currentEquipNotes]);

  useEffect(() => {
    setEditableBreachesNotes(currentBreachesNotes || "");
  }, [currentBreachesNotes]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header Toolbar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0 bg-slate-50/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Printer size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                {tabLabels[activeTab] || "Official Report Preview"}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-semibold mt-0.5">
                <Edit3 size={11} />
                <span>Editable Preview — Click any title or remarks below to customize before export</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isExportingPdf}
              onClick={onDownloadPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-xs cursor-pointer transition-all disabled:opacity-50"
              title="Download and save complete multi-page PDF file to device"
            >
              {isExportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{isExportingPdf ? "Saving PDF..." : "Download PDF File"}</span>
            </button>
            <button
              type="button"
              onClick={onPrintPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-extrabold shadow-xs cursor-pointer transition-all"
              title="Print paper copy"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Container for Preview */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-8 bg-slate-100/50">
          {/* Printable Report Document Body (Natural height, no internal overflow clipping) */}
          <div
            id="printable-report-area"
            className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 sm:p-10 space-y-6 text-xs print:p-0 print:border-0 print:shadow-none font-sans max-w-4xl mx-auto"
          >
            {/* Official Document Letterhead */}
            <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Father Saturnino Urios University
              </p>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight uppercase">
                Audio-Visual Resource Center (AVRC)
              </h2>
              <h3
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => setEditableReportTitle(e.currentTarget.textContent || defaultTitle)}
                className="text-sm font-extrabold text-blue-900 hover:bg-blue-50/50 p-1 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-text"
                title="Click to edit report title"
              >
                {editableReportTitle}
              </h3>
              <div className="flex items-center justify-center gap-3 text-[11px] font-semibold text-slate-500 pt-1">
                <span>Scope: <strong className="text-slate-700">{officeScope}</strong></span>
                <span>•</span>
                <span>Date: <strong className="text-slate-700">{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong></span>
                <span>•</span>
                <span>Prepared By: <strong className="text-slate-700">{user?.name || "System Admin"}</strong></span>
              </div>
            </div>

            {/* Tab 1: Booking & Borrowing Report (BOTH TABLES INCLUDED) */}
            {activeTab === "booking_borrowing" && (
              <div className="space-y-8">
                {/* 1. Venue Bookings Table */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                      Venue Reservation Records ({filteredVenueBookings.length} total)
                    </h4>
                    <span className="text-[10.5px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      {filteredVenueBookings.length} Bookings
                    </span>
                  </div>

                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 text-[11px] font-extrabold uppercase tracking-wider">
                        <th className="border border-slate-300 p-2.5 text-center w-10">#</th>
                        <th className="border border-slate-300 p-2.5 text-left">Track No.</th>
                        <th className="border border-slate-300 p-2.5 text-left">Requestor</th>
                        <th className="border border-slate-300 p-2.5 text-left">Venue</th>
                        <th className="border border-slate-300 p-2.5 text-left">Date</th>
                        <th className="border border-slate-300 p-2.5 text-left">Department</th>
                        <th className="border border-slate-300 p-2.5 text-left">Purpose</th>
                        <th className="border border-slate-300 p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVenueBookings.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="border border-slate-300 p-4 text-center text-slate-400 italic">
                            No venue booking records found.
                          </td>
                        </tr>
                      ) : (
                        filteredVenueBookings.map((b, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="border border-slate-300 p-2.5 text-center text-slate-500 font-bold">{i + 1}</td>
                            <td className="border border-slate-300 p-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                              {b.tracking_number?.reference_code || b.reference_code || `TRK-AVR${b.id}`}
                            </td>
                            <td className="border border-slate-300 p-2.5 font-extrabold text-slate-900">{b.filer_name || b.requestor_name || "—"}</td>
                            <td className="border border-slate-300 p-2.5 font-semibold text-slate-800">{b.venue?.name || "AVR Main Hall"}</td>
                            <td className="border border-slate-300 p-2.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                              {b.start_datetime ? new Date(b.start_datetime).toLocaleDateString() : (b.date_of_usage || "—")}
                            </td>
                            <td className="border border-slate-300 p-2.5 text-slate-700">{b.department || b.program_office || "—"}</td>
                            <td className="border border-slate-300 p-2.5 text-slate-700 max-w-[160px] truncate">{b.purpose || b.activity_name || "—"}</td>
                            <td className="border border-slate-300 p-2.5 text-center font-bold uppercase text-[10.5px]">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                                {b.status || b.tracking_number?.status || "PENDING"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Venue Report Remarks */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                      Venue Observations &amp; Remarks:
                    </span>
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => setEditableVenueNotes(e.currentTarget.textContent || "")}
                      className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap hover:bg-white p-1 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-text"
                      title="Click to edit remarks"
                    >
                      {editableVenueNotes || "No specific observations or executive remarks recorded for venue reservations."}
                    </div>
                  </div>
                </div>

                {/* 2. Equipment Borrowing Table */}
                <div className="space-y-2.5 pt-2 border-t-2 border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                      Equipment Borrowing Records ({filteredEquipmentBorrowings.length} total)
                    </h4>
                    <span className="text-[10.5px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      {filteredEquipmentBorrowings.length} Transactions
                    </span>
                  </div>

                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 text-[11px] font-extrabold uppercase tracking-wider">
                        <th className="border border-slate-300 p-2.5 text-center w-10">#</th>
                        <th className="border border-slate-300 p-2.5 text-left">Track No.</th>
                        <th className="border border-slate-300 p-2.5 text-left">Requestor</th>
                        <th className="border border-slate-300 p-2.5 text-left">Department</th>
                        <th className="border border-slate-300 p-2.5 text-left">Equipment Details</th>
                        <th className="border border-slate-300 p-2.5 text-left">Date</th>
                        <th className="border border-slate-300 p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEquipmentBorrowings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="border border-slate-300 p-4 text-center text-slate-400 italic">
                            No equipment borrowing records found.
                          </td>
                        </tr>
                      ) : (
                        filteredEquipmentBorrowings.map((b, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="border border-slate-300 p-2.5 text-center text-slate-500 font-bold">{i + 1}</td>
                            <td className="border border-slate-300 p-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                              {b.tracking_number?.reference_code || b.reference_code || `TRK-EQP${b.id}`}
                            </td>
                            <td className="border border-slate-300 p-2.5 font-extrabold text-slate-900">{b.filer_name || b.requestor_name || "—"}</td>
                            <td className="border border-slate-300 p-2.5 text-slate-700">{b.department || b.program_office || "—"}</td>
                            <td className="border border-slate-300 p-2.5 font-semibold text-slate-800">
                              {b.items && b.items.length > 0
                                ? b.items.map(it => `${it.quantity_requested || 1}x ${it.equipmentType?.name || it.equipment_type?.name || 'Item'}`).join(', ')
                                : (b.equipment_name || "AV Equipment")}
                            </td>
                            <td className="border border-slate-300 p-2.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                              {b.start_datetime ? new Date(b.start_datetime).toLocaleDateString() : (b.date_of_usage || "—")}
                            </td>
                            <td className="border border-slate-300 p-2.5 text-center font-bold uppercase text-[10.5px]">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                                {b.status || b.tracking_number?.status || "PENDING"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Equipment Report Remarks */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                      Equipment Turnover Remarks:
                    </span>
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => setEditableEquipNotes(e.currentTarget.textContent || "")}
                      className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap hover:bg-white p-1 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-text"
                      title="Click to edit remarks"
                    >
                      {editableEquipNotes || "No specific observations or executive remarks recorded for equipment borrowings."}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Breaches & Violations Report */}
            {activeTab === "breaches" && (
              <div className="space-y-6">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                      Department Breach &amp; Late Return Summary
                    </h4>
                    <span className="text-[10.5px] font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      Audit Exceptions
                    </span>
                  </div>

                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 text-[11px] font-extrabold uppercase tracking-wider">
                        <th className="border border-slate-300 p-2.5 text-center w-10">#</th>
                        <th className="border border-slate-300 p-2.5 text-left">Department / Program</th>
                        <th className="border border-slate-300 p-2.5 text-center">Venue Breaches</th>
                        <th className="border border-slate-300 p-2.5 text-left">Equipment Violations Breakdown</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRuleViolations.length > 0 ? (
                        filteredRuleViolations.map((v, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="border border-slate-300 p-2.5 text-center text-slate-500 font-bold">{i + 1}</td>
                            <td className="border border-slate-300 p-2.5 font-extrabold text-slate-900">{v.department || v.program || "Academic Dept"}</td>
                            <td className="border border-slate-300 p-2.5 text-center text-rose-600 font-extrabold">
                              {v.venue_violations ?? 0} Breaches
                            </td>
                            <td className="border border-slate-300 p-2.5 font-semibold text-slate-800">
                              {`${v.late_returns || 0} Late Return / ${v.equipment_damages || 0} Damaged / ${v.equipment_lost || 0} Lost`}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="border border-slate-300 p-4 text-center text-slate-400 italic">
                            No department breaches recorded in this audit cycle.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Violations Report Remarks */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                      Disciplinary &amp; Compliance Remarks:
                    </span>
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => setEditableBreachesNotes(e.currentTarget.textContent || "")}
                      className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap hover:bg-white p-1 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-text"
                      title="Click to edit remarks"
                    >
                      {editableBreachesNotes || "No specific disciplinary remarks or compliance recommendations recorded."}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Inventory & Stock Report (BOTH TABLES INCLUDED) */}
            {activeTab === "inventory" && (
              <div className="space-y-8">
                {/* 1. Inventory and Stock Summary Table */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                      Inventory and Stock Summary ({filteredInventoryItems.length} Categories)
                    </h4>
                    <span className="text-[10.5px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      Catalog Overview
                    </span>
                  </div>

                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 text-[11px] font-extrabold uppercase tracking-wider">
                        <th className="border border-slate-300 p-2 text-center w-14">Code</th>
                        <th className="border border-slate-300 p-2 text-left">Category / Equipment Name</th>
                        <th className="border border-slate-300 p-2 text-center">Total</th>
                        <th className="border border-slate-300 p-2 text-center">Available</th>
                        <th className="border border-slate-300 p-2 text-center">Reserved</th>
                        <th className="border border-slate-300 p-2 text-center">Released</th>
                        <th className="border border-slate-300 p-2 text-center">Damaged</th>
                        <th className="border border-slate-300 p-2 text-center">Lost</th>
                        <th className="border border-slate-300 p-2 text-left">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventoryItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="border border-slate-300 p-4 text-center text-slate-400 italic">
                            No equipment stock inventory records found.
                          </td>
                        </tr>
                      ) : (
                        filteredInventoryItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="border border-slate-300 p-2 font-mono font-bold text-slate-700 text-center">
                              EQ-{String(idx + 1).padStart(3, "0")}
                            </td>
                            <td className="border border-slate-300 p-2 font-extrabold text-slate-900">
                              {item.eq_type || item.eq_name || item.name || "Equipment"}
                            </td>
                            <td className="border border-slate-300 p-2 text-center font-bold">{item.calculated_total ?? item.total_quantity ?? 0}</td>
                            <td className="border border-slate-300 p-2 text-center font-bold text-emerald-600">{item.calculated_available ?? item.available_count ?? 0}</td>
                            <td className="border border-slate-300 p-2 text-center font-bold text-indigo-600">{item.reserved_count ?? item.reserved ?? 0}</td>
                            <td className="border border-slate-300 p-2 text-center font-bold text-blue-600">{item.released_count ?? 0}</td>
                            <td className="border border-slate-300 p-2 text-center font-bold text-rose-600">{item.damaged_count ?? 0}</td>
                            <td className="border border-slate-300 p-2 text-center font-bold text-amber-600">{item.lost_count ?? 0}</td>
                            <td className="border border-slate-300 p-2 text-slate-600 truncate max-w-[140px]">{item.description || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 2. Physical Equipment Units Table */}
                <div className="space-y-2.5 pt-2 border-t-2 border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                      Physical Equipment Units ({filteredUnits.length} Units Registered)
                    </h4>
                    <span className="text-[10.5px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Unit Asset Registry
                    </span>
                  </div>

                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 text-[11px] font-extrabold uppercase tracking-wider">
                        <th className="border border-slate-300 p-2.5 text-center w-10">#</th>
                        <th className="border border-slate-300 p-2.5 text-left">Unit Barcode</th>
                        <th className="border border-slate-300 p-2.5 text-left">Equipment Unit Name</th>
                        <th className="border border-slate-300 p-2.5 text-left">Assigned Category</th>
                        <th className="border border-slate-300 p-2.5 text-center">Status</th>
                        <th className="border border-slate-300 p-2.5 text-center">Condition</th>
                        <th className="border border-slate-300 p-2.5 text-left">Date Purchased</th>
                        <th className="border border-slate-300 p-2.5 text-center">Lifespan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUnits.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="border border-slate-300 p-4 text-center text-slate-400 italic">
                            No physical equipment units found.
                          </td>
                        </tr>
                      ) : (
                        filteredUnits.map((u, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="border border-slate-300 p-2.5 text-center text-slate-500 font-bold">{i + 1}</td>
                            <td className="border border-slate-300 p-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                              {u.barcode || `UNIT-${u.id}`}
                            </td>
                            <td className="border border-slate-300 p-2.5 font-semibold text-slate-900">{u.name || "Equipment Unit"}</td>
                            <td className="border border-slate-300 p-2.5 text-slate-700">{u.category || "AV Equipment"}</td>
                            <td className="border border-slate-300 p-2.5 text-center font-bold uppercase text-[10px]">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                                {u.status || "AVAILABLE"}
                              </span>
                            </td>
                            <td className="border border-slate-300 p-2.5 text-center font-bold text-[11px]">
                              <span className={
                                u.condition === "Damaged" ? "text-rose-600" :
                                u.condition === "Lost" ? "text-amber-600" :
                                u.condition === "Under Repair" ? "text-purple-600" :
                                "text-emerald-600"
                              }>
                                {u.condition || "Good"}
                              </span>
                            </td>
                            <td className="border border-slate-300 p-2.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                              {u.date_purchased || "—"}
                            </td>
                            <td className="border border-slate-300 p-2.5 text-center text-slate-700 font-medium">
                              {u.lifespan_years || 5} yrs
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 4: Equipment Out Report */}
            {activeTab === "equipment_out" && (
              <div className="space-y-6">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                      Equipment Out / Dispatched Log ({filteredEquipmentBorrowings.filter(b => ["ongoing", "on-going", "released"].includes((b.status || "").toLowerCase())).length} Active)
                    </h4>
                    <span className="text-[10.5px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Active Loans
                    </span>
                  </div>

                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 text-[11px] font-extrabold uppercase tracking-wider">
                        <th className="border border-slate-300 p-2.5 text-center w-10">#</th>
                        <th className="border border-slate-300 p-2.5 text-left">Track No.</th>
                        <th className="border border-slate-300 p-2.5 text-left">Requestor</th>
                        <th className="border border-slate-300 p-2.5 text-left">Department</th>
                        <th className="border border-slate-300 p-2.5 text-left">Equipment Out</th>
                        <th className="border border-slate-300 p-2.5 text-left">Dispatch Schedule</th>
                        <th className="border border-slate-300 p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEquipmentBorrowings.filter(b => ["ongoing", "on-going", "released"].includes((b.status || "").toLowerCase())).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="border border-slate-300 p-4 text-center text-slate-400 italic">
                            No active equipment out records at this time.
                          </td>
                        </tr>
                      ) : (
                        filteredEquipmentBorrowings.filter(b => ["ongoing", "on-going", "released"].includes((b.status || "").toLowerCase())).map((b, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="border border-slate-300 p-2.5 text-center text-slate-500 font-bold">{i + 1}</td>
                            <td className="border border-slate-300 p-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                              {b.tracking_number?.reference_code || b.reference_code || `TRK-EQP${b.id}`}
                            </td>
                            <td className="border border-slate-300 p-2.5 font-extrabold text-slate-900">{b.filer_name || b.requestor_name || "—"}</td>
                            <td className="border border-slate-300 p-2.5 text-slate-700">{b.department || b.program_office || "—"}</td>
                            <td className="border border-slate-300 p-2.5 font-semibold text-slate-800">
                              {b.items && b.items.length > 0
                                ? b.items.map(it => `${it.quantity_requested || 1}x ${it.equipmentType?.name || it.equipment_type?.name || 'Item'}`).join(', ')
                                : (b.equipment_name || "AV Equipment")}
                            </td>
                            <td className="border border-slate-300 p-2.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                              {b.start_datetime ? new Date(b.start_datetime).toLocaleDateString() : (b.date_of_usage || "—")}
                            </td>
                            <td className="border border-slate-300 p-2.5 text-center font-bold uppercase text-[10.5px]">
                              <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">
                                {b.status || "ONGOING"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Official Sign-Off Footer */}
            <div className="pt-8 flex justify-between items-end border-t-2 border-slate-900 text-xs">
              <div className="space-y-0.5">
                <p className="text-slate-400 font-semibold text-[11px]">Certified Official Audit Copy</p>
                <p className="font-extrabold text-slate-900">Father Saturnino Urios University</p>
                <p className="text-[10.5px] text-slate-500 font-mono">AVRC Inventory &amp; Operations Management System</p>
              </div>
              <div className="text-right space-y-6">
                <p className="font-bold text-slate-500 text-[11px]">Prepared &amp; Verified By:</p>
                <div className="border-t border-slate-900 pt-1.5 font-extrabold text-slate-900 min-w-[200px]">
                  {user?.name || "AVR Administrator"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
