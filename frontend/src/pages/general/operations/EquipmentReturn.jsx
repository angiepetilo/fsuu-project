import { useState, useEffect, useMemo } from "react";
import { 
  RotateCcw, Search, AlertCircle, CheckCircle2, ShieldAlert,
  Clock, Calendar, User, FileText, RefreshCw, AlertTriangle
} from "lucide-react";
import api from "@/lib/axios";
import { notify } from "@/lib/notify";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

const CONDITION_OPTIONS = [
  { value: "Good Condition", label: "Good Condition", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  { value: "Minor Damage", label: "Minor Damage", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  { value: "Needs Inspection", label: "Needs Inspection", color: "text-amber-300 border-amber-400/30 bg-amber-400/10" },
  { value: "Damaged", label: "Damaged", color: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
  { value: "Missing", label: "Missing", color: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
];

export default function EquipmentReturn() {
  const [searchRef, setSearchRef] = useState("");
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBorrowing, setSelectedBorrowing] = useState(null);
  const [unitConditions, setUnitConditions] = useState({});
  const [returnNotes, setReturnNotes] = useState("");

  const fetchBorrowings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/avr-equipment-borrowings");
      const list = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
      setBorrowings(list);
    } catch {
      notify.error("Data Sync Failed", "Unable to load equipment reservations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowings();
  }, []);

  // Filter items currently out (released / ongoing)
  const activeBorrowings = useMemo(() => {
    return borrowings.filter(b => {
      const s = (b.status || b.tracking_number?.status || "").toLowerCase();
      return ["ongoing", "on-going", "released", "in-use", "borrowed", "overdue"].includes(s);
    });
  }, [borrowings]);

  const getEquipmentItems = (borrowing) => {
    if (!borrowing) return [];
    if (Array.isArray(borrowing.equipment_items) && borrowing.equipment_items.length > 0) {
      return borrowing.equipment_items;
    }
    if (Array.isArray(borrowing.items) && borrowing.items.length > 0) {
      return borrowing.items;
    }
    if (borrowing.equipment) {
      if (typeof borrowing.equipment === "string") {
        return borrowing.equipment.split(",").map(name => ({ name: name.trim(), quantity: 1 }));
      }
      return [borrowing.equipment];
    }
    return [{ name: "Equipment Unit", quantity: borrowing.quantity || 1 }];
  };

  const handleSelectBorrowing = (borrowing) => {
    setSelectedBorrowing(borrowing);
    const items = getEquipmentItems(borrowing);
    const initialCond = {};
    items.forEach((_, idx) => {
      initialCond[idx] = "Good Condition";
    });
    setUnitConditions(initialCond);
    setReturnNotes("");
  };

  const handleSearchVerify = (e) => {
    if (e) e.preventDefault();
    const query = searchRef.trim().toLowerCase();
    if (!query) {
      notify.warning("Input Required", "Please enter a booking reference or borrower name.");
      return;
    }

    const matched = borrowings.find(b => {
      const ref = (b.reference_code || b.tracking_number?.reference_code || `TRK-EQ-${b.id}`).toLowerCase();
      const borrower = (b.borrower_name || b.name || "").toLowerCase();
      return ref.includes(query) || borrower.includes(query);
    });

    if (matched) {
      handleSelectBorrowing(matched);
      notify.success("Record Loaded", `Found reservation for ${matched.borrower_name || matched.name || "Borrower"}`);
    } else {
      notify.error("Record Not Found", `No active borrowing found matching "${searchRef}".`);
    }
  };

  const equipmentItems = useMemo(() => {
    return getEquipmentItems(selectedBorrowing);
  }, [selectedBorrowing]);

  const hasIrregularity = useMemo(() => {
    return Object.values(unitConditions).some(c => 
      c === "Minor Damage" || c === "Needs Inspection" || c === "Damaged" || c === "Missing"
    );
  }, [unitConditions]);

  const canSubmit = useMemo(() => {
    if (!selectedBorrowing) return false;
    if (hasIrregularity && !returnNotes.trim()) return false;
    return true;
  }, [selectedBorrowing, hasIrregularity, returnNotes]);

  const handleConfirmReturn = async () => {
    if (!selectedBorrowing) return;
    if (hasIrregularity && !returnNotes.trim()) {
      notify.warning("Notes Required", "Please provide detailed inspection notes for damaged, missing, or flagged equipment.");
      return;
    }

    setSubmitting(true);
    try {
      const hasSevereDamage = Object.values(unitConditions).some(c => c === "Damaged");
      const hasMissing = Object.values(unitConditions).some(c => c === "Missing");
      let conditionSlug = "good";
      if (hasMissing) conditionSlug = "lost";
      else if (hasSevereDamage) conditionSlug = "damaged";

      await api.post(`/avr-equipment-borrowings/${selectedBorrowing.id}/complete`, {
        condition: conditionSlug,
        unit_conditions: equipmentItems.map((item, idx) => ({
          name: item.name || "Equipment Unit",
          condition: unitConditions[idx] || "Good Condition"
        })),
        notes: returnNotes.trim() || "Returned and physically inspected by Student Assistant.",
        remarks: returnNotes.trim() || "Returned in good condition."
      });

      notify.success("Return Confirmed", `Equipment for ${selectedBorrowing.borrower_name || "Borrower"} has been logged as returned.`);
      await fetchBorrowings();
      setSelectedBorrowing(null);
      setReturnNotes("");
    } catch (err) {
      notify.error("Return Failed", err?.response?.data?.message || "Could not process equipment return.");
    } finally {
      setSubmitting(false);
    }
  };

  const getRef = (b) => b?.reference_code || b?.tracking_number?.reference_code || `TRK-EQ-${b?.id}`;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <RotateCcw size={16} />
            <span>Student Assistant Operational Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Equipment Return &amp; Inspection
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inspect physical condition of returned units, flag damages/missing items, and reconcile inventory.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchBorrowings}
          disabled={loading}
          className="self-start sm:self-auto gap-2"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh List</span>
        </Button>
      </div>

      {/* Search & Scan Bar */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
        <form onSubmit={handleSearchVerify} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Enter Booking Reference (e.g. BK-2026-001) or Borrower Name"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
          <Button
            type="submit"
            className="h-11 px-6 font-semibold"
          >
            Search / Verify
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Currently Out / In Use */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Currently Out / In Use ({activeBorrowings.length})
            </h2>
            <span className="text-[11px] text-muted-foreground">Pending Return</span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {activeBorrowings.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-6 text-center text-muted-foreground space-y-2">
                <CheckCircle2 size={28} className="mx-auto text-emerald-400/80" />
                <p className="text-xs font-medium">All equipment units have been safely returned.</p>
              </div>
            ) : (
              activeBorrowings.map((b) => {
                const isCurrent = selectedBorrowing?.id === b.id;
                const refCode = getRef(b);
                return (
                  <div
                    key={b.id}
                    onClick={() => handleSelectBorrowing(b)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                      isCurrent
                        ? "bg-primary/10 border-primary shadow-xs"
                        : "bg-card border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-foreground font-mono">
                        {refCode}
                      </span>
                      <StatusBadge status={b.status || "ongoing"} />
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {b.borrower_name || b.name || "Borrower"}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        Due: {b.time_end || "Scheduled"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Return Inspection Form */}
        <div className="lg:col-span-8">
          {selectedBorrowing ? (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-xs">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Booking Reference</span>
                  <h3 className="text-xl font-mono font-bold text-foreground">
                    {getRef(selectedBorrowing)}
                  </h3>
                </div>
                <StatusBadge status={selectedBorrowing.status || "ongoing"} />
              </div>

              {/* Borrower & Reservation Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border border-border/80 text-xs">
                <div>
                  <span className="text-muted-foreground font-medium block">Borrower</span>
                  <span className="text-foreground font-bold text-sm">
                    {selectedBorrowing.borrower_name || selectedBorrowing.name || "N/A"}
                  </span>
                  <span className="text-muted-foreground block mt-0.5">
                    {selectedBorrowing.department || "Academic Dept"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Scheduled Return</span>
                  <span className="text-foreground font-semibold">
                    {selectedBorrowing.date_of_usage || "Today"} • {selectedBorrowing.time_end || "17:00"}
                  </span>
                </div>
              </div>

              {/* Equipment Items with Condition Selectors */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Equipment Condition Inspection
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    Select physical state per item
                  </span>
                </div>

                <div className="space-y-3">
                  {equipmentItems.map((item, idx) => {
                    const itemName = item.name || item.equipment_name || "Equipment Unit";
                    const currentCondition = unitConditions[idx] || "Good Condition";

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <span className="text-sm font-semibold text-foreground block">
                            {itemName}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Qty: {item.quantity || 1} • {item.barcode ? `Tag: ${item.barcode}` : "Physical Unit"}
                          </span>
                        </div>

                        {/* Condition Selector Dropdown */}
                        <div className="flex items-center gap-2">
                          <select
                            value={currentCondition}
                            onChange={(e) => {
                              const val = e.target.value;
                              setUnitConditions(prev => ({
                                ...prev,
                                [idx]: val
                              }));
                            }}
                            className="h-10 px-3 rounded-lg bg-card border border-border text-foreground text-xs font-semibold focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                          >
                            {CONDITION_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mandatory Notes for Damage / Missing */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileText size={14} />
                    <span>Inspection Notes {hasIrregularity && <span className="text-rose-400">* (Required for non-good conditions)</span>}</span>
                  </label>
                  {hasIrregularity && !returnNotes.trim() && (
                    <span className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                      <AlertTriangle size={12} /> Notes required before confirming
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder={hasIrregularity ? "Describe damage, missing cables, or physical inspection findings..." : "Optional remarks on return status..."}
                  className={`w-full p-3 rounded-xl bg-background border text-foreground text-xs focus:outline-hidden focus:ring-2 transition-all ${
                    hasIrregularity && !returnNotes.trim()
                      ? "border-rose-500/80 focus:ring-rose-500/20"
                      : "border-border focus:border-primary focus:ring-primary/20"
                  }`}
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  Confirming return reconciles inventory stock back to Available status.
                </p>

                <Button
                  onClick={handleConfirmReturn}
                  disabled={submitting || !canSubmit}
                  size="lg"
                  className="w-full sm:w-auto px-8 h-12 font-bold gap-2 text-sm shadow-md"
                >
                  <CheckCircle2 size={18} />
                  <span>{submitting ? "Processing..." : "Confirm Return"}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground border border-border">
                <RotateCcw size={24} />
              </div>
              <h3 className="text-base font-bold text-foreground">No Reservation Selected</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Scan or enter a booking reference code above or choose from the currently out list to inspect returned equipment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
