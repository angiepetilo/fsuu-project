import { useState, useEffect, useMemo } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { fetchWithCache } from "@/lib/apiCache";
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

  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialTab = () => {
    const validTabs = ["booking_borrowing", "breaches", "inventory"];
    const urlTab = searchParams.get("tab");
    if (urlTab && validTabs.includes(urlTab)) return urlTab;
    return "booking_borrowing";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [mountedTabs, setMountedTabs] = useState(() => new Set([getInitialTab()]));

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setMountedTabs((prev) => new Set([...prev, tabId]));
    try {
      localStorage.setItem("fsuu_reports_active_tab", tabId);
    } catch {}
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tabId);
      return next;
    }, { replace: true });
  };
  const [feedback, setFeedback] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailNotes, setEmailNotes] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [venueBookings, setVenueBookings] = useState([]);
  const [equipmentBorrowings, setEquipmentBorrowings] = useState([]);
  const [ruleViolations, setRuleViolations] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [academicTerms, setAcademicTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState("");
  const [loading, setLoading] = useState(true);

  // Load academic terms list once with cache
  useEffect(() => {
    const loadTerms = async () => {
      try {
        const termsData = await fetchWithCache("academic_terms_list", () => api.get("/admin/academic-terms").then(r => r.data));
        if (termsData?.terms) {
          setAcademicTerms(termsData.terms);
          if (termsData.active_term?.id && !selectedTermId) {
            setSelectedTermId(String(termsData.active_term.id));
          }
        }
      } catch (err) {
        console.error("Failed to load academic terms in Reports:", err);
      }
    };
    loadTerms();
  }, []);

  const [equipmentUnits, setEquipmentUnits] = useState([]);

  const fetchReportsData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const termParam = selectedTermId ? `?academic_term_id=${selectedTermId}` : "";
      const [histRes, daRes, eqData, unitsRes] = await Promise.all([
        api.get(`/admin/history-log${termParam}`).catch(() => ({ data: { venue_bookings: [], equipment_borrowings: [] } })),
        api.get(`/admin/department-analytics${termParam}`).catch(() => ({ data: { rule_violations: [], late_returns: [] } })),
        api.get("/admin/equipment-types").then(r => r.data).catch(() => []),
        api.get("/admin/equipment-units").then(r => r.data).catch(() => []),
      ]);

      // 1. History log venue bookings & equipment borrowings
      const vb = histRes.data?.venue_bookings || [];
      const eb = histRes.data?.equipment_borrowings || [];
      setVenueBookings(vb);
      setEquipmentBorrowings(eb);

      // 2. Department analytics / violations
      const violations = daRes.data?.rule_violations || [];
      setRuleViolations(violations);

      // 3. Equipment inventory stock (fresh, live, un-cached)
      const eqItems = Array.isArray(eqData) ? eqData : (eqData?.data || []);
      setInventoryItems(eqItems);

      // 4. Physical Equipment Units
      const unitItems = Array.isArray(unitsRes) ? unitsRes : (unitsRes?.data || []);
      setEquipmentUnits(unitItems);
    } catch {
      // Fallback
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();

    // Auto-reload every 10 seconds to catch live updates automatically
    const interval = setInterval(() => {
      fetchReportsData(true);
    }, 10000);

    // Auto-reload on window focus or custom update events
    const handleLiveReload = () => {
      fetchReportsData(true);
    };

    window.addEventListener("focus", handleLiveReload);
    window.addEventListener("equipment_inventory_updated", handleLiveReload);
    window.addEventListener("venue_booking_updated", handleLiveReload);
    window.addEventListener("equipment_borrowing_updated", handleLiveReload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleLiveReload);
      window.removeEventListener("equipment_inventory_updated", handleLiveReload);
      window.removeEventListener("venue_booking_updated", handleLiveReload);
      window.removeEventListener("equipment_borrowing_updated", handleLiveReload);
    };
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

  const filteredUnits = useMemo(() => {
    const rawList = Array.isArray(equipmentUnits) ? equipmentUnits : (equipmentUnits?.data || []);
    return rawList.map((u, idx) => {
      const bCode = String(u.unit_code || u.barcode || `BC-EQP-2026-00${idx + 1}`).trim();
      const dbStatusRaw = (u.status || 'available').toLowerCase();
      const dbCondition = u.condition || '';
      const condLower = dbCondition.toLowerCase();

      let conditionLabel = 'Good';
      if (condLower === 'good' || condLower === 'good condition') conditionLabel = 'Good';
      else if (condLower === 'damaged') conditionLabel = 'Damaged';
      else if (condLower === 'lost') conditionLabel = 'Lost';
      else if (condLower === 'maintenance' || condLower === 'under_maintenance' || condLower === 'under repair') conditionLabel = 'Under Repair';
      else if (condLower === 'worn' || condLower === 'minor wear') conditionLabel = 'Minor Wear';
      else if (dbStatusRaw === 'damaged') conditionLabel = 'Damaged';
      else if (dbStatusRaw === 'maintenance' || dbStatusRaw === 'under_maintenance') conditionLabel = 'Under Repair';
      else if (dbStatusRaw === 'decommissioned' || dbStatusRaw === 'lost') conditionLabel = 'Lost';

      let dbStatus = 'Available';
      if (['lost', 'damaged', 'under repair', 'worn', 'minor wear'].includes(conditionLabel.toLowerCase()) ||
          ['damaged', 'maintenance', 'under_maintenance', 'decommissioned', 'unavailable', 'lost'].includes(dbStatusRaw)) {
        dbStatus = 'Unavailable';
      } else if (dbStatusRaw === 'released' || dbStatusRaw === 'in-use' || dbStatusRaw === 'released / in-use') {
        dbStatus = 'Released';
      } else if (dbStatusRaw === 'reserved') {
        dbStatus = 'Reserved';
      } else {
        dbStatus = 'Available';
      }

      const eqType = u.equipment_type || u.equipmentType || inventoryItems.find(c => String(c.id) === String(u.equipment_type_id));
      const catName = eqType?.eq_name || eqType?.name || eqType?.eq_type || 'AV Equipment';
      const brandModel = [u.brand, u.model].filter(Boolean).join(' ');
      const derivedName = brandModel || catName || 'Equipment Unit';

      return {
        id: u.id || idx + 1,
        equipment_type_id: u.equipment_type_id,
        barcode: bCode,
        name: derivedName,
        category: catName,
        office_id: eqType?.office_id || u.office_id || null,
        office_name: eqType?.office?.name || 'AVR Office I',
        status: dbStatus,
        condition: conditionLabel,
        date_purchased: u.purchased_at ? u.purchased_at.substring(0, 10) : (u.date_purchased || '2026-01-15'),
        lifespan_years: u.eq_lifespan || 5,
        description: u.description || '',
      };
    }).filter(item => {
      if (!selectedOfficeId || selectedOfficeId === "all") return true;
      const offId = item.office_id;
      const offName = item.office_name;
      if (offId && String(offId) !== String(selectedOfficeId)) return false;
      if (offName && officeScope && officeScope !== "All Offices" && !offName.toLowerCase().includes(officeScope.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [equipmentUnits, inventoryItems, selectedOfficeId, officeScope]);

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

  // ── 1. OPEN EMAIL MODAL (Pre-fill with user typed report notes & table summary) ──
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

  // ── 2. SEND REPORT EMAIL (Itemized text payload) ──
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
      contentData += `=== MASTER EQUIPMENT STOCK INVENTORY (${filteredInventoryItems.length} categories) ===\n`;
      filteredInventoryItems.forEach((it, i) => {
        contentData += `${i + 1}. ${it.eq_name || it.name}: Expected: ${it.total_quantity || 0}, Available: ${it.available_count || 0}, Released: ${it.released_count || 0}, Damaged: ${it.damaged_count || 0}, Lost: ${it.lost_count || 0}\n`;
      });
      contentData += `\n=== PHYSICAL EQUIPMENT UNITS (${filteredUnits.length} units) ===\n`;
      filteredUnits.forEach((u, i) => {
        contentData += `${i + 1}. [${u.barcode}] ${u.name} | Category: ${u.category} | Status: ${u.status} | Condition: ${u.condition} | Purchased: ${u.date_purchased}\n`;
      });
    }

    try {
      const res = await api.post("/admin/send-report-email", {
        recipient: recipientEmail.trim(),
        subject: emailSubject,
        notes: emailNotes,
        content: contentData,
        tab: activeTab,
        scope: officeScope,
      });

      setShowEmailModal(false);
      setFeedback(`✅ ${res.data?.message || `${tabLabels[activeTab]} successfully delivered to ${recipientEmail.trim()}`}`);
      setRecipientEmail("");
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setShowEmailModal(false);
      const errMsg = err.response?.data?.message || err.response?.data?.error || "Failed to send email. Please verify SMTP settings in System Settings.";
      setFeedback(`❌ ${errMsg}`);
      setTimeout(() => setFeedback(null), 6000);
    } finally {
      setSendingEmail(false);
    }
  };

  // ── 3. DIRECT PDF DOWNLOAD (Generates and saves .pdf file to user's device) ──
  const handleDownloadPDF = async () => {
    setIsExportingPdf(true);
    try {
      const element = document.getElementById("printable-report-area");
      if (!element) {
        setShowPdfModal(true);
        setTimeout(() => handleDownloadPDF(), 350);
        return;
      }
      const cleanTab = (tabLabels[activeTab] || "Report").replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `FSUU_${cleanTab}_${new Date().toISOString().slice(0, 10)}.pdf`;

      const html2canvasModule = await import("html2canvas-pro");
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
      setFeedback(`✅ ${tabLabels[activeTab]} PDF file saved to your device.`);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error("PDF download failed:", err);
      setFeedback(`❌ PDF generation failed: ${err?.message || "Unknown error"}`);
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // ── 4. PRINT PREVIEW ──
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
          onClick={() => setShowPdfModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
          title={`Preview / Export ${tabLabels[activeTab]} as PDF`}
        >
          <Printer size={14} className="text-blue-600" />
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
        ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
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
      {mountedTabs.has("booking_borrowing") && (
        <div className={activeTab === "booking_borrowing" ? "block" : "hidden"}>
          <BookingBorrowingReportTab
            venueBookings={filteredVenueBookings}
            equipmentBorrowings={filteredEquipmentBorrowings}
            setShowPdfModal={setShowPdfModal}
            loading={loading}
          />
        </div>
      )}

      {mountedTabs.has("breaches") && (
        <div className={activeTab === "breaches" ? "block" : "hidden"}>
          <BreachesTab
            ruleViolations={filteredRuleViolations}
            venueBookings={filteredVenueBookings}
            equipmentBorrowings={filteredEquipmentBorrowings}
            officeScope={selectedOfficeName}
          />
        </div>
      )}

      {mountedTabs.has("inventory") && (
        <div className={activeTab === "inventory" ? "block" : "hidden"}>
          <EquipmentStockTab
            filteredInventory={filteredInventoryItems}
            setInventoryItems={setInventoryItems}
            loading={loading}
            fetchReportsData={fetchReportsData}
            isStaff={isStaff}
          />
        </div>
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
                  disabled={isExportingPdf}
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm cursor-pointer transition-all disabled:opacity-50"
                  title="Download and save as PDF file to device"
                >
                  {isExportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>{isExportingPdf ? "Saving PDF..." : "Download PDF File"}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintPDF}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-extrabold shadow-xs cursor-pointer transition-all"
                  title="Print paper copy"
                >
                  <Printer size={14} />
                  <span>Print</span>
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
            <div id="printable-report-area" className="p-8 overflow-y-auto space-y-6 text-xs print:p-0">
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
                <div className="space-y-6">
                  {/* 1. Master Equipment Stock Inventory Table */}
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                      Master Equipment Stock Summary ({filteredInventoryItems.length} Categories)
                    </h4>
                    <table className="w-full text-[11px] border border-slate-300">
                      <thead className="bg-slate-100">
                        <tr>
                          {["Item Code", "Category / Equipment Name", "Expected Total", "Present Available", "Reserved", "Released", "Damaged", "Lost", "Notes"].map(h => (
                            <th key={h} className="border border-slate-300 p-2 text-left font-bold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInventoryItems.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="border border-slate-300 p-3 text-center text-slate-400">
                              No equipment stock inventory records found.
                            </td>
                          </tr>
                        ) : (
                          filteredInventoryItems.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-200">
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
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 2. Physical Equipment Units Table */}
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                      Physical Equipment Units Inventory ({filteredUnits.length} Units Registered)
                    </h4>
                    <table className="w-full text-[11px] border border-slate-300">
                      <thead className="bg-slate-100">
                        <tr>
                          {["#", "Unit Barcode", "Equipment Unit Name", "Assigned Category", "Status", "Condition", "Date Purchased", "Lifespan"].map(h => (
                            <th key={h} className="border border-slate-300 p-2 text-left font-bold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUnits.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="border border-slate-300 p-3 text-center text-slate-400">
                              No physical equipment units found in this scope.
                            </td>
                          </tr>
                        ) : (
                          filteredUnits.map((u, i) => (
                            <tr key={i} className="border-b border-slate-200">
                              <td className="border border-slate-300 p-2 text-center text-slate-500 font-bold">{i + 1}</td>
                              <td className="border border-slate-300 p-2 font-mono font-bold text-blue-700">{u.barcode || u.unit_code || `UNIT-${u.id}`}</td>
                              <td className="border border-slate-300 p-2 font-semibold text-slate-900">{u.name || "Equipment Unit"}</td>
                              <td className="border border-slate-300 p-2">{u.category || "AV Equipment"}</td>
                              <td className="border border-slate-300 p-2 font-bold uppercase text-[10px]">{u.status || "AVAILABLE"}</td>
                              <td className="border border-slate-300 p-2 font-bold">
                                <span className={u.condition === "Damaged" ? "text-rose-600" : (u.condition === "Lost" ? "text-amber-600" : "text-emerald-600")}>
                                  {u.condition || "Good"}
                                </span>
                              </td>
                              <td className="border border-slate-300 p-2 text-slate-600">{u.date_purchased || "—"}</td>
                              <td className="border border-slate-300 p-2 text-slate-600">{u.lifespan_years || 5} yrs</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
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
