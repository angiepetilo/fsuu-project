import { Loader2, Play, Mail, CheckCircle2, PackageCheck, AlertCircle, Smartphone } from "lucide-react";
import api from "@/lib/axios";

/**
 * EquipBorrowUnitAssignment — Right column component for assigning unit barcodes and workflow actions.
 */
export default function EquipBorrowUnitAssignment({
  selected,
  categoriesToRender,
  getAvailableUnitsForCategory,
  assignedUnitSelections,
  setAssignedUnitSelections,
  isApproved,
  isPending,
  isOngoing,
  isCompleted,
  handleAction,
  actionLoading,
  resendMsg,
  resendLoading,
  handleResendEmail,
  smsMsg,
  smsLoading,
  handleSendOverdueSms,
}) {
  const borrowingOfficeId = selected?.office_id || selected?.office?.id || (selected?.items && selected.items[0]?.equipment_type?.office_id);

  // Check if all requested units have been assigned
  let totalRequestedUnits = 0;
  let totalAssignedUnits = 0;

  categoriesToRender.forEach((catObj, catIdx) => {
    const reqQty = parseInt(catObj.quantity, 10) || 1;
    totalRequestedUnits += reqQty;
    for (let uIdx = 0; uIdx < reqQty; uIdx++) {
      const idxKey = `${catIdx}-${uIdx}`;
      const catKey = `${catObj.category}-${uIdx}`;
      if (assignedUnitSelections[idxKey] || assignedUnitSelections[catKey]) {
        totalAssignedUnits++;
      }
    }
  });

  const allUnitsAssigned = totalRequestedUnits > 0 && totalAssignedUnits >= totalRequestedUnits;

  return (
    <div className="lg:col-span-5 p-6 space-y-4">
      {/* Equipment Unit Assignments */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
            {isPending ? "REQUESTED EQUIPMENT" : "EQUIPMENT UNIT ASSIGNMENT"}
          </span>
          {isApproved && (
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              allUnitsAssigned
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              {totalAssignedUnits} of {totalRequestedUnits} units selected
            </span>
          )}
        </div>

        {categoriesToRender.map((reqCat, catIdx) => {
          const rawAvailable = getAvailableUnitsForCategory(reqCat.category);
          
          // Show only available & operational units
          const availableUnits = rawAvailable.filter((unit) => {
            const uCond = String(unit.condition || "good").toLowerCase();
            if (uCond === "damaged" || uCond === "lost" || uCond === "under repair") {
              return false;
            }
            return true;
          });

          // Count assigned for this category
          const reqQty = parseInt(reqCat.quantity, 10) || 1;
          let catAssignedCount = 0;
          for (let u = 0; u < reqQty; u++) {
            const k1 = `${catIdx}-${u}`;
            const k2 = `${reqCat.category}-${u}`;
            if (assignedUnitSelections[k1] || assignedUnitSelections[k2]) catAssignedCount++;
          }

          return (
            <div key={catIdx} className="p-3.5 bg-white rounded-2xl border border-slate-200/90 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-xs">
                  {reqCat.category}
                </span>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  Qty: {reqCat.quantity}
                </span>
              </div>

              {/* State 1: Pending (No unit dropdown yet) */}
              {isPending && (
                <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px] font-medium text-slate-500 flex items-center gap-2">
                  <PackageCheck size={14} className="text-slate-400 shrink-0" />
                  <span>Awaiting approval to assign physical barcodes.</span>
                </div>
              )}

              {/* State 2: Approved (Unit picker with running count) */}
              {isApproved && (
                <>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span>Select Physical Barcode:</span>
                    <span className={catAssignedCount >= reqQty ? "text-emerald-600 font-extrabold" : "text-amber-600 font-extrabold"}>
                      {catAssignedCount} of {reqQty} selected
                    </span>
                  </div>

                  {availableUnits.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 text-center">
                      No available units in stock for {reqCat.category}.
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      {Array.from({ length: reqCat.quantity }).map((_, uIdx) => {
                        const idxKey = `${catIdx}-${uIdx}`;
                        const catKey = `${reqCat.category}-${uIdx}`;
                        const val =
                          assignedUnitSelections[idxKey] ||
                          assignedUnitSelections[catKey] ||
                          assignedUnitSelections[uIdx] ||
                          (Array.isArray(assignedUnitSelections) ? assignedUnitSelections[uIdx] : "") ||
                          "";

                        const otherSelectedBarcodes = Object.entries(assignedUnitSelections || {})
                          .filter(([k, v]) => k !== idxKey && k !== catKey && k !== String(uIdx) && Boolean(v))
                          .map(([_, v]) => String(v).trim().toUpperCase());

                        const filteredAvailableUnits = availableUnits.filter((unit) => {
                          const bCode = String(unit.unit_code || unit.barcode || unit.serial_number || unit.code || unit.id || "").trim().toUpperCase();
                          const uName = String(unit.name || "").trim().toUpperCase();

                          const isCurrent = (bCode && bCode === String(val).trim().toUpperCase()) || 
                                            (uName && uName === String(val).trim().toUpperCase());

                          if (!isCurrent && (otherSelectedBarcodes.includes(bCode) || (uName && otherSelectedBarcodes.includes(uName)))) {
                            return false;
                          }

                          const uStat = String(unit.status || "available").toLowerCase();
                          return uStat === "available" || isCurrent;
                        });

                        const matchedUnit = filteredAvailableUnits.find((u) => {
                          const code = String(u.unit_code || u.barcode || u.serial_number || u.code || "").trim().toUpperCase();
                          const name = String(u.name || "").trim().toUpperCase();
                          const id = String(u.id || "").trim().toUpperCase();
                          const target = String(val).trim().toUpperCase();
                          return (code && code === target) || (name && name === target) || (id && id === target);
                        });

                        const selectVal = matchedUnit ? (matchedUnit.unit_code || matchedUnit.barcode || matchedUnit.name) : val;

                        return (
                          <div key={uIdx} className="relative">
                            <select
                              value={selectVal}
                              onChange={(e) => {
                                const updated = { ...assignedUnitSelections, [idxKey]: e.target.value };
                                if (catKey !== idxKey && catKey in updated) {
                                  delete updated[catKey];
                                }
                                setAssignedUnitSelections(updated);
                                if (selected && selected.id) {
                                  localStorage.setItem(`fsuu_assigned_units_eb_${selected.id}`, JSON.stringify(updated));
                                  api.put(`/avr-equipment-borrowings/${selected.id}/assign-units`, { assigned_units: updated }).catch(() => {});
                                }
                              }}
                              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-50 cursor-pointer"
                            >
                              <option value="">-- Assign Barcode (Unit {uIdx + 1}) --</option>
                              {filteredAvailableUnits.length > 0 ? (
                                filteredAvailableUnits.map((unit) => {
                                  const displayCode = unit.unit_code || unit.barcode || unit.serial_number || unit.code || `UNIT-${unit.id}`;
                                  return (
                                    <option key={unit.id} value={displayCode}>
                                      {displayCode} — {unit.name || reqCat.category}
                                    </option>
                                  );
                                })
                              ) : (
                                <option value="" disabled>
                                  All units in this category are assigned to other slots
                                </option>
                              )}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* State 3 & 4: Released (On-Going) or Completed */}
              {(isOngoing || isCompleted) && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10.5px] font-mono text-slate-400 font-bold uppercase">
                    Dispatched Physical Units:
                  </span>
                  {Array.from({ length: reqCat.quantity }).map((_, uIdx) => {
                    const idxKey = `${catIdx}-${uIdx}`;
                    const catKey = `${reqCat.category}-${uIdx}`;
                    const val = assignedUnitSelections[idxKey] || assignedUnitSelections[catKey] || "";

                    if (isOngoing && (!val || val === "—")) {
                      const otherSelectedBarcodes = Object.entries(assignedUnitSelections || {})
                        .filter(([k, v]) => k !== idxKey && k !== catKey && k !== String(uIdx) && Boolean(v))
                        .map(([_, v]) => String(v).trim().toUpperCase());

                      const filteredUnits = availableUnits.filter((unit) => {
                        const bCode = String(unit.unit_code || unit.barcode || unit.serial_number || unit.code || unit.id || "").trim().toUpperCase();
                        const uName = String(unit.name || "").trim().toUpperCase();
                        return !otherSelectedBarcodes.includes(bCode) && (!uName || !otherSelectedBarcodes.includes(uName));
                      });

                      return (
                        <div key={uIdx} className="relative">
                          <select
                            value={val}
                            onChange={(e) => {
                              const updated = { ...assignedUnitSelections, [idxKey]: e.target.value };
                              if (catKey !== idxKey && catKey in updated) {
                                delete updated[catKey];
                              }
                              setAssignedUnitSelections(updated);
                              if (selected && selected.id) {
                                localStorage.setItem(`fsuu_assigned_units_eb_${selected.id}`, JSON.stringify(updated));
                                api.put(`/avr-equipment-borrowings/${selected.id}/assign-units`, { assigned_units: updated }).catch(() => {});
                              }
                            }}
                            className="w-full p-2 bg-amber-50/50 border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-50 cursor-pointer"
                          >
                            <option value="">-- Assign Barcode (Unit {uIdx + 1}) --</option>
                            {filteredUnits.map((unit) => {
                              const displayCode = unit.unit_code || unit.barcode || unit.serial_number || unit.code || `UNIT-${unit.id}`;
                              return (
                                <option key={unit.id} value={displayCode}>
                                  {displayCode} — {unit.name || reqCat.category}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      );
                    }

                    return (
                      <div key={uIdx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800">
                        <span>Unit {uIdx + 1}</span>
                        <span className={`px-2 py-0.5 rounded-lg border font-extrabold ${
                          val && val !== "—"
                            ? "bg-white border-slate-200 text-blue-700"
                            : "bg-amber-100/60 border-amber-300 text-amber-800"
                        }`}>
                          {val || "Unassigned"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Workflow Actions Section */}
      <div className="space-y-2 pt-2 border-t border-slate-200">
        {isApproved && (
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-700 font-bold">Fulfillment:</span>
              <span className={`text-xs font-extrabold ${allUnitsAssigned ? "text-emerald-600" : "text-amber-600"}`}>
                {allUnitsAssigned ? "Ready for Release" : "Units Pending Assignment"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleAction(selected.id, "ongoing")}
              disabled={!allUnitsAssigned || !!actionLoading}
              className={`w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                allUnitsAssigned
                  ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                  : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
              }`}
            >
              {actionLoading === `${selected.id}-ongoing` ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              Release Equipment (Mark On-Going)
            </button>
          </div>
        )}

        {isOngoing && (
          <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex items-center gap-2 text-xs font-bold text-blue-800">
            <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
            <span>Equipment dispatched. Awaiting return & post-use inspection.</span>
          </div>
        )}

        {/* Resend Email Delivery Button */}
        <div className="space-y-1.5">
          {resendMsg && (
            <p className="text-[10.5px] font-mono text-emerald-600 font-bold mb-1">
              {resendMsg}
            </p>
          )}
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={resendLoading}
            className="w-full py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {resendLoading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} className="text-slate-600" />}
            Resend Email Delivery
          </button>

          {/* Overdue SMS Alert Trigger (Available on Ongoing or Approved) */}
          {(isOngoing || isApproved) && (
            <div>
              {smsMsg && (
                <p className="text-[10.5px] font-mono text-amber-600 font-bold mb-1">
                  {smsMsg}
                </p>
              )}
              <button
                type="button"
                onClick={handleSendOverdueSms}
                disabled={smsLoading}
                className="w-full py-2 bg-amber-50 hover:bg-amber-100/80 text-amber-900 rounded-lg text-xs font-bold border border-amber-300/80 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                title="Send urgent SMS reminder to borrower's phone number via Semaphore"
              >
                {smsLoading ? <Loader2 size={14} className="animate-spin" /> : <Smartphone size={14} className="text-amber-700" />}
                Send Overdue SMS Notice
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
