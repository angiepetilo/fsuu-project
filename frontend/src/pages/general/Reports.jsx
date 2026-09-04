import { useState, useEffect, useMemo } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import api from "@/lib/axios";
import { fetchWithCache } from "@/lib/apiCache";
import BookingBorrowingReportTab from "./reports/BookingBorrowingReportTab";
import BreachesTab from "./reports/BreachesTab";
import EquipmentStockTab from "./reports/EquipmentStockTab";
import EquipmentOutTab from "./reports/EquipmentOutTab";
import PdfPreviewModal from "./reports/PdfPreviewModal";
import { downloadReportAsPdf } from "./reports/exportPdfHelper";
import {
  FileBarChart2, FileText, Download, ShieldAlert, PackageOpen, CheckCircle2,
  Building2, Printer, X, Loader2
} from "lucide-react";

export default function Reports() {
  const { user, isStaff, isSuperAdmin, isStudentAssistant, hasPermission } = usePermissions();

  const context = useOutletContext();
  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  if (!hasPermission("reports")) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3 mt-12 bg-white rounded-3xl border border-slate-200 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <FileBarChart2 size={24} />
        </div>
        <h3 className="text-sm font-extrabold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 font-medium">
          You do not have permission to view Reports.
        </p>
      </div>
    );
  }

  const ALL_REPORT_TABS = [
    { id: "booking_borrowing", label: "Booking & Borrowing Report", permissionKey: "reports.booking_borrowing" },
    { id: "breaches",          label: "Rule & Late Return Violations", permissionKey: "reports.breaches" },
    { id: "inventory",         label: "Equipment Inventory",         permissionKey: "reports.inventory" },
    { id: "equipment_out",     label: "Equipment Out",               permissionKey: "reports.equipment_out" },
  ];

  const visibleReportTabs = ALL_REPORT_TABS.filter((tab) => {
    if (isSuperAdmin) return true;
    if (!hasPermission("reports")) return false;
    return hasPermission(tab.permissionKey);
  });

  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialTab = () => {
    const urlTab = searchParams.get("tab");
    if (urlTab && visibleReportTabs.some(t => t.id === urlTab)) return urlTab;
    return visibleReportTabs[0]?.id || "booking_borrowing";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [mountedTabs, setMountedTabs] = useState(() => new Set([getInitialTab()]));

  useEffect(() => {
    if (visibleReportTabs.length > 0 && !visibleReportTabs.some(t => t.id === activeTab)) {
      const nextTab = visibleReportTabs[0].id;
      setActiveTab(nextTab);
      setMountedTabs(prev => new Set([...prev, nextTab]));
    }
  }, [visibleReportTabs, activeTab]);

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
        const termsData = await fetchWithCache("academic_terms_list", () => api.get("/general/academic-terms").then(r => r.data));
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
        api.get(`/general/history-log${termParam}`).catch(() => ({ data: { venue_bookings: [], equipment_borrowings: [] } })),
        api.get(`/general/department-analytics${termParam}`).catch(() => ({ data: { rule_violations: [], late_returns: [] } })),
        api.get("/general/equipment-types").then(r => r.data).catch(() => []),
        api.get("/general/equipment-units").then(r => r.data).catch(() => []),
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
      const bCode = String(u.barcode || `BC-EQP-2026-00${idx + 1}`).trim();
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

  useRealtimeSync(fetchReportsData, { interval: 45000, deps: [selectedTermId] });

  const tabLabels = {
    booking_borrowing: "Booking & Borrowing Report",
    breaches: "Rule & Late Return Violations",
    inventory: "Inventory and Stock",
  };

  // ── DIRECT PDF DOWNLOAD (Generates and saves .pdf file to user's device) ──
  const handleDownloadPDF = async () => {
    const cleanTab = (tabLabels[activeTab] || "Report").replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `FSUU_${cleanTab}_${new Date().toISOString().slice(0, 10)}.pdf`;

    await downloadReportAsPdf({
      elementId: "printable-report-area",
      filename,
      onStart: () => setIsExportingPdf(true),
      onComplete: () => {
        setIsExportingPdf(false);
        setFeedback(`✅ ${tabLabels[activeTab]} PDF file saved to your device.`);
        setTimeout(() => setFeedback(null), 3500);
      },
      onError: (err) => {
        setIsExportingPdf(false);
        setFeedback(`❌ PDF generation failed: ${err?.message || "Unknown error"}`);
        setTimeout(() => setFeedback(null), 5000);
      },
    });
  };

  // ── PRINT PREVIEW ──
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
        {(isSuperAdmin || hasPermission("reports.export_pdf") || hasPermission("reports")) && (
          <button
            type="button"
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
            title={`Preview / Export ${tabLabels[activeTab]} as PDF`}
          >
            <Printer size={14} className="text-blue-600" />
            <span>Export PDF</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-2 shadow-2xs animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tabs Bar with Semester Filter Aligned to the Right */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {visibleReportTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
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

        {/* Semester filter aligned in the 4 tabs on the right side */}
        {academicTerms.length > 0 && (
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs self-end md:self-auto shrink-0">
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
      </div>

      {/* Render Active Tab Component */}
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

      {mountedTabs.has("equipment_out") && (
        <div className={activeTab === "equipment_out" ? "block" : "hidden"}>
          <EquipmentOutTab
            equipmentBorrowings={filteredEquipmentBorrowings}
            loading={loading}
          />
        </div>
      )}

      {/* ── PDF PRINT PREVIEW MODAL ── */}
      <PdfPreviewModal
        open={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        tabLabels={tabLabels}
        activeTab={activeTab}
        officeScope={officeScope}
        user={user}
        isExportingPdf={isExportingPdf}
        onDownloadPDF={handleDownloadPDF}
        onPrintPDF={handlePrintPDF}
        filteredVenueBookings={filteredVenueBookings}
        filteredEquipmentBorrowings={filteredEquipmentBorrowings}
        filteredRuleViolations={filteredRuleViolations}
        filteredInventoryItems={filteredInventoryItems}
        filteredUnits={filteredUnits}
        currentVenueNotes={currentVenueNotes}
        currentEquipNotes={currentEquipNotes}
        currentBreachesNotes={currentBreachesNotes}
      />
    </div>
  );
}
