import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/axios";
import BookingBorrowingReportTab from "./reports/BookingBorrowingReportTab";
import BreachesTab from "./reports/BreachesTab";
import EquipmentStockTab from "./reports/EquipmentStockTab";
import {
  FileBarChart2, FileText, Download, ShieldAlert, PackageOpen, CheckCircle2, Building2
} from "lucide-react";

export default function Reports() {
  const context = useOutletContext();
  const officeScope = context?.adminOffice || context?.selectedOffice || "All Offices";

  const [activeTab, setActiveTab] = useState("booking_borrowing"); // "booking_borrowing" | "breaches" | "inventory"
  const [feedback, setFeedback] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  const [venueBookings, setVenueBookings] = useState([]);
  const [equipmentBorrowings, setEquipmentBorrowings] = useState([]);
  const [ruleViolations, setRuleViolations] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const [histRes, daRes, eqRes] = await Promise.all([
        api.get("/admin/history-log").catch(() => ({ data: { venue_bookings: [], equipment_borrowings: [] } })),
        api.get("/admin/department-analytics").catch(() => ({ data: { rule_violations: [], late_returns: [] } })),
        api.get("/admin/equipment-types").catch(() => ({ data: [] })),
      ]);

      // 1. History log venue bookings & equipment borrowings (Items 22, 23, 24)
      const vb = histRes.data?.venue_bookings || [];
      const eb = histRes.data?.equipment_borrowings || [];
      setVenueBookings(vb);
      setEquipmentBorrowings(eb);

      // 2. Department analytics / violations (Item 25)
      const violations = daRes.data?.rule_violations || [];
      setRuleViolations(violations);

      // 3. Equipment inventory stock (Item 1)
      const eqData = Array.isArray(eqRes.data) ? eqRes.data : [];
      const stored = localStorage.getItem("fsuu_equipment_inventory");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInventoryItems(parsed);
          } else {
            setInventoryItems(eqData);
          }
        } catch {
          setInventoryItems(eqData);
        }
      } else {
        setInventoryItems(eqData);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
    const handleInvUpdate = () => fetchReportsData();
    window.addEventListener("equipment_inventory_updated", handleInvUpdate);
    return () => window.removeEventListener("equipment_inventory_updated", handleInvUpdate);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileBarChart2 className="text-blue-600" size={24} />
            Institutional Reports & Audits
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Audit logs for venue bookings, equipment borrowing history, rule breaches, and equipment stock levels.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "booking_borrowing", label: "Booking & Borrowing Report", icon: Building2 },
          { id: "breaches", label: "Rule & Late Return Violations", icon: ShieldAlert },
          { id: "inventory", label: "Inventory & Stock Table", icon: PackageOpen },
        ].map((tab) => {
          const IconComp = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                active ? "bg-slate-900 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <IconComp size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render Active Tab Component */}
      {activeTab === "booking_borrowing" && (
        <BookingBorrowingReportTab
          venueBookings={venueBookings}
          equipmentBorrowings={equipmentBorrowings}
          setShowPdfModal={setShowPdfModal}
        />
      )}

      {activeTab === "breaches" && (
        <BreachesTab
          ruleViolations={ruleViolations}
          officeScope={officeScope}
        />
      )}

      {activeTab === "inventory" && (
        <EquipmentStockTab
          filteredInventory={inventoryItems}
          setInventoryItems={setInventoryItems}
          loading={loading}
          fetchReportsData={fetchReportsData}
        />
      )}
    </div>
  );
}
