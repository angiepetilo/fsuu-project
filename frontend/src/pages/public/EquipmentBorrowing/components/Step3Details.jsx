import { useState, useEffect } from "react";
import { Sparkles, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";

export default function Step3Details({
  identity,
  primaryDept,
  selectedItems,
  handleDetailsSubmit,
  fullName, setFullName,
  email, setEmail,
  contactNumber, handleContactChange,
  startTime, setStartTime,
  department, setDepartment,
  endTime, setEndTime,
  placeOfUse, setPlaceOfUse,
  handlerName, setHandlerName,
  purpose, setPurpose,
  notificationChannel = "email", setNotificationChannel,
  campusBranch = "FSUU Main (AVR Center)", setCampusBranch,
  onBack,
}) {
  const [departmentsList, setDepartmentsList] = useState([]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get("/public/departments").catch(() => api.get("/admin/departments"));
        let data = Array.isArray(res.data) ? res.data : [];
        setDepartmentsList(data);
      } catch {
        setDepartmentsList([]);
      }
    };

    fetchDepts();
    window.addEventListener("departments_updated", fetchDepts);
    return () => {
      window.removeEventListener("departments_updated", fetchDepts);
    };
  }, []);

  const formatScheduleDisplay = (startStr, endStr) => {
    if (!startStr) return "Scheduled Slot";
    const [dStart, tStart] = (startStr || "").replace("T", " ").split(" ");
    const [dEnd, tEnd] = (endStr || "").replace("T", " ").split(" ");

    const formatT = (t, fallback = "08:00") => {
      const timeVal = t || fallback;
      const [h, m] = timeVal.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = (h % 12) || 12;
      return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
    };

    const timeStartFmt = formatT(tStart, "08:00");
    const timeEndFmt = formatT(tEnd, "17:00");

    if (dStart === dEnd || !dEnd) {
      return `${dStart} (${timeStartFmt} - ${timeEndFmt})`;
    }
    return `${dStart} (${timeStartFmt}) to ${dEnd} (${timeEndFmt})`;
  };

  const isExternal = (identity || "").toLowerCase() === "external";

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      {/* Context Banner matching Venue Booking header */}
      <div className="p-4 sm:p-5 rounded-2xl mb-6 border flex items-center justify-between bg-blue-50/90 border-blue-200 text-blue-950 shadow-2xs">
        <div>
          <h4 className="font-black text-sm tracking-tight text-slate-900">Borrowing Form</h4>
          <p className="text-xs text-blue-900 font-semibold mt-0.5">
            Total Selected: <span className="font-extrabold text-blue-700">{selectedItems.length} Equipment Unit{selectedItems.length > 1 ? 's' : ''}</span> | Schedule: <span className="font-extrabold text-blue-700">{formatScheduleDisplay(startTime, endTime)}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleDetailsSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-900">Borrower Full Name <span className="text-red-500">*</span></label>
          <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Juan Dela Cruz" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-900">Personal Email <span className="text-red-500">*</span></label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="example@gmail.com" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-900">Contact Phone Number <span className="text-red-500">*</span></label>
          <input 
            type="tel" 
            required 
            value={contactNumber}
            onChange={handleContactChange}
            pattern="[0-9]{11}"
            title="Please enter exactly 11 digits"
            placeholder="09123456789" 
            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600" 
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-900">
            {isExternal ? "Office / Organization" : "Department"} <span className="text-red-500">*</span>
          </label>
          {isExternal ? (
            <input
              type="text"
              required
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="e.g. DepEd / LGU Butuan / Partner Company"
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-semibold"
            />
          ) : (
            <select required value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-semibold">
              <option value="">Select Department...</option>
              {(() => {
                const defaultDepts = [
                  { code: "CITE", name: "College of Information Tech Education (CITE)" },
                  { code: "CAS",  name: "College of Arts & Sciences (CAS)" },
                  { code: "CBA",  name: "College of Business Admin (CBA)" },
                  { code: "CED",  name: "College of Education (CED)" },
                  { code: "CON",  name: "College of Nursing (CON)" },
                  { code: "CEA",  name: "College of Engineering & Architecture (CEA)" },
                  { code: "SHS",  name: "Senior High School (SHS)" },
                  { code: "JHS",  name: "Junior High School (JHS)" },
                  { code: "ADMIN", name: "University Administration" },
                ];
                const listToRender = departmentsList.length > 0
                  ? departmentsList.filter(d => (d.code || d.name || "").toLowerCase() !== "external")
                  : defaultDepts;
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
            </select>
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs font-bold text-slate-900">Location / Venue of Equipment Use <span className="text-red-500">*</span></label>
          <input type="text" required value={placeOfUse} onChange={e => setPlaceOfUse(e.target.value)} placeholder="e.g. Main Gymnasium / AVR 1" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600" />
        </div>

        {primaryDept === "sco" && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-900">Designated Technical Operator / Handler <span className="text-red-500">*</span></label>
            <input type="text" required value={handlerName} onChange={e => setHandlerName(e.target.value)} placeholder="Name of trained technical student/staff operating the camera or mixer..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-600" />
          </div>
        )}

        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-900">Detailed Purpose of Usage <span className="text-red-500">*</span></label>
          <textarea rows="3" required value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Describe event activity, project name, or class requirement..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"></textarea>
        </div>

        <div className="sm:col-span-2 flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onBack && onBack()}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-5 rounded-xl font-bold text-xs"
          >
            ← Back to Equipment Selection
          </Button>

          <Button type="submit" className={`px-8 py-5 rounded-xl font-extrabold text-white text-xs shadow-lg transition-all ${primaryDept === "sco"
            ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
            }`}>
            Next: Review →
          </Button>
        </div>
      </form>
    </div>
  );
}
