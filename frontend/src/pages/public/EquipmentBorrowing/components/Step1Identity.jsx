import { GraduationCap, Users, User } from "lucide-react";

export default function Step1Identity({ identity, handleIdentitySelect }) {
  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
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
          <p className="text-xs text-slate-500">Enrolled Student</p>
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
          <p className="text-xs text-slate-500">Academic / Administrative Department</p>
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
          <p className="text-xs text-slate-500">Guest or Partner entity borrowing with department clearance.</p>
        </div>
      </div>
    </div>
  );
}
