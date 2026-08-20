import { ChevronDown, Check } from "lucide-react";

export default function StepHeader({ stepNum, title, subtitle, activeStep, completedSteps, toggleStep }) {
  const isActive = activeStep === stepNum;
  const isCompleted = completedSteps.includes(stepNum);
  const isDisabled = stepNum > 1 && !completedSteps.includes(stepNum - 1);

  return (
    <div
      className={`p-6 flex justify-between items-center cursor-pointer select-none transition-all rounded-t-2xl ${isActive
        ? 'bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white border-b border-blue-100'
        : 'bg-slate-50/60 hover:bg-slate-100/60'
        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => !isDisabled && toggleStep(stepNum)}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-extrabold transition-all duration-300 shadow-sm
          ${isCompleted && !isActive ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20' :
            isActive ? 'bg-blue-600 border-blue-600 text-white shadow-blue-600/30 scale-105' : 'bg-white border-slate-200 text-slate-400'}`}
        >
          {isCompleted && !isActive ? <Check size={18} /> : stepNum}
        </div>
        <div>
          <h2 className={`text-lg font-bold transition-colors ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
        </div>
      </div>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${isActive ? 'bg-blue-100/60 text-blue-600 rotate-180' : 'text-slate-400'}`}>
        <ChevronDown size={18} />
      </div>
    </div>
  );
}
