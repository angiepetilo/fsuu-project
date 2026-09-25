import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Portal-based floating action popover.
 * Renders directly onto document.body so it floats over any table or modal container,
 * completely avoiding overflow clipping or unexpected scrollbars.
 */
export default function ActionPopover({
  anchorEl,
  isOpen,
  onClose,
  children,
  width = 160,
  minHeight = 110,
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, openAbove: false });
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !anchorEl) return;

    const updatePosition = () => {
      const r = anchorEl.getBoundingClientRect();
      const popoverEl = popoverRef.current;
      const actualHeight = popoverEl ? popoverEl.offsetHeight : minHeight;
      const actualWidth = popoverEl ? popoverEl.offsetWidth : width;

      const spaceBelow = window.innerHeight - r.bottom;
      const openAbove = spaceBelow < actualHeight && r.top > actualHeight;

      let top = openAbove ? r.top - actualHeight - 6 : r.bottom + 6;
      let left = r.right - actualWidth;

      // Keep within screen horizontally
      if (left < 10) left = 10;
      if (left + actualWidth > window.innerWidth - 10) {
        left = window.innerWidth - actualWidth - 10;
      }

      // Keep within screen vertically
      if (top < 10) top = 10;

      setPos({ top, left, openAbove });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, anchorEl, width, minHeight]);

  if (!isOpen || !anchorEl) return null;

  return createPortal(
    <>
      {/* Invisible backdrop to close on outside click */}
      <div
        className="fixed inset-0 z-[9998] bg-transparent"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Floating Popover Container */}
      <div
        ref={popoverRef}
        role="menu"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          zIndex: 9999,
        }}
        className="w-44 popover-content bg-white dark:bg-[#1E293B] border border-slate-200/90 dark:border-slate-700/80 rounded-2xl shadow-2xl p-1 text-xs animate-in fade-in zoom-in-95 backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body
  );
}
