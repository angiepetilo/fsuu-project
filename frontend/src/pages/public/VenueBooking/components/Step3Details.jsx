import { FileText, CheckCircle2, FileCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import api from "@/lib/axios";

export default function Step3Details({
  selectedVenue,
  selectedDate,
  handleDetailsSubmit,
  fullName, setFullName,
  email, setEmail,
  contactNumber, handleContactChange,
  department, setDepartment,
  identity,
  classification, setClassification,
  persons, setPersons,
  startTime, setStartTime,
  endTime, setEndTime,
  purpose, setPurpose,
  avrEquipment, setAvrEquipment,
  onBack,
}) {
  const [requirements, setRequirements] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [equipmentCatalog, setEquipmentCatalog] = useState([]);

  useEffect(() => {
    api.get("/public/booking-requirements")
      .then(res => setRequirements(Array.isArray(res.data) ? res.data : []))
      .catch(() => {
        api.get("/admin/booking-requirements")
          .then(res => setRequirements(Array.isArray(res.data) ? res.data : []))
          .catch(() => setRequirements([]));
      });

    const fetchDepts = async () => {
      try {
        const res = await api.get("/public/departments").catch(() => api.get("/admin/departments"));
        let data = Array.isArray(res.data) ? res.data : [];
        setDepartmentsList(data);
      } catch {
        setDepartmentsList([]);
      }
    };

    const fetchEquipment = async () => {
      try {
        const venueOfficeId = selectedVenue?.office_id || selectedVenue?.office?.id || "";
        const params = new URLSearchParams();
        if (venueOfficeId) params.append("office_id", venueOfficeId);
        const res = await api.get(`/public/equipment-types?${params.toString()}`).catch(() => api.get("/admin/equipment-types"));
        let data = Array.isArray(res.data) ? res.data : [];
        setEquipmentCatalog(data);
      } catch {
        setEquipmentCatalog([]);
      }
    };

    fetchDepts();
    fetchEquipment();

    window.addEventListener("departments_updated", fetchDepts);
    window.addEventListener("equipment_inventory_updated", fetchEquipment);
    return () => {
      window.removeEventListener("departments_updated", fetchDepts);
      window.removeEventListener("equipment_inventory_updated", fetchEquipment);
    };
  }, [selectedVenue]);

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300 space-y-6">
      {/* Context Banner indicating which form is active */}
      <div className="p-4 rounded-2xl border flex items-center justify-between bg-blue-50/80 border-blue-100 text-blue-900">
        <div className="flex items-center gap-3">

          <div>
            <h4 className="font-extrabold text-sm">Booking Form</h4>
            <p className="text-xs opacity-80">
              Target Venue: <span className="font-bold">{selectedVenue?.name}</span> | Date: <span className="font-bold">{selectedDate}</span>
            </p>
          </div>
        </div>
      </div>

      {/* DYNAMIC FORM RENDERING */}
      <form onSubmit={handleDetailsSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* COMMON REQUIRED FIELDS */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-900">Full Name (Filer) <span className="text-red-500">*</span></label>
          <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Juan Dela Cruz" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-900">Personal Email <span className="text-red-500">*</span></label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="example@gmail.com" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-900">Contact Number <span className="text-red-500">*</span></label>
          <input 
            type="tel" 
            required 
            value={contactNumber}
            onChange={handleContactChange}
            pattern="[0-9]{11}"
            title="Please enter exactly 11 digits"
            placeholder="09123456789" 
            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" 
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-900">Program / Department / Office <span className="text-red-500">*</span></label>
          <select required value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-semibold">
            <option value="">Select Program / Department / Office...</option>
            {(() => {
              const defaultDepts = [
                { code: "CITE", name: "College of Information Tech Education (CITE)" },
                { code: "CAS",  name: "College of Arts & Sciences (CAS)" },
                { code: "CBA",  name: "College of Business Admin (CBA)" },
                { code: "CED",  name: "College of Education (CED)" },
                { code: "SHS",  name: "Senior High School (SHS)" },
              ];
              const listToRender = departmentsList.length > 0 ? departmentsList : defaultDepts;
              return listToRender.map((dept, idx) => {
                const code = dept.code || dept.name;
                const label = dept.name ? (dept.code && !dept.name.includes(dept.code) ? `${dept.code} - ${dept.name}` : dept.name) : code;
                return (
                  <option key={`dept-${dept.id || code}-${idx}`} value={code}>
                    {label}
                  </option>
                );
              });
            })()}
            <option value="External">External Organization</option>
          </select>
        </div>

        {/* FORM SPECIFIC FIELDS: AVR FORM (FORM A) */}
        {selectedVenue?.type === "avr" && (
          <>
            <div className="flex flex-col gap-1.5 sm:col-span-2 bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
              <label className="text-xs font-bold text-slate-900">Booking Classification <span className="text-red-500">*</span></label>
              <select required value={classification} onChange={e => setClassification(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600">
                <option value="">Select Classification...</option>
                <option value="organization">Student Organization Event</option>
                <option value="academic">Academic Class / Exam / Defense</option>
                <option value="admin">Administrative Meeting / Assembly</option>
              </select>

              {/* Endorsement Letter Notice Based on Booking Classification */}
              {classification && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 animate-in fade-in">
                  {classification === "organization" && (
                    <span><strong>Mandatory Endorsement:</strong> Formal request letter signed and endorsed by the <strong>Director of OISAA</strong>.</span>
                  )}
                  {classification === "academic" && (
                    <span><strong>Mandatory Endorsement:</strong> Formal request letter signed and endorsed by the <strong>OVPASA</strong>.</span>
                  )}
                  {classification === "admin" && (
                    <span><strong>Mandatory Endorsement:</strong> Formal request letter signed and endorsed by the <strong>Office / Department Head</strong>.</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">
                Expected Person Count <span className="text-red-500">*</span>
                {selectedVenue?.capacity && (
                  <span className="text-slate-500 font-normal ml-1">(Max capacity: {selectedVenue.capacity})</span>
                )}
              </label>
              <input 
                type="number" 
                required 
                min="1"
                max={selectedVenue?.capacity || ""}
                value={persons} 
                onChange={e => {
                  let val = e.target.value;
                  const maxCap = selectedVenue?.capacity;
                  if (val && maxCap && parseInt(val, 10) > maxCap) {
                    val = maxCap.toString();
                  }
                  setPersons(val);
                }} 
                placeholder={`e.g. ${Math.min(75, selectedVenue?.capacity || 75)}`} 
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Start Time <span className="text-red-500">*</span></label>
              <input 
                type="time" 
                readOnly
                disabled
                value={startTime}
                className="w-full p-3 bg-slate-100/90 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 cursor-not-allowed select-none" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">End Time <span className="text-red-500">*</span></label>
              <input 
                type="time" 
                readOnly
                disabled
                value={endTime}
                className="w-full p-3 bg-slate-100/90 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 cursor-not-allowed select-none" 
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Event Purpose & Brief Summary <span className="text-red-500">*</span></label>
              <textarea rows="3" required value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="State event title, nature of activity, and specific requirements..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"></textarea>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">
                  Equipment-Needed: <span className="text-slate-500 font-semibold text-[11px]">(Optional)</span>
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs pt-1">
                {(() => {
                  const catalogToRender = equipmentCatalog.map(e => ({
                    id: e.id || e.eq_name || e.name,
                    name: e.eq_name || e.name || e.category,
                    available_count: e.available_count ?? e.available_quantity,
                    total_quantity: e.total_quantity
                  }));

                  return catalogToRender.map((item, idx) => {
                    const key = String(item.id || item.name || idx);
                    const val = avrEquipment[key] || avrEquipment[item.name];

                    // Determine real registered stock
                    let realStock = 0;
                    if (typeof item.available_count === "number") {
                      realStock = item.available_count;
                    } else if (typeof item.total_quantity === "number") {
                      realStock = item.total_quantity;
                    } else {
                      realStock = 0;
                    }

                    const isOutOfStock = realStock <= 0;
                    const isChecked = Boolean(val) && !isOutOfStock;
                    const qty = isOutOfStock ? 0 : Math.min(typeof val === "number" ? val : 1, Math.max(1, realStock));

                    return (
                      <div
                        key={`eq-cat-${item.id || key}-${idx}`}
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${
                          isOutOfStock
                            ? "bg-slate-100/70 border-slate-200 opacity-60"
                            : isChecked
                              ? "bg-blue-50/70 border-blue-300 shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <label className={`flex items-center gap-2 font-semibold flex-1 min-w-0 ${isOutOfStock ? "cursor-not-allowed text-slate-400" : "cursor-pointer text-slate-800"}`}>
                          <input
                            type="checkbox"
                            disabled={isOutOfStock}
                            checked={isChecked}
                            onChange={(e) => {
                              if (isOutOfStock) return;
                              const checked = e.target.checked;
                              setAvrEquipment({
                                ...avrEquipment,
                                [key]: checked ? 1 : false
                              });
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 accent-blue-600 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-xs font-bold">{item.name}</span>
                            {!isOutOfStock && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {realStock} unit{realStock === 1 ? "" : "s"} available
                              </span>
                            )}
                          </div>
                        </label>

                        {isOutOfStock ? (
                          <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md shrink-0">
                            Out of Stock
                          </span>
                        ) : isChecked && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-extrabold text-blue-600">Qty:</span>
                            <input
                              type="number"
                              min="1"
                              max={realStock}
                              value={qty}
                              onChange={(e) => {
                                const inputVal = parseInt(e.target.value) || 1;
                                const newQty = Math.min(Math.max(1, inputVal), realStock);
                                setAvrEquipment({ ...avrEquipment, [key]: newQty });
                              }}
                              className="w-11 py-0.5 px-1 bg-white border border-blue-300 rounded-lg text-xs font-black text-center text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </>
        )}



        <div className="sm:col-span-2 flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onBack && onBack()}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-5 rounded-xl font-bold text-xs"
          >
            ← Back to Venue Selection
          </Button>

          <Button type="submit" className="px-8 py-5 rounded-xl font-extrabold text-white text-xs shadow-lg transition-all bg-blue-600 hover:bg-blue-700 shadow-blue-600/20">
            Next: Verification →
          </Button>
        </div>
      </form>
    </div>
  );
}
