/**
 * Universal Button Click Feedback Utility
 * 
 * Ensures buttons provide responsive tactile feedback without redundant spinners:
 * - If a button contains an existing non-loading SVG icon, rotates that single icon smoothly on click.
 * - NEVER injects duplicate, artificial pseudo-element spinners onto buttons.
 * - Immediately cancels and suppresses spin animations if the button enters a loading state (.animate-spin, data-loading, disabled).
 * - Ensures there is strictly at most ONE spinner visible per button at all times.
 */

let isInitialized = false;

export function initButtonSpinFeedback() {
  if (isInitialized || typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  isInitialized = true;

  const triggerSpin = (button) => {
    if (!button) return;

    // Check if disabled, loading, or suppressed
    if (
      button.disabled ||
      button.getAttribute("aria-disabled") === "true" ||
      button.hasAttribute("data-loading") ||
      button.classList.contains("pointer-events-none") ||
      button.classList.contains("no-spin") ||
      button.querySelector(".animate-spin")
    ) {
      return;
    }

    // Cancel existing timer if re-clicked rapidly
    if (button._spinTimeout) {
      clearTimeout(button._spinTimeout);
      button._spinTimeout = null;
    }

    // Only apply rotation if the button contains a non-loading SVG icon
    const iconSvg = button.querySelector("svg:not(.animate-spin):not(.no-spin)");
    if (!iconSvg) {
      // Text-only buttons should not have an artificial secondary spinner injected
      return;
    }

    // Temporarily remove class and force DOM reflow to restart CSS animation smoothly
    button.classList.remove("btn-clicked-spinning", "btn-spin-text");
    void button.offsetWidth; // Trigger browser reflow

    button.classList.add("btn-clicked-spinning");

    // Hold the spin animation for 500ms
    button._spinTimeout = setTimeout(() => {
      button.classList.remove("btn-clicked-spinning", "btn-spin-text");
      button._spinTimeout = null;
    }, 500);
  };

  // Click handler on document (capture phase for maximum responsiveness)
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target;
      if (!target) return;

      const button = target.closest("button, [role='button'], .btn, a.btn");
      if (button) {
        triggerSpin(button);
      }
    },
    true
  );
}
