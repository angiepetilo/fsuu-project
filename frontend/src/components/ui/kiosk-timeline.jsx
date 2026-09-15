import React from "react";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function KioskTimeline({
  steps = [],
  activeStep,
  currentStep,
  onStepClick,
  completedSteps = [],
}) {
  const current = activeStep ?? currentStep ?? 1;

  return (
    <div className="w-full mb-6 sm:mb-10 px-2 sm:px-4">
      <div className="relative flex items-center justify-between max-w-2xl mx-auto overflow-x-auto no-scrollbar py-2">
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isActive = current === stepNum;
          const isCompleted = completedSteps.includes(stepNum) || stepNum < current;
          const canClick = isCompleted || stepNum === current || completedSteps.includes(stepNum - 1);
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={step.title || idx}>
              <div
                onClick={() => canClick && onStepClick && onStepClick(stepNum)}
                className={cn(
                  "relative z-10 flex flex-col items-center group transition-all shrink-0 px-1 sm:px-2",
                  canClick ? "cursor-pointer" : "cursor-not-allowed opacity-75"
                )}
              >
                {/* Number Circle Badge */}
                <div
                  className={cn(
                    "w-8 h-8 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xs sm:text-base font-black transition-all duration-300 border-2 shadow-xs",
                    isCompleted || isActive
                      ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25 scale-105"
                      : "bg-white border-slate-300 text-slate-700 group-hover:border-slate-400"
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check size={16} className="sm:w-5 sm:h-5 stroke-[3]" />
                  ) : (
                    stepNum
                  )}
                </div>

                {/* Step Label below node */}
                <div className="mt-1.5 sm:mt-2.5 text-center">
                  <p
                    className={cn(
                      "text-[9px] sm:text-[11px] font-black uppercase tracking-tight sm:tracking-wider transition-colors max-w-[70px] sm:max-w-[130px] leading-tight break-words",
                      isActive
                        ? "text-blue-600 sm:text-slate-900 font-extrabold"
                        : isCompleted
                        ? "text-slate-800"
                        : "text-slate-400"
                    )}
                  >
                    {step.title}
                  </p>
                </div>
              </div>

              {/* Connecting Arrow Line Track */}
              {!isLast && (
                <div className="flex-1 flex items-center justify-center min-w-[14px] sm:min-w-[28px] mx-0.5 sm:mx-2 -mt-4 sm:-mt-6">
                  <div
                    className={cn(
                      "h-[2px] flex-1 transition-all duration-500 rounded-full",
                      isCompleted ? "bg-blue-600" : "bg-slate-200"
                    )}
                  />
                  <ArrowRight
                    size={12}
                    className={cn(
                      "shrink-0 -ml-0.5 sm:-ml-1 sm:w-3.5 sm:h-3.5 transition-colors",
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
