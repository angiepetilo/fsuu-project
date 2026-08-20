import { useState, useEffect } from "react";
import { Sparkles, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";

export default function Step3Details({
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

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      {/* Context Banner */}
      <div className={`p-4 sm:p-5 rounded-2xl mb-6 border ${primaryDept === "sco"
        ? 'bg-purple-50/80 border-purple-100 text-purple-900'
        : 'bg-blue-50/80 border-blue-100 text-blue-900'
        }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h4 className="font-extrabold text-sm">Borrowing Form</h4>
              <p className="text-xs opacity-80">
                Total Selected Items: <span className="font-bold">{selectedItems.length}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Automatic Display of Selected Borrow Date, Time Start, Time End & Extension */}
        {(() => {
          const formatDateTimeDisplay = (dtStr, fallbackTime = "08:00") => {
            if (!dtStr) return "Scheduled Slot";
            const cleaned = dtStr.replace("T", " ");
            const parts = cleaned.split(" ");
            let datePart = parts[0];
            let timePart = parts[1];
            if (!timePart && datePart.length > 10) {
              timePart = datePart.substring(10);
              datePart = datePart.substring(0, 10);
            }
            if (!timePart) timePart = fallbackTime;
            const [h, m] = timePart.split(":").map(Number);
            const ampm = (h >= 12 && h < 24) ? "PM" : "AM";
            const h12 = (h % 12) || 12;
            return `${datePart} • ${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
          };

          return (
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-800">
              <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 font-semibold">Start Time:</span>
                <span className="text-blue-700">{formatDateTimeDisplay(startTime, "08:00")}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-slate-500 font-semibold">Expected Return:</span>
                <span className="text-blue-700">{formatDateTimeDisplay(endTime, "17:00")}</span>
              </div>
            </div>
          );
        })()}
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


        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-900">Location / Venue of Equipment Use <span className="text-red-500">*</span></label>
          <input type="text" required value={placeOfUse} onChange={e => setPlaceOfUse(e.target.value)} placeholder="e.g. Main Gymnasium / AVR 1" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600" />
        </div>

        <div className="sm:col-span-2 flex flex-col gap-1.5 p-4 bg-slate-50/80 border border-slate-200 rounded-xl">
          <label className="text-xs font-bold text-slate-900">Send Tracking Number via <span className="text-red-500">*</span></label>
          <div className="flex items-center gap-6 mt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="notificationChannel"
                value="email"
                checked={notificationChannel === 'email'}
                onChange={() => setNotificationChannel && setNotificationChannel('email')}
                className="accent-blue-600"
              />
              <span>Email ({email || 'Registered Email'})</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="notificationChannel"
                value="sms"
                checked={notificationChannel === 'sms'}
                onChange={() => setNotificationChannel && setNotificationChannel('sms')}
                className="accent-blue-600"
              />
              <span>SMS ({contactNumber || 'Registered Phone'})</span>
            </label>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Your tracking number will be sent via {notificationChannel === 'sms' ? 'SMS to your phone number' : 'Email to your registered email'}.
          </p>
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
            Next: Verification →
          </Button>
        </div>
      </form>
    </div>
  );
}
