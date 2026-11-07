import React, { useState, useRef, useId, forwardRef } from "react";
import { AlertCircle } from "lucide-react";

/**
 * Material Design Outlined Floating Label Textarea with Animated Border Notch
 */
export const FloatingTextarea = forwardRef(function FloatingTextarea(
  {
    label,
    id: customId,
    name,
    value,
    defaultValue,
    onChange,
    onFocus,
    onBlur,
    placeholder,
    rows = 3,
    required = false,
    optional = false,
    disabled = false,
    readOnly = false,
    error,
    helperText,
    bgClassName = "bg-white dark:bg-slate-900",
    containerClassName = "",
    textareaClassName = "",
    className = "",
    maxLength,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const inputId = customId || generatedId;

  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const textareaRef = useRef(null);

  const handleRef = (node) => {
    textareaRef.current = node;
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
        onClick={() => textareaRef.current?.focus()}
        className={`floating-field relative flex w-full rounded-xl border transition-all duration-200 cursor-text ${containerBg} ${
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
        <textarea
          ref={handleRef}
          id={inputId}
          name={name}
          rows={rows}
          value={isControlled ? value ?? "" : undefined}
          defaultValue={!isControlled ? defaultValue : undefined}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          maxLength={maxLength}
          // The floating label is the hint; no sample text appears on tap
          placeholder=""
          data-hint={placeholder || undefined}
          aria-invalid={hasError}
          className={`w-full bg-transparent border-0 outline-none text-slate-900 dark:text-white text-sm font-medium p-3.5 pt-3.5 transition-all resize-y ${
            disabled ? "cursor-not-allowed text-slate-500" : ""
          } ${textareaClassName}`}
          {...rest}
        />

        {/* Floating Label with Notch Cutout */}
        {label && (
          <label
            htmlFor={inputId}
            className={`absolute pointer-events-none select-none transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] origin-left ${
              isFloating
                ? `top-0 -translate-y-1/2 text-[11px] font-bold leading-none px-1.5 left-3 ${bgClassName} ${
                    hasError
                      ? "text-red-600 dark:text-red-400"
                      : isFocused
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-400"
                  }`
                : `top-3.5 text-sm font-normal bg-transparent px-0 left-3.5 ${
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

export default FloatingTextarea;

