import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Step1Identity({ identity, handleIdentitySelect, onNext }) {

  return (
    <div className="p-6 sm:p-10 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">

        {/* Role 1: Student */}
        <div
          onClick={() => handleIdentitySelect("student")}
          className={`group bg-white rounded-3xl p-8 border-2 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[220px] ${identity === "student"
              ? "border-blue-600 shadow-md shadow-blue-500/10 scale-[1.02]"
              : "border-slate-100 shadow-xs hover:border-blue-300 hover:shadow-md hover:-translate-y-1"
            }`}
        >
          <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">
            🎓 / 👩‍🎓
          </div>
          <h3 className="font-extrabold text-slate-900 text-lg">Student</h3>
        </div>

        {/* Role 2: Faculty */}
        <div
          onClick={() => handleIdentitySelect("faculty")}
          className={`group bg-white rounded-3xl p-8 border-2 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[220px] ${identity === "faculty"
              ? "border-blue-600 shadow-md shadow-blue-500/10 scale-[1.02]"
              : "border-slate-100 shadow-xs hover:border-blue-300 hover:shadow-md hover:-translate-y-1"
            }`}
        >
          <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">
            👩‍🏫
          </div>
          <h3 className="font-extrabold text-slate-900 text-lg">Faculty</h3>
        </div>

        {/* Role 3: External Visitor / Guest */}
        <div
          onClick={() => handleIdentitySelect("external")}
          className={`group bg-white rounded-3xl p-8 border-2 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[220px] ${identity === "external"
              ? "border-blue-600 shadow-md shadow-blue-500/10 scale-[1.02]"
              : "border-slate-100 shadow-xs hover:border-blue-300 hover:shadow-md hover:-translate-y-1"
            }`}
        >
          <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">
            👱
          </div>
          <h3 className="font-extrabold text-slate-900 text-lg leading-snug">
            External Visitor /<br />Guest
          </h3>
        </div>

      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-4 border-t border-slate-100">
        <Button
          disabled={!identity}
          onClick={() => identity && onNext && onNext()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-full font-extrabold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer"
        >
          <span>Next: Select Venue</span>
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

export default Step1Identity;


