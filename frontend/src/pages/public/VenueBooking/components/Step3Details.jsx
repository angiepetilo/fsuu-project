import { FileText, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  programs = []
}) {
  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      {/* Context Banner indicating which form is active */}
      <div className={`p-4 rounded-2xl mb-6 border flex items-center justify-between ${selectedVenue?.type === "sco"
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
              Target Venue: <span className="font-bold">{selectedVenue?.name}</span> | Date: <span className="font-bold">{selectedDate}</span> | Time: <span className="font-bold">{startTime || "—"} to {endTime || "—"}</span>
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
          <label className="text-xs font-bold text-slate-900">Institutional Email <span className="text-red-500">*</span></label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="example@urios.edu.ph" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all" />
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
          <select required value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all">
            <option value="" disabled hidden>Select Department...</option>
            {programs.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* FORM SPECIFIC FIELDS: AVR FORM (FORM A) */}
        {selectedVenue?.type === "avr" && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Booking Classification <span className="text-red-500">*</span></label>
              <select required value={classification} onChange={e => setClassification(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600">
                <option value="" disabled hidden>Select Classification...</option>
                <option value="organization">Student Organization Event</option>
                <option value="academic">Academic Class / Exam / Defense</option>
                <option value="admin">Administrative Meeting / Assembly</option>
              </select>
            </div>

            {identity === "external" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">AVR Head PIN Verification Status <span className="text-red-500">*</span></label>
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-800 font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>PIN Verified by AVR Head (123456)</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Expected Person Count <span className="text-red-500">*</span></label>
              <input type="number" required value={persons} onChange={e => setPersons(e.target.value)} placeholder="e.g. 75" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>Start Time</span>
                <span className="text-[10px] text-slate-400 font-medium">Selected in Step 2</span>
              </label>
              <input 
                type="time" 
                readOnly
                disabled
                value={startTime}
                className="w-full p-3 bg-slate-100 border border-slate-200/80 rounded-xl text-sm font-extrabold text-slate-700 cursor-not-allowed" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>End Time</span>
                <span className="text-[10px] text-slate-400 font-medium">Selected in Step 2</span>
              </label>
              <input 
                type="time" 
                readOnly
                disabled
                value={endTime}
                className="w-full p-3 bg-slate-100 border border-slate-200/80 rounded-xl text-sm font-extrabold text-slate-700 cursor-not-allowed" 
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Event Purpose & Brief Summary <span className="text-red-500">*</span></label>
              <textarea rows="3" required value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="State event title, nature of activity, and specific requirements..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600"></textarea>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <label className="text-xs font-bold text-slate-900">AVR Built-in Equipment Needed:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={avrEquipment.mic} onChange={e => setAvrEquipment({...avrEquipment, mic: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 accent-blue-600" /> Wireless Microphones
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={avrEquipment.proj} onChange={e => setAvrEquipment({...avrEquipment, proj: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 accent-blue-600" /> HD Projector
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={avrEquipment.sound} onChange={e => setAvrEquipment({...avrEquipment, sound: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 accent-blue-600" /> Sound System
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={avrEquipment.podium} onChange={e => setAvrEquipment({...avrEquipment, podium: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 accent-blue-600" /> Podium Setup
                </label>
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
              <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>Setup & Call Time</span>
                <span className="text-[10px] text-slate-400 font-medium">Selected in Step 2</span>
              </label>
              <input 
                type="time" 
                readOnly
                disabled
                value={startTime}
                className="w-full p-3 bg-slate-100 border border-slate-200/80 rounded-xl text-sm font-extrabold text-slate-700 cursor-not-allowed" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>Broadcast End Time</span>
                <span className="text-[10px] text-slate-400 font-medium">Selected in Step 2</span>
              </label>
              <input 
                type="time" 
                readOnly
                disabled
                value={endTime}
                className="w-full p-3 bg-slate-100 border border-slate-200/80 rounded-xl text-sm font-extrabold text-slate-700 cursor-not-allowed" 
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

        <div className="sm:col-span-2 flex justify-end mt-4">
          <Button type="submit" className={`px-6 py-2.5 rounded-xl font-bold text-white text-xs shadow-md transition-all flex items-center gap-2 ${selectedVenue?.type === "sco"
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
