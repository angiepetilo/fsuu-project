import * as React from "react";

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
      <div className="h-12 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded flex-1"></div>
        ))}
      </div>
      <div className="divide-y divide-slate-50">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="h-14 px-4 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-3.5 bg-slate-100 rounded flex-1"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          <div className="h-3 bg-slate-100 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}
