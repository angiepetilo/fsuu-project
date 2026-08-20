import { useState } from "react";

export function Tooltip({ text, content, box, children, position = "top" }) {
  const [visible, setVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  };

  return (
    <div
      className="relative inline-flex items-center cursor-pointer"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (box || content || text) && (
        <div
          className={`absolute ${positionClasses[position]} z-50 p-3 bg-slate-900 text-white rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 pointer-events-none border border-slate-700/90 text-xs text-left min-w-[170px] max-w-[240px]`}
        >
          {box ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${box.badgeClass || 'bg-blue-600 text-white'}`}>
                  {box.status}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Time</span>
                <p className="font-mono text-[11px] font-bold text-slate-100 bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-700">
                  {box.time}
                </p>
              </div>
              {box.details && (
                <div className="pt-1 text-[10px] text-slate-300 font-medium">
                  {box.details}
                </div>
              )}
            </div>
          ) : content ? (
            content
          ) : (
            <span className="whitespace-nowrap px-1 py-0.5">{text}</span>
          )}
        </div>
      )}
    </div>
  );
}
