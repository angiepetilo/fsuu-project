import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import api from "@/lib/axios";
import { fetchWithCache } from "@/lib/apiCache";
import { FileBarChart2, CheckCircle2 } from "lucide-react";
import ExportModal, { filterRecordsByBounds } from "@/components/ui/ExportModal";
import ExportButton from "@/components/ui/ExportButton";

// Lazy-loaded Report Sub-Tabs & Modals (only parsed when opened)
const BookingBorrowingReportTab = lazy(() => import("./reports/BookingBorrowingReportTab"));
const BreachesTab = lazy(() => import("./reports/BreachesTab"));
const EquipmentStockTab = lazy(() => import("./reports/EquipmentStockTab"));
const EquipmentOutTab = lazy(() => import("./reports/EquipmentOutTab"));
const IncidentReportsTab = lazy(() => import("./reports/IncidentReportsTab"));
const PdfPreviewModal = lazy(() => import("./reports/PdfPreviewModal"));

const REPORTS_CACHE_KEY = "fsuu_cache_reports_data";

export default function Reports() {
  const { user, isStaff, isSuperAdmin, hasPermission } = usePermissions();

  const context = useOutletContext();
  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  const ALL_REPORT_TABS = [
    { id: "booking_borrowing", label: "Booking & Borrowing Report", permissionKey: "reports.booking_borrowing" },
    { id: "breaches",          label: "Rule & Late Return Violations", permissionKey: "reports.breaches" },
    { id: "inventory",         label: "Equipment Inventory",         permissionKey: "reports.inventory" },
    { id: "equipment_out",     label: "Equipment Out",               permissionKey: "reports.equipment_out" },
    { id: "incident_reports",  label: "Incident & Damage Reports",   permissionKey: "reports.incident_reports" },
  ];

  const visibleReportTabs = useMemo(() => {
    return ALL_REPORT_TABS.filter((tab) => {
      if (isSuperAdmin) return true;
      if (!hasPermission("reports")) return false;
      return hasPermission(tab.permissionKey);
    });
  }, [isSuperAdmin, hasPermission]);

  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialTab = () => {
    let urlTab = searchParams.get("tab");
    if (urlTab === "incidents" || urlTab === "incident") urlTab = "incident_reports";
    if (urlTab === "breach" || urlTab === "violations" || urlTab === "late") urlTab = "breaches";
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

  const switchTab = useCallback((tabId) => {
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
  }, [setSearchParams]);

  const [feedback, setFeedback] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Seed initial state from session cache for instant 0ms render
  const [cachedReports] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(REPORTS_CACHE_KEY) || "null");
    } catch {
      return null;
    }
  });

  const [venueBookings, setVenueBookings] = useState(cachedReports?.venueBookings || []);
  const [equipmentBorrowings, setEquipmentBorrowings] = useState(cachedReports?.equipmentBorrowings || []);
  const [activeEquipmentBorrowings, setActiveEquipmentBorrowings] = useState(cachedReports?.activeEquipmentBorrowings || []);
  const [ruleViolations, setRuleViolations] = useState(cachedReports?.ruleViolations || []);
  const [inventoryItems, setInventoryItems] = useState(cachedReports?.inventoryItems || []);
  const [equipmentUnits, setEquipmentUnits] = useState(cachedReports?.equipmentUnits || []);
  const [academicTerms, setAcademicTerms] = useState([]);
  const [selectedTermId] = useState("");
  const [loading, setLoading] = useState(!cachedReports);

  // Load academic terms list once with cache
  useEffect(() => {
    const loadTerms = async () => {
      try {
        const termsData = await fetchWithCache("academic_terms_list", () => api.get("/general/academic-terms").then(r => r.data));
        if (termsData?.terms) {
          setAcademicTerms(termsData.terms);
        }
      } catch (err) {
        console.error("Failed to load academic terms in Reports:", err);
      }
    };
    loadTerms();
  }, []);

  const fetchReportsData = useCallback(async (opts = false) => {
    if (!hasPermission("reports")) {
      setLoading(false);
      return;
    }
    const isSilent = typeof opts === "object" && opts !== null
      ? Boolean(opts.isSilent || opts.silent || opts.showLoading === false)
      : Boolean(opts);

    if (!isSilent && !cachedReports) setLoading(true);

    const termParam = selectedTermId ? `&academic_term_id=${selectedTermId}` : "";

    try {
      // Progressive non-blocking fetches: fast endpoints update UI immediately without waiting for heavy history queries
      const eqPromise = api.get("/general/equipment-types").then(r => {
        const eqItems = Array.isArray(r.data) ? r.data : (r.data?.data || []);
        setInventoryItems(eqItems);
        return eqItems;
      }).catch(() => []);

      const unitsPromise = api.get("/general/equipment-units").then(r => {
        const unitItems = Array.isArray(r.data) ? r.data : (r.data?.data || []);
        setEquipmentUnits(unitItems);
        return unitItems;
      }).catch(() => []);

      const daPromise = api.get(`/general/department-analytics${termParam ? `?academic_term_id=${selectedTermId}` : ''}`).then(daRes => {
        const violations = daRes.data?.rule_violations || [];
        setRuleViolations(violations);
        return violations;
      }).catch(() => []);

      const histPromise = api.get(`/general/history-log?include_archived=1${termParam}`).then(histRes => {
        const vb = histRes.data?.venue_bookings || [];
        const eb = histRes.data?.equipment_borrowings || [];
        setVenueBookings(vb);
        setEquipmentBorrowings(eb);
        return { vb, eb };
      }).catch(() => ({ vb: [], eb: [] }));

      const activePromise = Promise.all([
        api.get(`/avr-equipment-borrowings?all=1&include_returned=1${termParam ? `&academic_term_id=${selectedTermId}` : ''}`).catch(() => ({ data: [] })),
        api.get(`/avr-venue-bookings?all=1&include_returned=1${termParam ? `&academic_term_id=${selectedTermId}` : ''}`).catch(() => ({ data: [] })),
      ]).then(([activeEbRes, activeVbRes]) => {
        const rawActiveEb = activeEbRes.data?.data ?? (Array.isArray(activeEbRes.data) ? activeEbRes.data : []);
        const rawActiveVb = activeVbRes.data?.data ?? (Array.isArray(activeVbRes.data) ? activeVbRes.data : []);

        const venueBookingsWithUnits = rawActiveVb.map(vbItem => {
          let au = vbItem.assigned_units;
          if (!au || (typeof au === "object" && Object.keys(au).length === 0)) {
            try {
              const stored = localStorage.getItem(`fsuu_assigned_units_${vbItem.id}`) || localStorage.getItem(`fsuu_completed_assigned_units_${vbItem.id}`);
              if (stored) au = JSON.parse(stored);
            } catch {}
          }
          return { ...vbItem, assigned_units: au };
        }).filter(vbItem => {
          const au = vbItem.assigned_units;
          if (!au) return false;
          if (Array.isArray(au)) return au.filter(Boolean).length > 0;
          if (typeof au === "object") return Object.values(au).filter(Boolean).length > 0;
          if (typeof au === "string") {
            try {
              const p = JSON.parse(au);
              if (Array.isArray(p)) return p.filter(Boolean).length > 0;
              if (typeof p === "object") return Object.values(p).filter(Boolean).length > 0;
              return au.trim() !== "" && au !== "[]" && au !== "{}";
            } catch {
              return au.trim() !== "";
            }
          }
          return false;
        }).map(vbItem => ({
          ...vbItem,
          is_venue_booking: true,
          filer_name: vbItem.filer_name || vbItem.requestor_name || vbItem.name || vbItem.requestor?.name || "Venue Client",
          program_office: vbItem.program_office || (vbItem.venue?.name ? `${vbItem.venue.name} (Venue)` : "Venue Reservation"),
          equipment_name: vbItem.equipment_notes || vbItem.purpose || "Venue Equipment",
        }));

        const combinedActive = [...rawActiveEb, ...venueBookingsWithUnits];
        setActiveEquipmentBorrowings(combinedActive);
        return combinedActive;
      });

      const [eqItems, unitItems, violations, histData, combinedActive] = await Promise.all([
        eqPromise,
        unitsPromise,
        daPromise,
        histPromise,
        activePromise,
      ]);

      try {
        sessionStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify({
          inventoryItems: eqItems,
          equipmentUnits: unitItems,
          ruleViolations: violations,
          venueBookings: (histData?.vb || []).slice(0, 100),
          equipmentBorrowings: (histData?.eb || []).slice(0, 100),
          activeEquipmentBorrowings: (combinedActive || []).slice(0, 100),
        }));
      } catch {}
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [hasPermission, selectedTermId, cachedReports]);

  useEffect(() => {
    fetchReportsData();
    const handleSync = () => {
      fetchReportsData({ isSilent: true });
    };
    const events = [
      "equipment_updated",
      "equipment_inventory_updated",
      "booking_status_updated",
      "venue_bookings_updated",
      "equipment_borrowings_updated",
      "fsuu_booking_created",
    ];
    events.forEach(ev => window.addEventListener(ev, handleSync));

    const handleStorage = (e) => {
      if (
        e.key &&
        (e.key.includes("equipment") ||
          e.key === "fsuu_booking_status_updated_ping" ||
          e.key === "fsuu_booking_created_ping" ||
          e.key === "fsuu_realtime_sync_ping")
      ) {
        handleSync();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleSync));
      window.removeEventListener("storage", handleStorage);
    };
  }, [selectedTermId, fetchReportsData]);

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

  const filteredActiveEquipmentBorrowings = useMemo(() => {
    if (!selectedOfficeId || selectedOfficeId === "all") return activeEquipmentBorrowings;
    return activeEquipmentBorrowings.filter(eb => {
      const offId = eb.office_id || eb.office?.id || eb.items?.[0]?.equipment_type?.office_id || eb.items?.[0]?.equipmentType?.office_id;
      const offName = eb.office?.name || eb.office_name || eb.items?.[0]?.equipment_type?.office?.name;
      if (offId) return String(offId) === String(selectedOfficeId);
      if (offName && selectedOfficeName && selectedOfficeName !== "All Offices") {
        return offName.toLowerCase().includes(selectedOfficeName.toLowerCase());
      }
      return true;
    });
  }, [activeEquipmentBorrowings, selectedOfficeId, selectedOfficeName]);

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
    equipment_out: "Equipment Out",
    incident_reports: "Incident & Damage Reports",
  };

  // ── DIRECT PDF DOWNLOAD (Dynamically imports jspdf + html2canvas only when clicked) ──
  const handleDownloadPDF = async () => {
    const cleanTab = (tabLabels[activeTab] || "Report").replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `FSUU_${cleanTab}_${new Date().toISOString().slice(0, 10)}.pdf`;

    setIsExportingPdf(true);
    try {
      const { downloadReportAsPdf } = await import("./reports/exportPdfHelper");
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
    } catch (err) {
      setIsExportingPdf(false);
      setFeedback(`❌ PDF generation failed: ${err?.message || "Unknown error"}`);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // ── PRINT PREVIEW ──
  const handlePrintPDF = () => {
    window.print();
  };

  // Retrieve current persisted user notes for PDF modal
  const currentVenueNotes = localStorage.getItem("fsuu_report_venue_notes") || "";
  const currentEquipNotes = localStorage.getItem("fsuu_report_equipment_notes") || "";
  const currentBreachesNotes = localStorage.getItem("fsuu_report_breaches_notes") || "";

  // ── EXPORT STATE & HANDLERS ──
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateBounds, setExportDateBounds] = useState({ start: null, end: null });
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const selectedTermLabel = useMemo(() => {
    if (!selectedTermId) return "All Academic Terms";
    const found = academicTerms.find((t) => String(t.id) === String(selectedTermId));
    return found?.name || "All Academic Terms";
  }, [selectedTermId, academicTerms]);

  const handleExecuteExport = async ({ timeframe, format, scope, bounds, customStart, customEnd }) => {
    if (format === "pdf") {
      setExportDateBounds(bounds || { start: null, end: null });
      setShowExportModal(false);
      setShowPdfModal(true);
      return;
    }

    // Excel Export (.xlsx) - Dynamically imports exceljs only when clicked
    setIsExportingExcel(true);
    try {
      const { exportReportsToExcel } = await import("./reports/exportReportsExcelHelper");

      const dateFilteredVb = filterRecordsByBounds(filteredVenueBookings, bounds);
      const dateFilteredEb = filterRecordsByBounds(filteredEquipmentBorrowings, bounds);
      const dateFilteredActiveEb = filterRecordsByBounds(filteredActiveEquipmentBorrowings, bounds);
      const dateFilteredViolations = filterRecordsByBounds(filteredRuleViolations, bounds);

      let timeframeSuffix = "";
      if (timeframe === "today") timeframeSuffix = " (Today)";
      else if (timeframe === "month") timeframeSuffix = ` (${new Date().toLocaleString("default", { month: "long" })} ${new Date().getFullYear()})`;
      else if (timeframe === "year") timeframeSuffix = ` (${new Date().getFullYear()})`;
      else if (timeframe === "custom") timeframeSuffix = ` (${customStart} to ${customEnd})`;

      await exportReportsToExcel({
        venueBookings: dateFilteredVb,
        equipmentBorrowings: dateFilteredEb,
        activeEquipmentBorrowings: dateFilteredActiveEb,
        ruleViolations: dateFilteredViolations,
        inventoryItems: filteredInventoryItems,
        equipmentUnits: filteredUnits,
        termLabel: `${selectedTermLabel}${timeframeSuffix}`,
        officeScope: selectedOfficeName || officeScope,
        activeTab: scope === "active" ? activeTab : "all",
      });

      const scopeName = scope === "active" ? tabLabels[activeTab] : "Master Reports Workbook";
      setFeedback(`✅ ${scopeName} exported to Excel (.xlsx) for ${timeframe === "all" ? "all records" : timeframe}.`);
      setTimeout(() => setFeedback(null), 4000);
      setShowExportModal(false);
    } catch (err) {
      console.error("Excel export error in Reports:", err);
      setFeedback(`❌ Excel export failed: ${err?.message || "Unknown error"}`);
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setIsExportingExcel(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="flex items-center justify-end gap-2.5 flex-wrap">
        {(isSuperAdmin || hasPermission("reports.export_pdf") || hasPermission("reports")) && (
          <ExportButton
            label="Export"
            onClick={() => setShowExportModal(true)}
            loading={isExportingExcel || isExportingPdf}
            title="Export Reports to Excel or PDF"
          />
        )}
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-2 shadow-2xs animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tabs Bar */}
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
      </div>

      {/* Render Active Tab Component with Suspense */}
      <Suspense fallback={null}>
        {mountedTabs.has("booking_borrowing") && (
          <div className={activeTab === "booking_borrowing" ? "block" : "hidden"}>
            <BookingBorrowingReportTab
              venueBookings={filteredVenueBookings}
              equipmentBorrowings={filteredEquipmentBorrowings}
              setShowPdfModal={setShowPdfModal}
              loading={loading && filteredVenueBookings.length === 0 && filteredEquipmentBorrowings.length === 0}
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
              equipmentUnits={equipmentUnits}
              setInventoryItems={setInventoryItems}
              loading={loading && filteredInventoryItems.length === 0}
              fetchReportsData={fetchReportsData}
              isStaff={isStaff}
            />
          </div>
        )}

        {mountedTabs.has("equipment_out") && (
          <div className={activeTab === "equipment_out" ? "block" : "hidden"}>
            <EquipmentOutTab
              equipmentBorrowings={filteredActiveEquipmentBorrowings}
              equipmentUnits={equipmentUnits}
              loading={loading && filteredActiveEquipmentBorrowings.length === 0}
            />
          </div>
        )}

        {mountedTabs.has("incident_reports") && (
          <div className={activeTab === "incident_reports" ? "block" : "hidden"}>
            <IncidentReportsTab
              venueBookings={filteredVenueBookings}
              equipmentBorrowings={filteredEquipmentBorrowings}
              equipmentUnits={equipmentUnits}
              onRefresh={fetchReportsData}
            />
          </div>
        )}
      </Suspense>

      {/* ── EXPORT MODAL ── */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Reports & Analytics"
        subtitle="Select your preferred timeframe, format, and report scope."
        formats={["xlsx", "pdf"]}
        defaultFormat="xlsx"
        activeTabLabel={tabLabels[activeTab]}
        records={{
          venues: filteredVenueBookings,
          equipments: filteredEquipmentBorrowings,
          violations: filteredRuleViolations,
        }}
        scopeOptions={[
          {
            id: "all",
            label: "Master Workbook (All 5 Tabs)",
            description: "Export full workbook including Bookings, Violations, Inventory, and Incidents",
          },
          {
            id: "active",
            label: `Active Tab Only (${tabLabels[activeTab]})`,
            description: `Only export records from the current ${tabLabels[activeTab]} view`,
          },
        ]}
        onExport={handleExecuteExport}
        isExporting={isExportingExcel || isExportingPdf}
      />

      {/* ── PDF PRINT PREVIEW MODAL (Lazy-loaded only when opened) ── */}
      {showPdfModal && (
        <Suspense fallback={null}>
          <PdfPreviewModal
            open={showPdfModal}
            onClose={() => {
              setShowPdfModal(false);
              setExportDateBounds({ start: null, end: null });
            }}
            tabLabels={tabLabels}
            activeTab={activeTab}
            officeScope={officeScope}
            user={user}
            isExportingPdf={isExportingPdf}
            onDownloadPDF={handleDownloadPDF}
            onPrintPDF={handlePrintPDF}
            filteredVenueBookings={filterRecordsByBounds(filteredVenueBookings, exportDateBounds)}
            filteredEquipmentBorrowings={filterRecordsByBounds(filteredEquipmentBorrowings, exportDateBounds)}
            filteredActiveEquipmentBorrowings={filterRecordsByBounds(filteredActiveEquipmentBorrowings, exportDateBounds)}
            filteredRuleViolations={filterRecordsByBounds(filteredRuleViolations, exportDateBounds)}
            filteredInventoryItems={filteredInventoryItems}
            filteredUnits={filteredUnits}
            currentVenueNotes={currentVenueNotes}
            currentEquipNotes={currentEquipNotes}
            currentBreachesNotes={currentBreachesNotes}
          />
        </Suspense>
      )}
    </div>
  );
}
