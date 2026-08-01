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

  useEffect(() => {
    api.get("/public/booking-requirements")
      .then(res => setRequirements(Array.isArray(res.data) ? res.data : []))
      .catch(() => {
        api.get("/admin/booking-requirements")
          .then(res => setRequirements(Array.isArray(res.data) ? res.data : []))
          .catch(() => setRequirements([]));
      });
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

      {/* DYNAMIC REQUIREMENTS NEEDED BEFORE VENUE BOOKING (Item 3) */}
      <div className="bg-amber-50/90 border-2 border-amber-200 p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
          <h4 className="font-extrabold text-amber-900 text-xs flex items-center gap-2 uppercase tracking-wide">
            <FileCheck size={16} className="text-amber-700" />
            3. Requirements Needed Before Venue Booking
          </h4>
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
            Mandatory Verification
          </span>
        </div>
        <p className="text-xs text-amber-800 font-medium leading-relaxed">
          Please prepare the mandatory document approvals set up by the System Admin in Settings prior to final submission:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {requirements.length > 0 ? (
            requirements.map((req, idx) => (
              <div key={req.id || idx} className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-xs flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-extrabold text-slate-900 text-xs">{req.label}</h5>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">{req.description || "Required approval document"}</p>
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-xs flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-extrabold text-slate-900 text-xs">Activity Endorsement Letter</h5>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Signed by Dean / Department Chairperson</p>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-xs flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-extrabold text-slate-900 text-xs">AVR / SCO Facility Form</h5>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Approved by Building Administrator</p>
                </div>
              </div>
            </>
          )}
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
            <option value="">Select Department...</option>
            <option value="CITE">College of Information Tech Education (CITE)</option>
            <option value="CAS">College of Arts & Sciences (CAS)</option>
            <option value="CBA">College of Business Admin (CBA)</option>
            <option value="CED">College of Education (CED)</option>
            <option value="SHS">Senior High School (SHS)</option>
            <option value="External">External Organization</option>
          </select>
        </div>

        {/* FORM SPECIFIC FIELDS: AVR FORM (FORM A) */}
        {selectedVenue?.type === "avr" && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Booking Classification <span className="text-red-500">*</span></label>
              <select required value={classification} onChange={e => setClassification(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600">
                <option value="">Select Classification...</option>
                <option value="organization">Student Organization Event</option>
                <option value="academic">Academic Class / Exam / Defense</option>
                <option value="admin">Administrative Meeting / Assembly</option>
              </select>
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
