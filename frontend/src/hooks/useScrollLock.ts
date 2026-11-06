import { useEffect } from "react";

/** Locks background scroll while `active` is true — for modals/overlays/
 * drawers. Without this, background content scrolls underneath the overlay
 * on touch devices, defeating the "it's a modal" affordance. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (active) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [active]);
}
