import React, { useState, useRef, useId, forwardRef } from "react";
import { ChevronDown, AlertCircle } from "lucide-react";

/**
 * Material Design Outlined Floating Label Select with Animated Border Notch
 */
export const FloatingSelect = forwardRef(function FloatingSelect(
  {
    label,
    id: customId,
    name,
    value,
    defaultValue,
    onChange,
    onFocus,
    onBlur,
    options,
    children,
    placeholder = "Select an option...",
    required = false,
    optional = false,
    disabled = false,
    error,
    helperText,
    leftIcon,
    bgClassName = "bg-white dark:bg-slate-900",
    containerClassName = "",
    selectClassName = "",
    className = "",
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const selectId = customId || generatedId;

  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const selectRef = useRef(null);

  const handleRef = (node) => {
    selectRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  const hasValue =
    currentValue !== undefined &&
    currentValue !== null &&
    String(currentValue).trim().length > 0;

  const isFloating = isFocused || hasValue;
  const hasError = Boolean(error);

  const handleChange = (e) => {
    if (!isControlled) {
      setInternalValue(e.target.value);
    }
    if (onChange) onChange(e);
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const containerBg = disabled || /(^|\s)bg-/.test(containerClassName) ? "" : bgClassName;

  return (
    <div className={`relative flex flex-col w-full ${className}`}>
      {/* Outlined Border Container */}
      <div
        onClick={() => selectRef.current?.focus()}
        className={`floating-field relative flex items-center w-full rounded-xl border transition-all duration-200 cursor-pointer ${containerBg} ${
          hasError
            ? "border-red-500 ring-2 ring-red-500/15"
            : isFocused
            ? "border-blue-600 dark:border-blue-500 ring-2 ring-blue-600/15"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
        } ${
          disabled
            ? "opacity-60 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed"
            : ""
        } ${containerClassName}`}
      >
        {/* Left Icon */}
        {leftIcon && (
          <div
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${
              hasError
                ? "text-red-500"
                : isFocused
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {leftIcon}
          </div>
        )}

        {/* Native Select */}
        <select
          ref={handleRef}
          id={selectId}
          name={name}
          value={isControlled ? value ?? "" : undefined}
          defaultValue={!isControlled ? defaultValue : undefined}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          className={`w-full bg-transparent border-0 outline-none text-slate-900 dark:text-white text-sm font-medium h-12 pr-10 appearance-none cursor-pointer transition-all ${
            leftIcon ? "pl-10" : "pl-3.5"
          } ${disabled ? "cursor-not-allowed text-slate-500" : ""} ${selectClassName}`}
          {...rest}
        >
          {/* Empty, hidden first option: the floating label is the only hint, so the
              "Select ..." text never overlaps the label and isn't listed as a choice */}
          <option value="" disabled hidden aria-label={placeholder}></option>
          {options
            ? options.map((opt) => (
                <option
                  key={typeof opt === "object" ? opt.value : opt}
                  value={typeof opt === "object" ? opt.value : opt}
                  className="text-slate-900 dark:bg-slate-900 dark:text-white"
                >
                  {typeof opt === "object" ? opt.label : opt}
                </option>
              ))
            : children}
        </select>

        {/* Chevron Icon */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isFocused ? "rotate-180 text-blue-600 dark:text-blue-400" : ""}`}
          />
        </div>

        {/* Floating Label with Notch Cutout */}
        {label && (
          <label
            htmlFor={selectId}
            className={`absolute pointer-events-none select-none transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] origin-left ${
              isFloating
                ? `top-0 -translate-y-1/2 text-[11px] font-bold leading-none px-1.5 left-3 ${bgClassName} ${
                    hasError
                      ? "text-red-600 dark:text-red-400"
                      : isFocused
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-400"
                  }`
                : `top-1/2 -translate-y-1/2 text-sm font-normal bg-transparent px-0 ${
                    leftIcon ? "left-10" : "left-3.5"
                  } ${
                    hasError
                      ? "text-red-500"
                      : "text-slate-500 dark:text-slate-400"
                  }`
            }`}
          >
            <span>{label}</span>
            {required && <span className="text-red-500 ml-0.5">*</span>}
            {optional && (
              <span className="text-slate-400 font-normal ml-1 text-[11px]">
                (Optional)
              </span>
            )}
          </label>
        )}
      </div>

      {/* Error or Helper Text */}
      {hasError && typeof error === "string" ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1 animate-in fade-in duration-150">
          <AlertCircle size={13} className="shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default FloatingSelect;

