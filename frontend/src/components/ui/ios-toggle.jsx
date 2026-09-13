import React from "react";

/**
 * IosToggle — Authentic Apple iOS-style toggle switch component.
 * Modeled after native iOS Settings switches with exact pixel ratios,
 * vibrant iOS green (#34C759), neutral off-state, and hardware-accelerated transitions.
 * Protected against mobile button-resets and global touch-target min-height rules.
 */
export function IosToggle({
  checked,
  enabled,
  onChange,
  disabled = false,
  title = "",
  size = "md", // "sm" | "md"
  className = "",
}) {
  const isChecked = Boolean(checked !== undefined ? checked : enabled);
  const isSm = size === "sm";

  // Strict pixel measurements:
  // md: 46px wide x 26px high, thumb 22px, padding 2px => 20px travel
  // sm: 34px wide x 20px high, thumb 16px, padding 2px => 14px travel
  const width = isSm ? 34 : 46;
  const height = isSm ? 20 : 26;
  const thumb = isSm ? 16 : 22;
  const travel = width - thumb - 4;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      disabled={disabled}
      title={title || (isChecked ? "Enabled (click to disable)" : "Disabled (click to enable)")}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && onChange) onChange(!isChecked);
      }}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
        minHeight: `${height}px`,
        maxHeight: `${height}px`,
        padding: "2px",
        boxSizing: "border-box",
        borderRadius: `${height}px`,
        WebkitTapHighlightColor: "transparent",
        flexShrink: 0,
      }}
      className={`btn-inline ios-toggle-btn relative inline-flex shrink-0 items-center justify-start select-none cursor-pointer border-0 outline-none transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
        isChecked
          ? "bg-[#34C759] hover:bg-[#30B852]"
          : "bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        style={{
          width: `${thumb}px`,
          height: `${thumb}px`,
          minWidth: `${thumb}px`,
          maxWidth: `${thumb}px`,
          minHeight: `${thumb}px`,
          maxHeight: `${thumb}px`,
          boxSizing: "border-box",
          borderRadius: "50%",
          transform: isChecked ? `translateX(${travel}px)` : "translateX(0px)",
          transition: "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.28), 0 0 1px rgba(0, 0, 0, 0.15)",
        }}
        className="pointer-events-none block bg-white shrink-0"
      />
    </button>
  );
}

export default IosToggle;
