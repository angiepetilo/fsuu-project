import React from "react";

export function StepHeader({ stepNum, title, subtitle, totalSteps = 4 }) {
  return (
    <div className="px-6 py-4 md:px-8 md:py-5 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black tracking-widest uppercase text-blue-600 bg-blue-100/80 px-2.5 py-0.5 rounded-full border border-blue-200/50">
            Step {stepNum} of {totalSteps}
          </span>
        </div>
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default StepHeader;
