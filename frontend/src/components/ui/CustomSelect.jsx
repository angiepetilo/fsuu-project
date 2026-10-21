import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, Search, Plus } from "lucide-react";

/**
 * CustomSelect — Shared Form Dropdown Component
 * Modern, accessible replacement for native OS <select>.
 * Features:
 * - Full Dark Mode support
 * - Sleek .scrollbar-hover scrolling
 * - Sticky action button (e.g., "+ Add New Category", "+ Add New Brand")
 * - Smart search filter for lists > 8 items
 * - Keyboard (Esc) and outside-click closing
 * - Checkmark indicator for selected items
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select option...",
  disabled = false,
  required = false,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  searchable = undefined, // defaults to auto (true if > 8 items)
  actionButton = null,    // { label: string, onClick: () => void, icon?: LucideIcon }
  icon: Icon = null,
  id,
  name,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options into { value, label, description } format, filtering out legacy sentinel values
  const normalizedOptions = useMemo(() => {
    return (options || [])
      .map((opt) => {
        if (opt === null || opt === undefined) return null;
        if (typeof opt === "string" || typeof opt === "number") {
          const str = String(opt);
          if (str === "__quick_add_cat__" || str === "__quick_add_brand__") return null;
          return { value: str, label: str };
        }
        const val = opt.value !== undefined ? opt.value : (opt.id !== undefined ? opt.id : (opt.eq_name || opt.name || opt.brand || ""));
        const lbl = opt.label !== undefined ? opt.label : (opt.name || opt.eq_name || opt.brand || String(val));
        const valStr = String(val);
        if (valStr === "__quick_add_cat__" || valStr === "__quick_add_brand__") return null;
        return {
          ...opt,
          value: valStr,
          label: String(lbl),
          description: opt.description || opt.location || null,
        };
      })
      .filter(Boolean);
  }, [options]);

  // Selected option lookup
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === "") return null;
    const searchVal = String(value).trim().toLowerCase();
    return normalizedOptions.find(
      (opt) => String(opt.value).trim().toLowerCase() === searchVal || String(opt.label).trim().toLowerCase() === searchVal
    );
  }, [normalizedOptions, value]);

  // Auto-enable search if more than 8 items, unless explicitly passed
  const isSearchable = searchable !== undefined ? searchable : normalizedOptions.length > 8;

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!isSearchable || !searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q))
    );
  }, [normalizedOptions, isSearchable, searchQuery]);

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
      // Auto-focus search input if searchable
      if (isSearchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      setSearchQuery("");
    }
  }, [open, isSearchable]);

  const handleSelect = (val) => {
    onChange?.(val);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full text-left ${className}`}>
      {/* Hidden input for HTML form submission validation */}
      {name && <input type="hidden" name={name} value={value || ""} required={required} />}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full min-h-[40px] h-10 px-3 py-2 bg-white dark:bg-slate-800 border ${
          open
            ? "border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/15"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
        } rounded-lg text-xs font-semibold text-left flex items-center justify-between gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          {Icon && <Icon size={14} className="text-slate-400 shrink-0" />}
          {selectedOption ? (
            <span className="truncate text-slate-900 dark:text-white font-semibold">
              {selectedOption.label}
            </span>
          ) : value ? (
            <span className="truncate text-slate-900 dark:text-white font-semibold">
              {String(value)}
            </span>
          ) : (
            <span className="truncate text-slate-400 dark:text-slate-500 font-normal">
              {placeholder}
            </span>
          )}
        </div>

        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
          }`}
        />
      </button>

      {/* Floating Dropdown Menu Panel */}
      {open && (
        <div
          className={`absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col ${menuClassName}`}
        >
          {/* Search Box if list is long or search is enabled */}
          {isSearchable && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90">
              <div className="relative flex items-center">
                <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-7 pr-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Scrollable Options List */}
          <div className="max-h-[200px] overflow-y-auto scrollbar-hover p-1 divide-y divide-slate-100/60 dark:divide-slate-800/40">
            {filteredOptions.length === 0 ? (
              <div className="py-4 px-3 text-center text-xs text-slate-400 font-medium">
                No options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected =
                  selectedOption &&
                  String(selectedOption.value).toLowerCase() === String(opt.value).toLowerCase();

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="min-w-0 flex-1 truncate">
                      <span className="block truncate">{opt.label}</span>
                      {opt.description && (
                        <span className="block text-[10.5px] font-normal text-slate-400 truncate mt-0.5">
                          {opt.description}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Dedicated Bottom Action Button (e.g. + Add New Category) */}
          {actionButton && (
            <div className="p-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  actionButton.onClick?.();
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {actionButton.icon ? <actionButton.icon size={13} /> : <Plus size={13} />}
                <span>{actionButton.label}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
