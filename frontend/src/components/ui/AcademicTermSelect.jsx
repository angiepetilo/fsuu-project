import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * AcademicTermSelect — Custom select component with height constraint & scrollbar.
 * Prevents OS window manager dropdown expansion and adheres to max-h-60 overflow-y-auto overscroll-contain.
 */
export default function AcademicTermSelect({ terms = [], selectedId, onSelect, className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedTerm = (terms || []).find((t) => String(t.id) === String(selectedId));

  return (
    <div className={`relative inline-block text-left ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer min-w-[200px] transition-colors"
      >
        <span className="truncate">
          {selectedTerm ? `${selectedTerm.name} ${selectedTerm.is_active ? "(Active)" : "(Archived)"}` : "All Academic Terms (TiDB Archive)"}
        </span>
        <ChevronDown size={14} className={`transition-transform text-slate-400 shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 sm:left-0 mt-1.5 w-64 max-h-60 overflow-y-auto overscroll-contain bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1 divide-y divide-slate-100 dark:divide-slate-800/50">
          <button
            type="button"
            onClick={() => { onSelect(""); setOpen(false); }}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer transition-colors ${!selectedId ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold" : "text-slate-700 dark:text-slate-300"}`}
          >
            <span>All Academic Terms (TiDB Archive)</span>
            {!selectedId && <Check size={13} className="text-blue-600 dark:text-blue-400" />}
          </button>
          {terms.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { onSelect(t.id); setOpen(false); }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer transition-colors ${String(selectedId) === String(t.id) ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold" : "text-slate-700 dark:text-slate-300"}`}
            >
              <span className="truncate">{t.name} <span className="text-[10px] text-slate-400">({t.is_active ? "Active" : "Archived"})</span></span>
              {String(selectedId) === String(t.id) && <Check size={13} className="text-blue-600 dark:text-blue-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
