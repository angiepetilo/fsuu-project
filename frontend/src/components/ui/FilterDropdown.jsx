import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * FilterDropdown — Institutional Filter Dropdown Component
 * Enforces a strict 5-item visible limit with smooth scrolling for items > 5.
 * Fully adapts to both Light (Default) and Dark themes.
 */
export default function FilterDropdown({
  value,
  onChange,
  options = [],
  label = "",
  icon: Icon = null,
  placeholder = "Select option...",
  className = "",
  buttonClassName = "",
  menuClassName = "",
  dropdownWidth = "",
  align = "left",
  disabled = false,
  title = "",
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options into { value, label, badge, icon } format
  const normalizedOptions = useMemo(() => {
    return (options || []).map((opt) => {
      if (typeof opt === "string" || typeof opt === "number") {
        return { value: String(opt), label: String(opt) };
      }
      const val = opt.value !== undefined ? opt.value : opt.id;
      const lbl = opt.label || opt.name || String(val);
      return { ...opt, value: String(val), label: lbl };
    });
  }, [options]);

  // Selected option lookup
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => String(opt.value) === String(value));
  }, [normalizedOptions, value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [open]);

  const handleSelect = (val) => {
    onChange?.(val);
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      title={title}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${buttonClassName}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {Icon && <Icon size={14} className="text-slate-400 shrink-0" />}
          {label && (
            <span className="text-[11px] text-slate-400 font-bold whitespace-nowrap uppercase tracking-wider">
              {label}
            </span>
          )}
          <span className="truncate text-slate-900 dark:text-white font-bold">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Floating Dropdown Menu (Enforces max 5 items visible: ~196px height) */}
      {open && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } mt-1.5 ${
            dropdownWidth || "min-w-[200px] max-w-[320px] w-max"
          } max-h-[196px] overflow-y-auto overscroll-contain scrollbar-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1 divide-y divide-slate-100/70 dark:divide-slate-800/50 animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
        >
          {normalizedOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 text-center font-medium">
              No options available
            </div>
          ) : (
            normalizedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              const ItemIcon = opt.icon;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {ItemIcon && (
                      <ItemIcon
                        size={13}
                        className={isSelected ? "text-blue-600 dark:text-blue-400 shrink-0" : "text-slate-400 shrink-0"}
                      />
                    )}
                    <span className="truncate">{opt.label}</span>
                    {opt.badge && (
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                        {opt.badge}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <Check
                      size={13}
                      className="text-blue-600 dark:text-blue-400 shrink-0 ml-1.5"
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
