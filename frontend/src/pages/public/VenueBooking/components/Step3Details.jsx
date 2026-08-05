import { FileText, Sparkles, CheckCircle2, FileCheck, ShieldAlert } from "lucide-react";
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
  productionType, setProductionType,
  targetAudience, setTargetAudience,
  scoSupport, setScoSupport,
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

        try {
          const savedStr = localStorage.getItem("fsuu_departments");
          if (savedStr) {
            const savedList = JSON.parse(savedStr);
            const clean = (str) => (str || "").toLowerCase().trim();
            savedList.forEach((item) => {
              if (item && !data.some((d) => clean(d.code) === clean(item.code) || clean(d.name) === clean(item.name))) {
                data.push(item);
              }
            });
          }
        } catch { }

        setDepartmentsList(data);
      } catch {
        setDepartmentsList([]);
      }
    };

    const fetchEquipment = async () => {
      try {
        const res = await api.get("/public/equipment-types").catch(() => api.get("/admin/equipment-types"));
        let data = Array.isArray(res.data) ? res.data : [];

        try {
          const savedStr = localStorage.getItem("fsuu_equipment_inventory") || localStorage.getItem("fsuu_equipment_types");
          if (savedStr) {
            const savedList = JSON.parse(savedStr);
            const clean = (str) => (str || "").toLowerCase().trim();
            savedList.forEach((item) => {
              const name = item.eq_name || item.name || item.category;
              if (name && !data.some((d) => clean(d.eq_name || d.name) === clean(name))) {
                data.push(item);
              }
            });
          }
        } catch { }

        setEquipmentCatalog(data);
      } catch {
        setEquipmentCatalog([]);
      }
    };

    fetchDepts();
    fetchEquipment();

    window.addEventListener("departments_updated", fetchDepts);
    window.addEventListener("equipment_inventory_updated", fetchEquipment);
    window.addEventListener("storage", fetchDepts);
    window.addEventListener("storage", fetchEquipment);
    return () => {
      window.removeEventListener("departments_updated", fetchDepts);
      window.removeEventListener("equipment_inventory_updated", fetchEquipment);
      window.removeEventListener("storage", fetchDepts);
      window.removeEventListener("storage", fetchEquipment);
    };
  }, []);

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300 space-y-6">
      {/* Context Banner indicating which form is active */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between ${selectedVenue?.type === "sco"
        ? 'bg-purple-50/80 border-purple-100 text-purple-900'
        : 'bg-blue-50/80 border-blue-100 text-blue-900'
        }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selectedVenue?.type === "sco" ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
            }`}>
            {selectedVenue?.type === "sco" ? <Sparkles size={18} /> : <FileText size={18} />}
          </div>
          <div>
            <h4 className="font-extrabold text-sm">
              {selectedVenue?.type === "sco" ? "Student Communications Office (SCO) Request" : "AVR Resource Center Booking Form"}
            </h4>
            <p className="text-xs opacity-80">
              Target Venue: <span className="font-bold">{selectedVenue?.name}</span> | Date: <span className="font-bold">{selectedDate}</span>
            </p>
          </div>
        </div>
        <span className="text-[11px] font-extrabold uppercase px-3 py-1 bg-white rounded-full border shadow-sm">
          {selectedVenue?.type === "sco" ? "SCO Studio Spec" : "AVR Hall Spec"}
        </span>
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
                  <option key={dept.id || idx} value={code}>
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
                    <span>📄 <strong>Mandatory Endorsement:</strong> Formal request letter signed and endorsed by the <strong>Dean of Student Affairs (DSA)</strong>.</span>
                  )}
                  {classification === "academic" && (
                    <span>📄 <strong>Mandatory Endorsement:</strong> Formal request letter signed and endorsed by the <strong>VP for Academic Affairs (VP Acad)</strong>.</span>
                  )}
                  {classification === "admin" && (
                    <span>📄 <strong>Mandatory Endorsement:</strong> Formal request letter signed and endorsed by the <strong>Office / Department Head</strong>.</span>
                  )}
                </div>
              )}
            </div>




            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Expected Person Count <span className="text-red-500">*</span></label>
              <input type="number" required value={persons} onChange={e => setPersons(e.target.value)} placeholder="e.g. 75" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Start Time <span className="text-red-500">*</span></label>
              <input 
                type="time" 
                step="300"
                required 
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">End Time <span className="text-red-500">*</span></label>
              <input 
                type="time" 
                step="300"
                required 
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                min={startTime}
                disabled={!startTime}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 disabled:opacity-50 disabled:bg-slate-100" 
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Event Purpose & Brief Summary <span className="text-red-500">*</span></label>
              <textarea rows="3" required value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="State event title, nature of activity, and specific requirements..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"></textarea>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">
                  AVR Built-in Equipment Needed: <span className="text-slate-500 font-semibold text-[11px]">(Optional)</span>
                </label>
                <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Equipment Catalog Checklist (Optional)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs pt-1">
                {(() => {
                  const defaultItems = [
                    { id: "proj", name: "Projector" },
                    { id: "camera", name: "Camera" },
                    { id: "screen", name: "Screen" },
                    { id: "mic", name: "Microphone" },
                    { id: "wmic", name: "Wireless Microphone" },
                    { id: "ext", name: "Extension wire" },
                    { id: "hdmi", name: "HDMI" },
                  ];
                  const catalogToRender = equipmentCatalog.length > 0
                    ? equipmentCatalog.map(e => ({ id: e.id || e.eq_name || e.name, name: e.eq_name || e.name || e.category, available_count: e.available_count ?? e.available_quantity, total_quantity: e.total_quantity }))
                    : defaultItems;

                  return catalogToRender.map((item) => {
                    const key = String(item.id || item.name);
                    const val = avrEquipment[key];

                    // Determine real registered stock
                    let realStock = 0;
                    if (typeof item.available_count === "number") {
                      realStock = item.available_count;
                    } else if (typeof item.total_quantity === "number") {
                      realStock = item.total_quantity;
                    } else {
                      try {
                        const lsUnits = JSON.parse(localStorage.getItem("fsuu_equipment_units") || "[]");
                        const catName = String(item.name || item.eq_name || "").toUpperCase().trim();
                        const count = lsUnits.filter(u => {
                          const uCat = String(u.category || u.assigned_category || u.equipmentType?.name || u.name || "").toUpperCase().trim();
                          return uCat === catName || uCat.includes(catName) || catName.includes(uCat);
                        }).length;
                        realStock = count;
                      } catch {
                        realStock = 0;
                      }
                    }

                    const isOutOfStock = realStock <= 0;
                    const isChecked = Boolean(val) && !isOutOfStock;
                    const qty = isOutOfStock ? 0 : Math.min(typeof val === "number" ? val : 1, Math.max(1, realStock));

                    return (
                      <div
                        key={key}
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
                          <span className="truncate text-xs font-bold">{item.name}</span>
                        </label>

                        {isOutOfStock ? (
                          <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md shrink-0">
                            No Stock Registered
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

        {/* FORM SPECIFIC FIELDS: SCO STUDIO FORM (FORM B) */}
        {selectedVenue?.type === "sco" && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Production Type <span className="text-red-500">*</span></label>
              <select required value={productionType} onChange={e => setProductionType(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-600">
                <option value="">Select Production Type...</option>
                <option value="livestream">Official Campus Livestream Broadcast</option>
                <option value="recording">Video Recording / Interview</option>
                <option value="podcast">Podcast / Audio Session</option>
                <option value="theater">Film Viewing / Mini Theater Presentation</option>
                <option value="virtual">Webinar / Virtual Conference</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Broadcast Target Audience <span className="text-red-500">*</span></label>
              <select required value={targetAudience} onChange={e => setTargetAudience(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-600">
                <option value="internal">FSUU Internal Campus Students & Staff</option>
                <option value="public">Public Facebook Live / YouTube Stream</option>
                <option value="private">Private Archival Recording Only</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Setup & Technical Call Time <span className="text-red-500">*</span></label>
              <input 
                type="time" 
                step="300"
                required 
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-600" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Broadcast End Time <span className="text-red-500">*</span></label>
              <input 
                type="time" 
                step="300"
                required 
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                min={startTime}
                disabled={!startTime}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-600 disabled:opacity-50 disabled:bg-slate-100" 
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Production Title & Program Script Summary <span className="text-red-500">*</span></label>
              <textarea rows="3" required value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Describe the livestream / recording title, guest speakers, and run-down schedule..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-600"></textarea>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-2 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
              <label className="text-xs font-bold text-slate-900">SCO Technical Support Required:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={scoSupport.multicam} onChange={e => setScoSupport({...scoSupport, multicam: e.target.checked})} className="rounded text-purple-600 focus:ring-purple-500 accent-purple-600" /> Multi-cam Operator
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={scoSupport.teleprompter} onChange={e => setScoSupport({...scoSupport, teleprompter: e.target.checked})} className="rounded text-purple-600 focus:ring-purple-500 accent-purple-600" /> Teleprompter Setup
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={scoSupport.greenScreen} onChange={e => setScoSupport({...scoSupport, greenScreen: e.target.checked})} className="rounded text-purple-600 focus:ring-purple-500 accent-purple-600" /> Green Screen Wall
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={scoSupport.audioEng} onChange={e => setScoSupport({...scoSupport, audioEng: e.target.checked})} className="rounded text-purple-600 focus:ring-purple-500 accent-purple-600" /> Audio Engineer
                </label>
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

          <Button type="submit" className={`px-8 py-5 rounded-xl font-extrabold text-white text-xs shadow-lg transition-all ${selectedVenue?.type === "sco"
            ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
            }`}>
            Next: Verification →
          </Button>
        </div>
      </form>
    </div>
  );
}
