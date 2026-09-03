import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

// ─── Portal-based floating action popover (prevents table overflow clipping) ───
export default function ActionPopover({ anchorEl, isOpen, onClose, children }) {
  const [pos, setPos] = useState({ top: 0, left: 0, openAbove: false });

  useEffect(() => {
    if (isOpen && anchorEl) {
      const r = anchorEl.getBoundingClientRect();
      const menuH = 130;
      const menuW = 160;
      const spaceBelow = window.innerHeight - r.bottom;
      const openAbove = spaceBelow < menuH && r.top > menuH;
      setPos({
        top: openAbove ? r.top - menuH - 4 : r.bottom + 4,
        left: Math.max(8, r.right - menuW),
        openAbove,
      });
    }
  }, [isOpen, anchorEl]);

  if (!isOpen || !anchorEl) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9998]"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
        className="w-40 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body
  );
}
