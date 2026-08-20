import React from "react";

/**
 * PageLoader / SkeletonLoader — Sleek Skeleton Loading state for pages.
 * Replaces blocking full-page spinners with modern pulsing skeleton blocks.
 */
export function PageLoader({ message }) {
  return (
    <div className="space-y-6 animate-pulse select-none w-full">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 rounded-xl" />
          <div className="h-3.5 w-44 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-9 w-28 bg-slate-200 rounded-xl" />
      </div>

      {/* Metric Cards Skeleton Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200/80 space-y-3 shadow-xs">
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 bg-slate-200 rounded-md" />
              <div className="w-7 h-7 rounded-xl bg-slate-100" />
            </div>
            <div className="h-8 w-16 bg-slate-200 rounded-lg" />
            <div className="h-3 w-28 bg-slate-100 rounded-md" />
          </div>
        ))}
      </div>

      {/* Content Table / Main Card Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="space-y-1.5">
            <div className="h-5 w-48 bg-slate-200 rounded-lg" />
            <div className="h-3 w-72 bg-slate-100 rounded-md" />
          </div>
          <div className="h-8 w-24 bg-slate-100 rounded-xl" />
        </div>

        {/* Rows skeleton */}
        <div className="space-y-3 pt-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 shrink-0" />
                <div className="space-y-1">
                  <div className="h-3.5 w-36 bg-slate-200 rounded-md" />
                  <div className="h-2.5 w-24 bg-slate-100 rounded-md" />
                </div>
              </div>
              <div className="h-6 w-20 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PageLoader;
