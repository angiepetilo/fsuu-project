"use client"

import { Toaster as Sonner } from "sonner";

/**
 * Toaster — plain, sleek, high-visibility container.
 * unstyled: true ensures no double-container or outer dark wrapper.
 */
const Toaster = ({ ...props }) => (
  <Sonner
    position="top-right"
    offset="20px"
    duration={3500}
    closeButton={false}
    hotkey={[]}
    expand={false}
    richColors={false}
    pauseWhenPageIsHidden={false}
    icons={{
      success: null,
      error: null,
      info: null,
      warning: null,
      loading: null,
    }}
    style={{
      zIndex: 9999999,
      pointerEvents: "none",
    }}
    toastOptions={{
      duration: 3500,
      unstyled: true,
      classNames: {
        toast: "!bg-transparent !p-0 !border-0 !shadow-none pointer-events-auto select-none",
      },
    }}
    {...props}
  />
);

export { Toaster };
