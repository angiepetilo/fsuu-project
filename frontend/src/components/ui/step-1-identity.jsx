import React from "react";
import { GraduationCap, Users, UserCheck } from "lucide-react";
import { AppCard, AppCardIcon } from "@/components/ui/app-card";

export function Step1Identity({ identity, handleIdentitySelect }) {
  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AppCard
          onClick={() => handleIdentitySelect("student")}
          className={`group relative text-center cursor-pointer transition-all duration-300 ${identity === "student"
            ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-600/10 scale-[1.02]'
            : 'border-slate-200/80 bg-white hover:border-blue-300 hover:shadow-md'
            }`}
        >
          <AppCardIcon icon={GraduationCap} color="blue" className="w-12 h-12 mx-auto mb-3 group-hover:scale-105 transition-transform" />
          <h3 className="font-extrabold text-slate-900 mb-1 text-sm">Student</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">FSUU Enrolled Student</p>
        </AppCard>

        <AppCard
          onClick={() => handleIdentitySelect("faculty")}
          className={`group relative text-center cursor-pointer transition-all duration-300 ${identity === "faculty"
            ? 'border-amber-500 bg-amber-50/50 shadow-md shadow-amber-500/10 scale-[1.02]'
            : 'border-slate-200/80 bg-white hover:border-amber-300 hover:shadow-md'
            }`}
        >
          <AppCardIcon icon={Users} color="amber" className="w-12 h-12 mx-auto mb-3 group-hover:scale-105 transition-transform" />
          <h3 className="font-extrabold text-slate-900 mb-1 text-sm">Faculty / Staff</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">FSUU Academic or Departmental Representative</p>
        </AppCard>

        <AppCard
          onClick={() => handleIdentitySelect("external")}
          className={`group relative text-center cursor-pointer transition-all duration-300 ${identity === "external"
            ? 'border-emerald-500 bg-emerald-50/50 shadow-md shadow-emerald-500/10 scale-[1.02]'
            : 'border-slate-200/80 bg-white hover:border-emerald-300 hover:shadow-md'
            }`}
        >
          <AppCardIcon icon={UserCheck} color="emerald" className="w-12 h-12 mx-auto mb-3 group-hover:scale-105 transition-transform" />
          <h3 className="font-extrabold text-slate-900 mb-1 text-sm">External User</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">Guest or Visitor</p>
        </AppCard>
      </div>
    </div>
  );
}

export default Step1Identity;
