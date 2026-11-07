import React, { useState, useEffect, useRef, useId, forwardRef } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

/**
 * Material Design Outlined Floating Label Input with Animated Border Notch
 *
 * - Idle / Default: Label rests vertically centered inside input, acting as placeholder.
 * - Focused / Filled: Label smoothly transitions to top border (top-0 -translate-y-1/2) with
 *   a background cutout notch matching the surrounding surface.
 * - Supports text, email, password, number, search, date, time, tel, etc.
 * - Accessible with proper htmlFor, aria-invalid, and keyboard navigation.
 */
export const FloatingInput = forwardRef(function FloatingInput(
  {
    label,
    id: customId,
    name,
    type = "text",
    value,
    defaultValue,
    onChange,
    onFocus,
    onBlur,
    placeholder,
    required = false,
    optional = false,
    disabled = false,
    readOnly = false,
    error,
    helperText,
    leftIcon,
    rightIcon,
    rightAction,
    showPasswordToggle = false,
    bgClassName = "bg-white dark:bg-slate-900",
    containerClassName = "",
    inputClassName = "",
    className = "",
    autoComplete,
    min,
    max,
    step,
    maxLength,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const inputId = customId || generatedId;

  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef(null);

  // Combine external and internal refs
  const handleRef = (node) => {
    inputRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  const hasValue =
    currentValue !== undefined &&
    currentValue !== null &&
    String(currentValue).trim().length > 0;

  // For native date/time pickers, browser displays format tokens even when empty
  const isDateTime = type === "date" || type === "time" || type === "datetime-local";

  const isFloating = isFocused || hasValue || isDateTime;
  const isPassword = type === "password";
  const effectiveType = isPassword && showPassword ? "text" : type;
  const hasError = Boolean(error);

  const handleInputChange = (e) => {
    if (!isControlled) {
      setInternalValue(e.target.value);
    }
    if (onChange) onChange(e);
  };

  const handleInputFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleInputBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  // Solid field fill that matches the label notch (unless the caller sets its own background)
  const containerBg = disabled || /(^|\s)bg-/.test(containerClassName) ? "" : bgClassName;

  return (
    <div className={`relative flex flex-col w-full ${className}`}>
      {/* Outlined Border Container */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`floating-field relative flex items-center w-full rounded-xl border transition-all duration-200 cursor-text ${containerBg} ${
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

        {/* Input Element */}
        <input
          ref={handleRef}
          id={inputId}
          name={name}
          type={effectiveType}
          value={isControlled ? value ?? "" : undefined}
          defaultValue={!isControlled ? defaultValue : undefined}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          autoComplete={autoComplete}
          min={min}
          max={max}
          step={step}
          maxLength={maxLength}
          // The floating label is the hint; no "e.g. ..." sample text appears on tap
          placeholder=""
          data-hint={placeholder || undefined}
          aria-invalid={hasError}
          className={`w-full bg-transparent border-0 outline-none text-slate-900 dark:text-white text-sm font-medium h-12 transition-all ${
            leftIcon ? "pl-10" : "pl-3.5"
          } ${
            rightIcon || rightAction || (isPassword && showPasswordToggle)
              ? "pr-11"
              : "pr-3.5"
          } ${disabled ? "cursor-not-allowed text-slate-500" : ""} ${inputClassName}`}
          {...rest}
        />

        {/* Floating Label with Animated Border Notch */}
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

        {/* Right Icon / Password Toggle / Custom Action */}
        {rightAction ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            {rightAction}
          </div>
        ) : isPassword && (showPasswordToggle || !rightIcon) ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              setShowPassword((prev) => !prev);
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition-colors"
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : rightIcon ? (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {rightIcon}
          </div>
        ) : null}
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

export default FloatingInput;

