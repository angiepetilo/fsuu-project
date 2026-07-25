import { Sparkles, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  programs = []
}) {
  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      {/* Context Banner */}
      <div className={`p-4 rounded-2xl mb-6 border flex items-center justify-between ${primaryDept === "sco"
        ? 'bg-purple-50/80 border-purple-100 text-purple-900'
        : 'bg-blue-50/80 border-blue-100 text-blue-900'
        }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${primaryDept === "sco" ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
            }`}>
            {primaryDept === "sco" ? <Sparkles size={18} /> : <PackageOpen size={18} />}
          </div>
          <div>
            <h4 className="font-extrabold text-sm">
              {primaryDept === "sco" ? "SCO Media Equipment Requisition" : "AVR Equipment Borrowing Request"}
            </h4>
            <p className="text-xs opacity-80">
              Total Selected Items: <span className="font-bold">{selectedItems.length}</span>
            </p>
          </div>
        </div>
        <span className="text-[11px] font-extrabold uppercase px-3 py-1 bg-white rounded-full border shadow-sm">
          {primaryDept === "sco" ? "SCO Managed" : "AVR Managed"}
        </span>
      </div>

      <form onSubmit={handleDetailsSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-900">Borrower Full Name <span className="text-red-500">*</span></label>
          <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Juan Dela Cruz" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-900">Institutional Email <span className="text-red-500">*</span></label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="example@urios.edu.ph" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600" />
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
          <label className="text-xs font-bold text-slate-900">Borrow Release Date & Time <span className="text-red-500">*</span></label>
          <input 
            type="datetime-local" 
            required 
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600" 
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-900">Department / Office <span className="text-red-500">*</span></label>
          <select required value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all">
            <option value="">Select Department...</option>
            {programs.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-900">Expected Return Date & Time <span className="text-red-500">*</span></label>
          <input 
            type="datetime-local" 
            required 
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            min={startTime}
            disabled={!startTime}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 disabled:opacity-50 disabled:bg-slate-100" 
          />
        </div>

        <div className="flex flex-col gap-1.5">
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

        <div className="sm:col-span-2 flex justify-end mt-4">
          <Button type="submit" className={`px-6 py-2.5 rounded-xl font-bold text-white text-xs shadow-md transition-all flex items-center gap-2 ${primaryDept === "sco"
            ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
            }`}>
            <span>Proceed to Requirements & Verification</span>
            <span>→</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
