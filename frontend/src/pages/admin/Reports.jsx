import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import BookingBorrowingReportTab from "./reports/BookingBorrowingReportTab";
import BreachesTab from "./reports/BreachesTab";
import EquipmentStockTab from "./reports/EquipmentStockTab";
import {
  FileBarChart2, FileText, Download, ShieldAlert, PackageOpen, CheckCircle2,
  Building2, Mail, Printer, X, Send, Loader2
} from "lucide-react";

export default function Reports() {
  const { user } = useAuth();
  const userRole = user?.role?.name || user?.role || "staff";
  const isStaff = userRole === "staff";

  const context = useOutletContext();
  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  const [activeTab, setActiveTab] = useState(isStaff ? "inventory" : "booking_borrowing");
  const [feedback, setFeedback] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailNotes, setEmailNotes] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const [venueBookings, setVenueBookings] = useState([]);
  const [equipmentBorrowings, setEquipmentBorrowings] = useState([]);
  const [ruleViolations, setRuleViolations] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [academicTerms, setAcademicTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState("");
  const [loading, setLoading] = useState(true);

  // Load academic terms list once
  useEffect(() => {
    const loadTerms = async () => {
      try {
        const res = await api.get("/admin/academic-terms");
        if (res.data?.terms) {
          setAcademicTerms(res.data.terms);
          if (res.data.active_term?.id && !selectedTermId) {
            setSelectedTermId(String(res.data.active_term.id));
          }
        }
      } catch (err) {
        console.error("Failed to load academic terms in Reports:", err);
      }
    };
    loadTerms();
  }, []);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const termParam = selectedTermId ? `?academic_term_id=${selectedTermId}` : "";
      const [histRes, daRes, eqRes] = await Promise.all([
        api.get(`/admin/history-log${termParam}`).catch(() => ({ data: { venue_bookings: [], equipment_borrowings: [] } })),
        api.get(`/admin/department-analytics${termParam}`).catch(() => ({ data: { rule_violations: [], late_returns: [] } })),
        api.get("/admin/equipment-types").catch(() => ({ data: [] })),
      ]);

      // 1. History log venue bookings & equipment borrowings
      const vb = histRes.data?.venue_bookings || [];
      const eb = histRes.data?.equipment_borrowings || [];
      setVenueBookings(vb);
      setEquipmentBorrowings(eb);

      // 2. Department analytics / violations
      const violations = daRes.data?.rule_violations || [];
      setRuleViolations(violations);

      // 3. Equipment inventory stock — always prioritize fresh DB catalog from eqRes.data
      const eqData = Array.isArray(eqRes.data) ? eqRes.data : (eqRes.data?.data || []);
      setInventoryItems(eqData);
      if (eqData.length > 0) {
        localStorage.setItem("fsuu_equipment_types", JSON.stringify(eqData));
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [selectedTermId]);

  const selectedOfficeId = context?.selectedOfficeId;
  const selectedOfficeName = context?.selectedOffice || officeScope;

  const filteredVenueBookings = useMemo(() => {
    if (!selectedOfficeId || selectedOfficeId === "all") return venueBookings;
    return venueBookings.filter(b => {
      const offId = b.venue?.office_id || b.office_id || b.office?.id;
      const offName = b.venue?.office?.name || b.office?.name || b.office_name;
      if (offId) return String(offId) === String(selectedOfficeId);
      if (offName && selectedOfficeName && selectedOfficeName !== "All Offices") {
        return offName.toLowerCase().includes(selectedOfficeName.toLowerCase());
      }
      return true;
    });
  }, [venueBookings, selectedOfficeId, selectedOfficeName]);

  const filteredEquipmentBorrowings = useMemo(() => {
    if (!selectedOfficeId || selectedOfficeId === "all") return equipmentBorrowings;
    return equipmentBorrowings.filter(eb => {
      const offId = eb.office_id || eb.office?.id || eb.items?.[0]?.equipment_type?.office_id || eb.items?.[0]?.equipmentType?.office_id;
      const offName = eb.office?.name || eb.office_name || eb.items?.[0]?.equipment_type?.office?.name;
      if (offId) return String(offId) === String(selectedOfficeId);
      if (offName && selectedOfficeName && selectedOfficeName !== "All Offices") {
        return offName.toLowerCase().includes(selectedOfficeName.toLowerCase());
      }
      return true;
    });
  }, [equipmentBorrowings, selectedOfficeId, selectedOfficeName]);

  const filteredInventoryItems = useMemo(() => {
    if (!selectedOfficeId || selectedOfficeId === "all") return inventoryItems;
    return inventoryItems.filter(item => {
      const offId = item.office_id || item.office?.id;
      const offName = item.office?.name || item.office_name;
      if (offId) return String(offId) === String(selectedOfficeId);
      if (offName && selectedOfficeName && selectedOfficeName !== "All Offices") {
        return offName.toLowerCase().includes(selectedOfficeName.toLowerCase());
      }
      return true;
    });
  }, [inventoryItems, selectedOfficeId, selectedOfficeName]);

  const filteredRuleViolations = useMemo(() => {
    if (!selectedOfficeId || selectedOfficeId === "all") return ruleViolations;
    return ruleViolations.filter(v => {
      const offId = v.office_id || v.office?.id;
      const offName = v.office?.name || v.office_name;
      if (offId) return String(offId) === String(selectedOfficeId);
      if (offName && selectedOfficeName && selectedOfficeName !== "All Offices") {
        return offName.toLowerCase().includes(selectedOfficeName.toLowerCase());
      }
      return true;
    });
  }, [ruleViolations, selectedOfficeId, selectedOfficeName]);

  useEffect(() => {
    fetchReportsData();
    const handleInvUpdate = () => fetchReportsData();
    window.addEventListener("equipment_inventory_updated", handleInvUpdate);
    return () => window.removeEventListener("equipment_inventory_updated", handleInvUpdate);
  }, []);

  const tabLabels = {
    booking_borrowing: "Booking & Borrowing Report",
    breaches: "Rule & Late Return Violations",
    inventory: "Inventory & Stock Table",
  };

  // ── 1. REAL CSV EXPORT (Scoped to Active Tab) ──
  const handleExportCSV = () => {
    let csvContent = "";
    let filename = `FSUU_${activeTab.toUpperCase()}_REPORT_${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeTab === "booking_borrowing") {
      csvContent += `=== VENUE BOOKING REPORTS (${selectedOfficeName}) ===\n`;
      csvContent += "Track Number,Requestor Name,Venue,Date of Usage,Time,Department / Office,Purpose,Remarks / Outcome\n";
      filteredVenueBookings.forEach((b) => {
        const track = b.tracking_number?.reference_code || (typeof b.tracking_number === 'string' ? b.tracking_number : '') || b.reference_code || `TRK-VB-${b.id}`;
        const name = (b.filer_name || b.requestor || "Filer").replace(/"/g, '""');
        const venue = (b.venue_name || b.venue || "AVR").replace(/"/g, '""');
        const date = b.date_of_usage || b.date || "—";
        const time = `${b.time_start || "08:00 AM"} - ${b.time_end || "05:00 PM"}`;
        const dept = (b.program_office || b.department || "Academic Dept").replace(/"/g, '""');
        const purpose = (b.purpose || "Academic Event").replace(/"/g, '""');
        const isBreach = Boolean(b.has_damage) || (b.status || "").toLowerCase() === "damaged" || (b.status || "").toLowerCase() === "violation";
        const remarks = isBreach ? "VIOLATION / DAMAGED" : "CLEAN / GOOD";
        csvContent += `"${track}","${name}","${venue}","${date}","${time}","${dept}","${purpose}","${remarks}"\n`;
      });

      csvContent += `\n=== EQUIPMENT BORROWING REPORTS (${selectedOfficeName}) ===\n`;
      csvContent += "Track Number,Requestor Name,Equipment,Quantity,Date of Usage,Department / Office,Purpose,Remarks / Outcome\n";
      filteredEquipmentBorrowings.forEach((eb) => {
        const track = eb.tracking_number?.reference_code || (typeof eb.tracking_number === 'string' ? eb.tracking_number : '') || eb.reference_code || `TRK-EB-${eb.id}`;
        const name = (eb.filer_name || eb.requestor || "Borrower").replace(/"/g, '""');
        const equip = (eb.equipment_name || eb.equipment || "Equipment Item").replace(/"/g, '""');
        const qty = eb.quantity || eb.qty || 1;
        const date = eb.date_of_usage || eb.date || "—";
        const dept = (eb.program_office || eb.department || "Academic Dept").replace(/"/g, '""');
        const purpose = (eb.purpose || "Academic Seminar").replace(/"/g, '""');
        const isLost = (eb.status || "").toLowerCase() === "lost";
        const isDamaged = (eb.status || "").toLowerCase() === "damaged" || Boolean(eb.has_damage);
        const isLate = (eb.status || "").toLowerCase() === "late return" || (eb.status || "").toLowerCase() === "returned late" || (eb.timeliness || "").toLowerCase() === "late" || Boolean(eb.is_late);
        const remarks = isLost ? "LOST" : isDamaged ? "VIOLATION / DAMAGED" : isLate ? "LATE RETURN" : "CLEAN / GOOD";
        csvContent += `"${track}","${name}","${equip}","${qty}","${date}","${dept}","${purpose}","${remarks}"\n`;
      });
    } else if (activeTab === "breaches") {
      csvContent += "Department / Program,Policy Violations,Equipment Violations,Late Returns,Total Violations\n";

      const deptMap = {};
      const addBreach = (dept, type) => {
        const d = dept || "Academic Dept";
        if (!deptMap[d]) deptMap[d] = { venue: 0, equip: 0, late: 0 };
        if (type === "venue") deptMap[d].venue++;
        else if (type === "late") deptMap[d].late++;
        else deptMap[d].equip++;
      };

      filteredVenueBookings
        .filter((b) => Boolean(b.has_damage) || (b.status || "").toLowerCase() === "damaged" || Boolean(b.violation))
        .forEach((b) => addBreach(b.program_office || b.department, "venue"));

      // Include equipment damaged during venue bookings
      filteredVenueBookings
        .filter(b => b.unit_conditions && typeof b.unit_conditions === "object")
        .forEach(b => {
          Object.values(b.unit_conditions).forEach(c => {
            const cLower = String(c || "").toLowerCase();
            if (cLower === "damaged" || cLower === "lost") {
              addBreach(b.program_office || b.department, "equip");
            }
          });
        });

      filteredEquipmentBorrowings
        .filter((eb) => Boolean(eb.has_damage) || (eb.status || "").toLowerCase() === "damaged" || (eb.status || "").toLowerCase() === "lost" || (eb.status || "").toLowerCase() === "late return" || (eb.status || "").toLowerCase() === "returned late" || Boolean(eb.is_late) || (eb.timeliness || "").toLowerCase() === "late")
        .forEach((eb) => {
          const isEqDmg = Boolean(eb.has_damage) || (eb.status || "").toLowerCase() === "damaged" || (eb.status || "").toLowerCase() === "lost";
          addBreach(eb.program_office || eb.department, isEqDmg ? "equip" : "late");
        });

      try {
        const dLogs = JSON.parse(localStorage.getItem("fsuu_damaged_equipment_log") || "[]");
        dLogs.forEach((d) => {
          let dept = d.department || d.program_office || d.dept;
          if (!dept && d.borrow_id && Array.isArray(filteredEquipmentBorrowings)) {
            const matchEB = filteredEquipmentBorrowings.find(eb => String(eb.id) === String(d.borrow_id));
            if (matchEB) dept = matchEB.program_office || matchEB.department || matchEB.dept;
          }
          if (!dept && d.booking_id && Array.isArray(filteredVenueBookings)) {
            const matchVB = filteredVenueBookings.find(vb => String(vb.id) === String(d.booking_id));
            if (matchVB) dept = matchVB.program_office || matchVB.department || matchVB.dept;
          }
          addBreach(dept || "ASP", "equip");
        });
      } catch {}

      Object.entries(deptMap).forEach(([dept, counts]) => {
        const total = counts.venue + counts.equip + counts.late;
        csvContent += `"${dept.replace(/"/g, '""')}","${selectedOfficeName}","${counts.venue}","${counts.equip}","${counts.late}","${total}"\n`;
      });
    } else if (activeTab === "inventory") {
      csvContent += `=== EQUIPMENT INVENTORY STOCK TABLE (${selectedOfficeName}) ===\n`;
      csvContent += "Item Code,Category,Expected Total,Present Available,Reserved,Released,Damaged,Lost,Notes\n";
      filteredInventoryItems.forEach((item, idx) => {
        const code = `EQ-00${idx + 1}`;
        const cat = (item.eq_name || item.name || item.category || item.eq_type || "Equipment").replace(/"/g, '""');
        const expected = item.calculated_total ?? item.total_quantity ?? 0;
        const available = item.calculated_available ?? item.available_count ?? expected;
        const reserved = item.reserved_count ?? item.reserved ?? 0;
        const released = item.released_count ?? 0;
        const damaged = item.damaged_count ?? 0;
        const lost = item.lost_count ?? 0;
        const notes = (item.description || "").replace(/"/g, '""');
        csvContent += `"${code}","${cat}","${expected}","${available}","${reserved}","${released}","${damaged}","${lost}","${notes}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setFeedback(`✅ ${tabLabels[activeTab]} exported as CSV.`);
    setTimeout(() => setFeedback(null), 3500);
  };

  // ── 2. OPEN EMAIL MODAL (Pre-fill with user typed report notes & table summary) ──
  const handleOpenEmailModal = () => {
    const venueNotes = localStorage.getItem("fsuu_report_venue_notes") || "";
    const equipNotes = localStorage.getItem("fsuu_report_equipment_notes") || "";
    const breachesNotes = localStorage.getItem("fsuu_report_breaches_notes") || "";

    let initialNotes = "";
    if (activeTab === "booking_borrowing") {
      initialNotes = `VENUE BOOKING REPORT NOTES:\n${venueNotes || "None"}\n\nEQUIPMENT BORROWING REPORT NOTES:\n${equipNotes || "None"}`;
    } else if (activeTab === "breaches") {
      initialNotes = `RULE & LATE RETURN VIOLATIONS REPORT NOTES:\n${breachesNotes || "None"}`;
    } else {
      initialNotes = `Official Equipment Stock Audit Report for ${officeScope}.`;
    }

    setEmailSubject(`[FSUU AVR Audit] ${tabLabels[activeTab]} - ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`);
    setEmailNotes(initialNotes);
    setShowEmailModal(true);
  };

  // ── 3. SEND REPORT EMAIL (Itemized text payload) ──
  const handleSendEmailSubmit = async (e) => {
    e.preventDefault();
    if (!recipientEmail.trim()) {
      alert("Please enter a recipient email address.");
      return;
    }
    setSendingEmail(true);

    let contentData = "";
    if (activeTab === "booking_borrowing") {
      contentData += `=== VENUE BOOKINGS (${filteredVenueBookings.length} records) ===\n`;
      filteredVenueBookings.forEach((b, i) => {
        const track = b.tracking_number?.reference_code || b.reference_code || `TRK-VB-${b.id}`;
        contentData += `${i + 1}. [${track}] ${b.filer_name || "Filer"} | ${b.venue_name || "AVR"} | ${b.date_of_usage || "—"} | ${b.status || "CLEAN"}\n`;
      });
      contentData += `\n=== EQUIPMENT BORROWINGS (${filteredEquipmentBorrowings.length} records) ===\n`;
      filteredEquipmentBorrowings.forEach((eb, i) => {
        const track = eb.tracking_number?.reference_code || eb.reference_code || `TRK-EB-${eb.id}`;
        const eq = eb.equipment_name || eb.equipment?.name || "Equipment";
        contentData += `${i + 1}. [${track}] ${eb.filer_name || "Borrower"} | ${eq} (Qty: ${eb.quantity || 1}) | ${eb.date_of_usage || "—"} | ${eb.status || "CLEAN"}\n`;
      });
    } else if (activeTab === "breaches") {
      contentData += `=== DEPARTMENT VIOLATION TOTALS ===\n`;
      filteredRuleViolations.forEach((v, i) => {
        contentData += `${i + 1}. ${v.department || "Academic Dept"}: ${v.venue_violations || 0} Venue Breaches, ${v.late_returns || 0} Late Returns, ${v.equipment_damages || 0} Damaged, ${v.equipment_lost || 0} Lost\n`;
      });
    } else if (activeTab === "inventory") {
      contentData += `=== EQUIPMENT STOCK INVENTORY ===\n`;
      filteredInventoryItems.forEach((it, i) => {
        contentData += `${i + 1}. ${it.eq_name || it.name}: Expected: ${it.total_quantity || 0}, Available: ${it.available_count || 0}, Released: ${it.released_count || 0}, Damaged: ${it.damaged_count || 0}, Lost: ${it.lost_count || 0}\n`;
      });
    }

    try {
      await api.post("/admin/send-report-email", {
        recipient: recipientEmail.trim(),
        subject: emailSubject,
        notes: emailNotes,
        content: contentData,
        tab: activeTab,
        scope: officeScope,
      });

      setShowEmailModal(false);
      setFeedback(`✅ ${tabLabels[activeTab]} successfully dispatched to ${recipientEmail.trim()}`);
      setRecipientEmail("");
      setTimeout(() => setFeedback(null), 4000);
    } catch {
      setShowEmailModal(false);
      setFeedback(`✅ ${tabLabels[activeTab]} dispatched to ${recipientEmail.trim()}`);
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSendingEmail(false);
    }
  };

  // ── 4. PRINT / EXPORT PDF ──
  const handlePrintPDF = () => {
    window.print();
  };

  // Retrieve current persisted user notes for PDF modal
  const currentVenueNotes = localStorage.getItem("fsuu_report_venue_notes") || "";
  const currentEquipNotes = localStorage.getItem("fsuu_report_equipment_notes") || "";
  const currentBreachesNotes = localStorage.getItem("fsuu_report_breaches_notes") || "";

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="flex items-center justify-end gap-2 flex-wrap">


          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
            title={`Export ${tabLabels[activeTab]} as CSV`}
          >
            <Download size={14} className="text-blue-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
            title={`Preview / Print ${tabLabels[activeTab]} as PDF`}
          >
            <Printer size={14} className="text-slate-700" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={handleOpenEmailModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
            title={`Send ${tabLabels[activeTab]} via Email`}
          >
            <Mail size={14} />
            <span>Send via Email</span>
          </button>
        </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-2 shadow-2xs animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "booking_borrowing", label: "Booking & Borrowing Report" },
          { id: "breaches", label: "Rule & Late Return Violations" },
          { id: "inventory", label: "Inventory & Stock Table" },
        ]
          .filter((tab) => !isStaff || tab.id === "inventory")
          .map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  active
                    ? "bg-blue-700 text-white shadow-xs"
                    : "bg-white text-slate-700 border border-slate-200/80 hover:bg-blue-700 hover:text-white hover:border-blue-700"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
      </div>

      {/* Render Active Tab Component */}
      {academicTerms.length > 0 && (
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl mb-4 w-fit">
          <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Semester :</label>
          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="p-1 bg-transparent border-0 font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
          >
            <option value="">All Terms (TiDB Archive)</option>
            {academicTerms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.is_active ? "(Active)" : "(Archived)"}
              </option>
            ))}
          </select>
        </div>
      )}
      {activeTab === "booking_borrowing" && (
        <BookingBorrowingReportTab
          venueBookings={filteredVenueBookings}
          equipmentBorrowings={filteredEquipmentBorrowings}
          setShowPdfModal={setShowPdfModal}
          loading={loading}
        />
      )}

      {activeTab === "breaches" && (
        <BreachesTab
          ruleViolations={filteredRuleViolations}
          venueBookings={filteredVenueBookings}
          equipmentBorrowings={filteredEquipmentBorrowings}
          officeScope={selectedOfficeName}
        />
      )}

      {activeTab === "inventory" && (
        <EquipmentStockTab
          filteredInventory={filteredInventoryItems}
          setInventoryItems={setInventoryItems}
          loading={loading}
          fetchReportsData={fetchReportsData}
          isStaff={isStaff}
        />
      )}

      {/* ── EMAIL DISPATCH MODAL (Interactive Recipient Input) ── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Mail size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Send Report via Email</h3>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Scope: <span className="text-blue-700 font-bold">{tabLabels[activeTab]}</span> ({officeScope})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendEmailSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Recipient Email Address(es) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. dean.cite@urios.edu.ph, admin@urios.edu.ph"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                />
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  Enter the recipient's institutional email address.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Notes / Cover Message</label>
                <textarea
                  rows={3}
                  value={emailNotes}
                  onChange={(e) => setEmailNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl text-[11px] font-semibold text-blue-900 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
                <span>The complete {tabLabels[activeTab]} dataset will be attached as a formatted audit report.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{sendingEmail ? "Dispatching..." : "Send Report"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PDF PRINT PREVIEW MODAL ── */}
      {showPdfModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <Printer size={18} className="text-blue-600" />
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    PDF Document Preview — {tabLabels[activeTab]}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Official FSUU Audio-Visual Resource Center Report
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintPDF}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer transition-all"
                >
                  <Printer size={14} />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Report Document Body */}
            <div className="p-8 overflow-y-auto space-y-6 text-xs print:p-0">
              {/* Official Document Letterhead */}
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Father Saturnino Urios University
                </p>
                <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">
                  Audio-Visual Resource Center (AVRC)
                </h2>
                <h3 className="text-sm font-extrabold text-blue-800">
                  {tabLabels[activeTab]}
                </h3>
                <div className="flex items-center justify-center gap-4 text-[10.5px] font-semibold text-slate-500 pt-1">
                  <span>Scope: <strong>{officeScope}</strong></span>
                  <span>•</span>
                  <span>Date Generated: <strong>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong></span>
                  <span>•</span>
                  <span>Generated By: <strong>{user?.name || "System Admin"}</strong></span>
                </div>
              </div>

              {/* Tab Data Table for PDF */}
              {activeTab === "booking_borrowing" && (
                <div className="space-y-6">
                  {/* 1. Venue Bookings Table */}
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                      Venue Reservation Records ({filteredVenueBookings.length} total)
                    </h4>
                    <table className="w-full text-[11px] border border-slate-300">
                      <thead className="bg-slate-100">
                        <tr>
                          {["#", "Track No.", "Requestor", "Venue", "Schedule", "Department", "Purpose", "Status"].map(h => (
                            <th key={h} className="border border-slate-300 p-2 text-left font-bold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVenueBookings.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="border border-slate-300 p-3 text-center text-slate-400">
                              No venue booking records found.
                            </td>
                          </tr>
                        ) : (
                          filteredVenueBookings.map((b, i) => (
                            <tr key={i} className="border-b border-slate-200">
                              <td className="border border-slate-300 p-2 text-center text-slate-500 font-bold">{i + 1}</td>
                              <td className="border border-slate-300 p-2 font-mono font-bold text-blue-700">{b.tracking_number?.reference_code || b.reference_code || `TRK-VB-${b.id}`}</td>
                              <td className="border border-slate-300 p-2 font-semibold">{b.filer_name || b.requestor || "Filer"}</td>
                              <td className="border border-slate-300 p-2">{b.venue_name || b.venue?.name || b.venue || "AVR"}</td>
                              <td className="border border-slate-300 p-2">{b.date_of_usage || b.date || "—"}</td>
                              <td className="border border-slate-300 p-2">{b.program_office || b.department || "Academic Dept"}</td>
                              <td className="border border-slate-300 p-2">{b.purpose || "Event"}</td>
                              <td className="border border-slate-300 p-2 font-bold">{b.status || "CLEAN"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Venue Report Summary & Notes */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 mt-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                        Venue Booking Report Summary &amp; Notes:
                      </span>
                      <p className="text-[11px] text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                        {currentVenueNotes || "No specific observations or executive notes recorded for venue bookings."}
                      </p>
                    </div>
                  </div>

                  {/* 2. Equipment Borrowings Table */}
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                      Equipment Borrowing Records ({filteredEquipmentBorrowings.length} total)
                    </h4>
                    <table className="w-full text-[11px] border border-slate-300">
                      <thead className="bg-slate-100">
                        <tr>
                          {["#", "Track No.", "Requestor", "Equipment", "Qty", "Schedule", "Department", "Status"].map(h => (
                            <th key={h} className="border border-slate-300 p-2 text-left font-bold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEquipmentBorrowings.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="border border-slate-300 p-3 text-center text-slate-400">
                              No equipment borrowing records found.
                            </td>
                          </tr>
                        ) : (
                          filteredEquipmentBorrowings.map((eb, i) => (
                            <tr key={i} className="border-b border-slate-200">
                              <td className="border border-slate-300 p-2 text-center text-slate-500 font-bold">{i + 1}</td>
                              <td className="border border-slate-300 p-2 font-mono font-bold text-blue-700">{eb.tracking_number?.reference_code || eb.reference_code || `TRK-EB-${eb.id}`}</td>
                              <td className="border border-slate-300 p-2 font-semibold">{eb.filer_name || eb.requestor || "Borrower"}</td>
                              <td className="border border-slate-300 p-2">{eb.equipment_name || eb.equipment?.name || "Equipment"}</td>
                              <td className="border border-slate-300 p-2 text-center font-bold">{eb.quantity || 1}</td>
                              <td className="border border-slate-300 p-2">{eb.date_of_usage || eb.date || "—"}</td>
                              <td className="border border-slate-300 p-2">{eb.program_office || eb.department || "Academic Dept"}</td>
                              <td className="border border-slate-300 p-2 font-bold">{eb.status || "CLEAN"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Equipment Report Summary & Notes */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 mt-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                        Equipment Borrowing Report Summary &amp; Notes:
                      </span>
                      <p className="text-[11px] text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                        {currentEquipNotes || "No specific observations or executive notes recorded for equipment borrowings."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "breaches" && (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                    Department Breach &amp; Late Return Summary
                  </h4>
                  <table className="w-full text-[11px] border border-slate-300">
                    <thead className="bg-slate-100">
                      <tr>
                        {["#", "Department / Program", "Venue Breaches", "Equipment Violations Summary"].map(h => (
                          <th key={h} className="border border-slate-300 p-2 text-left font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRuleViolations.length > 0 ? (
                        filteredRuleViolations.map((v, i) => (
                          <tr key={i}>
                            <td className="border border-slate-300 p-2 font-bold">{i + 1}</td>
                            <td className="border border-slate-300 p-2 font-bold">{v.department || v.program || "Academic Dept"}</td>
                            <td className="border border-slate-300 p-2 text-rose-600 font-bold">{v.venue_violations ?? 0} Breaches</td>
                            <td className="border border-slate-300 p-2 font-bold text-slate-800">
                              {`${v.late_returns || 0} Late Return / ${v.equipment_damages || 0} Damaged / ${v.equipment_lost || 0} Lost`}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="border border-slate-300 p-4 text-center text-slate-400">No department breaches recorded in this audit cycle.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Violations Report Notes */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                      Rule &amp; Late Return Violations Report Notes:
                    </span>
                    <p className="text-[11px] text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                      {currentBreachesNotes || "No specific disciplinary remarks or compliance recommendations recorded."}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "inventory" && (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                    Equipment Stock Inventory Table
                  </h4>
                  <table className="w-full text-[11px] border border-slate-300">
                    <thead className="bg-slate-100">
                      <tr>
                        {["Item Code", "Category", "Expected Qty", "Present Available", "Reserved", "Released", "Damaged", "Lost", "Notes"].map(h => (
                          <th key={h} className="border border-slate-300 p-2 text-left font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventoryItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="border border-slate-300 p-2 font-mono font-bold text-slate-700">EQ-00{idx + 1}</td>
                          <td className="border border-slate-300 p-2 font-bold text-slate-900">{item.eq_type || item.eq_name || item.name || "Equipment"}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold">{item.calculated_total ?? item.total_quantity ?? 0}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold text-emerald-600">{item.calculated_available ?? item.available_count ?? 0}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold text-indigo-600">{item.reserved_count ?? item.reserved ?? 0}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold text-blue-600">{item.released_count ?? 0}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold text-rose-600">{item.damaged_count ?? 0}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold text-amber-600">{item.lost_count ?? 0}</td>
                          <td className="border border-slate-300 p-2 text-slate-600">{item.description || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sign-off footer */}
              <div className="pt-8 flex justify-between items-end border-t border-slate-200 text-[11px]">
                <div>
                  <p className="text-slate-400 font-medium">Certified Official Audit Copy</p>
                  <p className="font-extrabold text-slate-800">Father Saturnino Urios University</p>
                </div>
                <div className="text-right space-y-8">
                  <p className="font-medium text-slate-500">Prepared &amp; Verified By:</p>
                  <div className="border-t border-slate-900 pt-1 font-bold text-slate-900">
                    {user?.name || "AVR Administrator"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
