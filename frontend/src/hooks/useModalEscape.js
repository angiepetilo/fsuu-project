import { useEffect } from "react";

/**
 * Escape closes the top-most open modal, app-wide.
 *
 * Works for every element tagged `.modal-overlay` by pressing that modal's own
 * header close (X) button, so each modal keeps its own close logic
 * (e.g. "Discard changes?" prompts). Modals that handle Escape themselves, or
 * must not close on Escape (session timeout), carry `data-own-escape`.
 */
export function useModalEscape() {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;

      const overlays = [...document.querySelectorAll(".modal-overlay")].filter((el) => el.offsetParent !== null || el.getClientRects().length > 0);
      if (overlays.length === 0) return;

      // Top-most = highest z-index, then latest in the page
      const top = overlays
        .map((el, index) => ({ el, index, z: Number.parseInt(getComputedStyle(el).zIndex, 10) || 0 }))
        .sort((a, b) => a.z - b.z || a.index - b.index)
        .pop().el;
      if (top.hasAttribute("data-own-escape")) return;

      const card = [...top.children].find((c) => !c.classList.contains("absolute")) || top;
      const cardBox = card.getBoundingClientRect();
      // The header close button: an X icon button near the card's top-right corner
      const closeButton = [...top.querySelectorAll("button")].find((btn) => {
        if (!btn.querySelector("svg.lucide-x")) return false;
        const box = btn.getBoundingClientRect();
        return box.top - cardBox.top < 96 && cardBox.right - box.right < 120;
      });
      if (closeButton) {
        event.preventDefault();
        closeButton.click();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

export default useModalEscape;
