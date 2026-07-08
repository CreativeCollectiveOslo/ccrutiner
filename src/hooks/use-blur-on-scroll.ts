import { useEffect } from "react";

/**
 * Lukker tastaturet på mobil når brukeren scroller/drar utenfor det aktive input-feltet.
 * Speiler iOS-mønsteret der tastaturet lukkes ved scroll av bakgrunnen.
 */
export function useBlurOnScroll() {
  useEffect(() => {
    const isEditable = (el: Element | null): el is HTMLElement => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT") {
        const type = (el as HTMLInputElement).type;
        // Ikke blur på f.eks. color/range/checkbox – der er tastatur ikke i bildet uansett.
        return ["text", "search", "email", "tel", "url", "password", "number"].includes(type);
      }
      return tag === "TEXTAREA" || el.isContentEditable;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const active = document.activeElement;
      if (!isEditable(active)) return;
      const target = e.target as Node | null;
      if (target && active.contains(target)) return;
      active.blur();
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => window.removeEventListener("touchmove", handleTouchMove);
  }, []);
}
