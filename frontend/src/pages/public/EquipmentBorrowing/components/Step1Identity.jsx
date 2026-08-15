import { GraduationCap, Users, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Step1Identity({
  identity,
  selectedIdentity,
  handleIdentitySelect,
  onSelectIdentity,
  onNext,
}) {
  const currentIdentity = (identity || selectedIdentity || "").toLowerCase();
  const selectHandler = (val) => {
    if (handleIdentitySelect) handleIdentitySelect(val);
    if (onSelectIdentity) onSelectIdentity(val);
  };

  return (
    <div className="p-6 sm:p-8 animate-in fade-in duration-300 space-y-8">
      {/* 1. Identity Selection */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div
            onClick={() => selectHandler("Student")}
            className={`group bg-white rounded-[24px] p-6 text-center cursor-pointer transition-all duration-300 border-2 flex flex-col items-center justify-center min-h-[190px] ${
              currentIdentity === "student"
                ? "border-blue-500 bg-white shadow-md shadow-blue-500/10 ring-4 ring-blue-50/60 scale-[1.02]"
                : "border-slate-200/80 shadow-2xs hover:border-blue-300 hover:shadow-md"
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shrink-0">
              <GraduationCap size={28} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base mb-1">Student</h3>
            <p className="text-xs font-semibold text-slate-500">Enrolled FSUU Student</p>
          </div>

          <div
            onClick={() => selectHandler("Faculty")}
            className={`group bg-white rounded-[24px] p-6 text-center cursor-pointer transition-all duration-300 border-2 flex flex-col items-center justify-center min-h-[190px] ${
              currentIdentity === "faculty"
                ? "border-amber-500 bg-white shadow-md shadow-amber-500/10 ring-4 ring-amber-50/60 scale-[1.02]"
                : "border-slate-200/80 shadow-2xs hover:border-amber-300 hover:shadow-md"
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shrink-0">
              <Users size={28} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base mb-1">Faculty / Staff</h3>
            <p className="text-xs font-semibold text-slate-500">Academic or Administrative Dept</p>
          </div>

          <div
            onClick={() => selectHandler("External")}
            className={`group bg-white rounded-[24px] p-6 text-center cursor-pointer transition-all duration-300 border-2 flex flex-col items-center justify-center min-h-[190px] ${
              currentIdentity === "external"
                ? "border-emerald-500 bg-white shadow-md shadow-emerald-500/10 ring-4 ring-emerald-50/60 scale-[1.02]"
                : "border-slate-200/80 shadow-2xs hover:border-emerald-300 hover:shadow-md"
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shrink-0">
              <User size={28} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base mb-1">External User</h3>
            <p className="text-xs font-semibold text-slate-500">Guest or Partner Entity</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <Button
          onClick={() => onNext && onNext()}
          disabled={!currentIdentity}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-full font-extrabold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer"
        >
          <span>Next: Select Equipment & Quantity</span>
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

export default Step1Identity;
