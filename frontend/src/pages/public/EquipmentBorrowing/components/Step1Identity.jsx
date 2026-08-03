import { GraduationCap, Users, User, ArrowRight, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Step1Identity({

  identity,
  handleIdentitySelect,
  selectedLocation = "fsuu-main",
  setSelectedLocation,
  onNext
}) {
  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300 space-y-8">

      {/* 1. Identity Selection */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <User size={16} className="text-blue-600" />
          1. Choose Your Requisition Identity *
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => handleIdentitySelect("Student")}
            className={`group relative border-2 rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${identity === "student"
              ? 'border-blue-600 bg-gradient-to-b from-blue-50/80 to-blue-50/20 shadow-lg shadow-blue-600/10 scale-[1.02]'
              : 'border-slate-100 bg-white hover:border-blue-200 hover:shadow-md'
              }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-100/60 text-blue-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <GraduationCap size={28} />
            </div>
            <h3 className="font-bold text-slate-900 mb-1 text-base">Student</h3>
            <p className="text-xs text-slate-500">Enrolled FSUU Student</p>
          </div>

          <div
            onClick={() => handleIdentitySelect("Faculty")}
            className={`group relative border-2 rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${identity === "faculty"
              ? 'border-amber-500 bg-gradient-to-b from-amber-50/80 to-amber-50/20 shadow-lg shadow-amber-500/10 scale-[1.02]'
              : 'border-slate-100 bg-white hover:border-amber-200 hover:shadow-md'
              }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-100/60 text-amber-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Users size={28} />
            </div>
            <h3 className="font-bold text-slate-900 mb-1 text-base">Faculty / Staff</h3>
            <p className="text-xs text-slate-500">Academic or Administrative Dept</p>
          </div>

          <div
            onClick={() => handleIdentitySelect("External")}
            className={`group relative border-2 rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${identity === "external"
              ? 'border-emerald-500 bg-gradient-to-b from-emerald-50/80 to-emerald-50/20 shadow-lg shadow-emerald-500/10 scale-[1.02]'
              : 'border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md'
              }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-100/60 text-emerald-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <User size={28} />
            </div>
            <h3 className="font-bold text-slate-900 mb-1 text-base">External User</h3>
            <p className="text-xs text-slate-500">Guest or Partner Entity</p>
          </div>
        </div>
      </div>

      {/* 2. Location Selection (Item 1) */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <MapPin size={16} className="text-blue-600" />
          2. Choose Campus Branch Location *
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => setSelectedLocation && setSelectedLocation("fsuu-main")}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${selectedLocation === "fsuu-main"
              ? "border-blue-600 bg-blue-50/80 shadow-md"
              : "border-slate-100 bg-white hover:border-blue-200"
              }`}
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Building2 size={24} />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">FSUU Main Campus</h4>
              <p className="text-xs text-slate-500 font-medium">AVR Audio-Visual Center & Equipment Kiosk</p>
            </div>
          </div>

          <div
            onClick={() => setSelectedLocation && setSelectedLocation("fsuu-morelos")}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${selectedLocation === "fsuu-morelos"
              ? "border-purple-600 bg-purple-50/80 shadow-md"
              : "border-slate-100 bg-white hover:border-purple-200"
              }`}
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Building2 size={24} />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">FSUU Morelos Campus</h4>
              <p className="text-xs text-slate-500 font-medium">SCO Studio & Broadcast Assets Kiosk</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Switch Bar */}
      <div className="flex justify-end pt-4 border-t border-slate-100">
        <Button
          disabled={!identity}
          onClick={() => identity && onNext && onNext()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
        >
          <span>Next: Select Equipment & Quantity</span>
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

export default Step1Identity;

