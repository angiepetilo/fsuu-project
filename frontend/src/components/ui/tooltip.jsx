import { useState } from "react";

export function Tooltip({ text, children, position = "top" }) {
  const [visible, setVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  };

  return (
    <div
      className="relative inline-flex items-center cursor-help"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && text && (
        <div
          className={`absolute ${positionClasses[position]} z-50 whitespace-nowrap px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-150 pointer-events-none border border-slate-700`}
        >
          {text}
        </div>
      )}
    </div>
  );
}
