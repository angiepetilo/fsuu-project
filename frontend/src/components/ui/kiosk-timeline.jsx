import React from "react";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function KioskTimeline({ steps, activeStep, onStepClick, completedSteps = [] }) {
  return (
    <div className="w-full mb-10">
      <div className="relative flex items-center justify-between max-w-2xl mx-auto px-4">
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isActive = activeStep === stepNum;
          const isCompleted = completedSteps.includes(stepNum) || stepNum < activeStep;
          const canClick = isCompleted || stepNum === activeStep || completedSteps.includes(stepNum - 1);
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={step.title || idx}>
              <div
                onClick={() => canClick && onStepClick && onStepClick(stepNum)}
                className={cn(
                  "relative z-10 flex flex-col items-center group transition-all",
                  canClick ? "cursor-pointer" : "cursor-not-allowed opacity-70"
                )}
              >
                {/* Number Circle Badge */}
                <div
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center text-lg font-black transition-all duration-300 border-2 shadow-xs",
                    isCompleted || isActive
                      ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25"
                      : "bg-white border-slate-300 text-slate-800 group-hover:border-slate-400"
                  )}
                >
                  {isCompleted && !isActive ? <Check size={20} className="stroke-[3]" /> : stepNum}
                </div>

                {/* Step Label below node */}
                <div className="mt-2.5 text-center">
                  <p
                    className={cn(
                      "text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-colors max-w-[100px] sm:max-w-[130px] leading-tight",
                      isActive ? "text-slate-900" : isCompleted ? "text-slate-800" : "text-slate-400"
                    )}
                  >
                    {step.title}
                  </p>
                </div>
              </div>

              {/* Connecting Arrow Line Track */}
              {!isLast && (
                <div className="flex-1 flex items-center justify-center mx-2 sm:mx-4 -mt-6">
                  <div
                    className={cn(
                      "h-[2px] flex-1 transition-all duration-500 rounded-full",
                      isCompleted ? "bg-blue-600" : "bg-slate-200"
                    )}
                  />
                  <ArrowRight
                    size={14}
                    className={cn(
                      "shrink-0 -ml-1 transition-colors",
                      isCompleted ? "text-blue-600" : "text-slate-300"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default KioskTimeline;

