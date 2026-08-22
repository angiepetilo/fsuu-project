"use client"

import { Toaster as Sonner } from "sonner";

/**
 * Toaster — configured for plain custom toasts via notify.jsx.
 * - closeButton: false  → no sonner-native X button
 * - hotkey: []          → disables ESC dismiss
 * - unstyled: true      → PlainToast controls all styling
 */
const Toaster = ({ ...props }) => (
  <Sonner
    position="top-center"
    closeButton={false}
    hotkey={[]}
    expand={false}
    richColors={false}
    toastOptions={{ unstyled: true, classNames: { toast: "" } }}
    {...props}
  />
);

export { Toaster };
