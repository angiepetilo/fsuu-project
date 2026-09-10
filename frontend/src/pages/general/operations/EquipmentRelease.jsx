import { useState, useEffect, useMemo } from "react";
import { 
  Search, ShieldCheck, CheckCircle2, AlertCircle, PackageCheck, 
  Clock, Calendar, User, ArrowRight, RefreshCw, CheckSquare, Square,
  Building2, Check
} from "lucide-react";
import api from "@/lib/axios";
import { notify } from "@/lib/notify";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

export default function EquipmentRelease() {
  const [searchRef, setSearchRef] = useState("");
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [selectedBorrowing, setSelectedBorrowing] = useState(null);
  const [inspectedChecklist, setInspectedChecklist] = useState({});

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

  // Approved borrowings that are ready for handover / release
  const readyBorrowings = useMemo(() => {
    return borrowings.filter(b => {
      const s = (b.status || b.tracking_number?.status || "").toLowerCase();
      return s === "approved" || s === "ready" || s === "confirmed";
    });
  }, [borrowings]);

  // Handle Search / Verify
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
      notify.success("Record Verified", `Found reservation for ${matched.borrower_name || matched.name || "Borrower"}`);
    } else {
      notify.error("Record Not Found", `No reservation found matching "${searchRef}".`);
    }
  };

  const handleSelectBorrowing = (borrowing) => {
    setSelectedBorrowing(borrowing);
    // Initialize checklist for all items in the reservation
    const items = getEquipmentItems(borrowing);
    const initialCheck = {};
    items.forEach((item, idx) => {
      initialCheck[idx] = false;
    });
    setInspectedChecklist(initialCheck);
  };

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
    return [
      { name: "Equipment Unit", quantity: borrowing.quantity || 1 }
    ];
  };

  const toggleCheckItem = (idx) => {
    setInspectedChecklist(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const equipmentItems = useMemo(() => {
    return getEquipmentItems(selectedBorrowing);
  }, [selectedBorrowing]);

  const allInspected = useMemo(() => {
    if (!selectedBorrowing || equipmentItems.length === 0) return false;
    return equipmentItems.every((_, idx) => Boolean(inspectedChecklist[idx]));
  }, [selectedBorrowing, equipmentItems, inspectedChecklist]);

  const isAlreadyReleased = useMemo(() => {
    if (!selectedBorrowing) return false;
    const s = (selectedBorrowing.status || selectedBorrowing.tracking_number?.status || "").toLowerCase();
    return ["ongoing", "on-going", "released", "in-use", "borrowed", "completed"].includes(s);
  }, [selectedBorrowing]);

  const handleReleaseEquipment = async () => {
    if (!selectedBorrowing) return;
    if (isAlreadyReleased) {
      notify.warning("Duplicate Release Prevented", "This equipment has already been released to the borrower.");
      return;
    }
    if (!allInspected) {
      notify.warning("Verification Incomplete", "Please complete physical inspection checklist before releasing.");
      return;
    }

    setReleasing(true);
    try {
      await api.post(`/avr-equipment-borrowings/${selectedBorrowing.id}/ongoing`, {
        remarks: "Physically inspected & released by Student Assistant counter."
      });
      notify.success("Equipment Released", `Items released to ${selectedBorrowing.borrower_name || "Borrower"} successfully.`);
      await fetchBorrowings();
      setSelectedBorrowing(prev => ({
        ...prev,
        status: "ongoing"
      }));
    } catch (err) {
      notify.error("Release Failed", err?.response?.data?.message || "Could not complete release handover.");
    } finally {
      setReleasing(false);
    }
  };

  const getRef = (b) => b?.reference_code || b?.tracking_number?.reference_code || `TRK-EQ-${b?.id}`;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <PackageCheck size={16} />
            <span>Student Assistant Operational Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Equipment Release
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verify reservation reference, inspect units with physical checklist, and dispatch equipment.
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
          <span>Refresh Records</span>
        </Button>
      </div>

      {/* Search & Verification Bar */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
        <form onSubmit={handleSearchVerify} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Enter Booking Reference (e.g. BK-2026-001 or TRK-EQ-...) or Borrower Name"
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
        {/* Left Column: Quick Select Ready for Release */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Ready for Handover ({readyBorrowings.length})
            </h2>
            <span className="text-[11px] text-muted-foreground">Click to load</span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {readyBorrowings.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-6 text-center text-muted-foreground space-y-2">
                <ShieldCheck size={28} className="mx-auto text-muted-foreground/60" />
                <p className="text-xs font-medium">No pending approved borrowings ready for release.</p>
              </div>
            ) : (
              readyBorrowings.map((b) => {
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
                      <StatusBadge status={b.status || "approved"} />
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {b.borrower_name || b.name || "Borrower"}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} />
                        {b.date_of_usage || b.start_datetime?.substring(0, 10) || "Today"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        {b.time_start || "Scheduled"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Release Handover Desk */}
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
                <div>
                  {isAlreadyReleased ? (
                    <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      <span>Already Released</span>
                    </div>
                  ) : (
                    <div className="px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center gap-1.5">
                      <Clock size={14} />
                      <span>Ready for Handover</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Borrower & Reservation Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border border-border/80 text-xs">
                <div>
                  <span className="text-muted-foreground font-medium block">Borrower Name</span>
                  <span className="text-foreground font-bold text-sm">
                    {selectedBorrowing.borrower_name || selectedBorrowing.name || "N/A"}
                  </span>
                  <span className="text-muted-foreground block mt-0.5">
                    {selectedBorrowing.department || selectedBorrowing.college || "Academic Department"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Usage Schedule</span>
                  <span className="text-foreground font-semibold">
                    {selectedBorrowing.date_of_usage || selectedBorrowing.start_datetime?.substring(0, 10) || "Today"}
                  </span>
                  <span className="text-muted-foreground block mt-0.5">
                    {selectedBorrowing.time_start || "08:00 AM"} – {selectedBorrowing.time_end || "05:00 PM"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Destination / Venue</span>
                  <span className="text-foreground font-semibold">
                    {selectedBorrowing.venue_name || selectedBorrowing.purpose_venue || "On-Campus Event"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block">Contact Number</span>
                  <span className="text-foreground font-semibold">
                    {selectedBorrowing.contact_number || selectedBorrowing.phone || "On File"}
                  </span>
                </div>
              </div>

              {/* Equipment Checklist Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Equipment Inspection Checklist
                  </h4>
                  <span className="text-xs text-primary font-medium">
                    Check all items before releasing
                  </span>
                </div>

                <div className="space-y-2 border border-border rounded-xl divide-y divide-border overflow-hidden bg-background">
                  {equipmentItems.map((item, idx) => {
                    const isChecked = Boolean(inspectedChecklist[idx]);
                    const itemName = item.name || item.equipment_name || "Equipment Unit";
                    const itemQty = item.quantity || 1;
                    const itemBarcode = item.barcode || item.serial_number || `UNIT-${idx + 1}`;

                    return (
                      <div
                        key={idx}
                        onClick={() => !isAlreadyReleased && toggleCheckItem(idx)}
                        className={`p-3.5 flex items-center justify-between transition-colors ${
                          isAlreadyReleased ? "cursor-default opacity-80" : "cursor-pointer hover:bg-muted/60"
                        } ${isChecked ? "bg-primary/5" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={isAlreadyReleased}
                            className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                              isChecked
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border bg-card text-transparent"
                            }`}
                          >
                            <Check size={14} strokeWidth={3} />
                          </button>
                          <div>
                            <span className="text-sm font-semibold text-foreground block">
                              {itemName} (x{itemQty})
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Barcode/Tag: {itemBarcode}
                            </span>
                          </div>
                        </div>
                        <span className={`text-xs font-medium ${isChecked ? "text-emerald-400 font-bold" : "text-muted-foreground"}`}>
                          {isChecked ? "Inspected ✓" : "Pending check"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Handover Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  {isAlreadyReleased
                    ? "Units currently in possession of the borrower."
                    : allInspected
                    ? "Physical verification complete. Ready to dispatch."
                    : "Inspect all equipment units to enable release."}
                </p>

                <Button
                  onClick={handleReleaseEquipment}
                  disabled={releasing || isAlreadyReleased || !allInspected}
                  size="lg"
                  className="w-full sm:w-auto px-8 h-12 font-bold gap-2 text-sm shadow-md"
                >
                  <PackageCheck size={18} />
                  <span>{releasing ? "Recording Handover..." : "Release Equipment"}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground border border-border">
                <Search size={24} />
              </div>
              <h3 className="text-base font-bold text-foreground">No Reservation Selected</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Scan or enter a booking reference code above or pick a reservation from the ready handover queue.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
