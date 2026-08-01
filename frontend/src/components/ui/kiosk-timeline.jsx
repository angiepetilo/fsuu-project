import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function KioskTimeline({ steps, activeStep, onStepClick, completedSteps = [] }) {
  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 mb-8 shadow-xs">
      <div className="relative flex items-start justify-between">
        
        {/* Background & Active Connecting Line Track - Centered at top-5 (20px) through circle midpoint */}
        <div className="absolute top-5 left-[20px] right-[20px] -translate-y-1/2 h-1.5 z-0">
          <div className="w-full h-full bg-slate-200/80 rounded-full relative overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out shadow-xs"
              style={{
                width: `${((activeStep - 1) / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Step Nodes */}
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isActive = activeStep === stepNum;
          const isCompleted = completedSteps.includes(stepNum) || stepNum < activeStep;
          const canClick = isCompleted || stepNum === activeStep || completedSteps.includes(stepNum - 1);

          return (
            <div
              key={step.title}
              onClick={() => canClick && onStepClick && onStepClick(stepNum)}
              className={cn(
                "relative z-10 flex flex-col items-center group",
                canClick ? "cursor-pointer" : "cursor-not-allowed opacity-60"
              )}
            >
              {/* Number Circle Badge */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-300 border-2",
                  isCompleted
                    ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                    : isActive
                      ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-600/25 scale-110 shadow-md shadow-blue-600/30"
                      : "bg-white border-slate-300 text-slate-400 group-hover:border-slate-400"
                )}
              >
                {isCompleted ? <Check size={18} className="stroke-[3]" /> : stepNum}
              </div>

              {/* Step Label below node */}
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    "text-xs font-extrabold tracking-tight transition-colors",
                    isActive ? "text-blue-600" : isCompleted ? "text-slate-900" : "text-slate-400"
                  )}
                >
                  {step.title}
                </p>
                {step.subtitle && (
                  <p className="text-[10px] text-slate-400 font-semibold hidden md:block max-w-[120px] truncate">
                    {step.subtitle}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default KioskTimeline;
