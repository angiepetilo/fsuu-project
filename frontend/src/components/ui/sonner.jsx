"use client"

import { Toaster as Sonner } from "sonner";

/**
 * Toaster — plain, sleek, high-visibility container.
 * unstyled: true ensures no double-container or outer dark wrapper.
 */
const Toaster = ({ ...props }) => (
  <Sonner
    position="top-right"
    closeButton={false}
    hotkey={[]}
    expand={false}
    richColors={false}
    icons={{
      success: null,
      error: null,
      info: null,
      warning: null,
      loading: null,
    }}
    style={{
      zIndex: 999999,
    }}
    toastOptions={{
      unstyled: true,
      classNames: {
        toast: "!bg-transparent !p-0 !border-0 !shadow-none",
      },
    }}
    {...props}
  />
);

export { Toaster };
