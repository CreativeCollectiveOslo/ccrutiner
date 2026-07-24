import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 70;
const MAX_PULL = 120;

export function PullToRefresh() {
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      // Only start when the page is scrolled to the top
      if ((window.scrollY || document.documentElement.scrollTop) > 0) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
      pulling.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setDistance(0);
        pulling.current = false;
        return;
      }
      // Apply resistance
      const pulled = Math.min(MAX_PULL, dy * 0.5);
      setDistance(pulled);
      if (pulled > 8) {
        pulling.current = true;
        if (e.cancelable) e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (startY.current === null) return;
      const shouldRefresh = distance >= THRESHOLD;
      startY.current = null;
      if (shouldRefresh) {
        setRefreshing(true);
        setDistance(THRESHOLD);
        setTimeout(() => window.location.reload(), 250);
      } else {
        setDistance(0);
      }
      pulling.current = false;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [distance, refreshing]);

  const progress = Math.min(1, distance / THRESHOLD);
  const opacity = progress;
  const rotate = progress * 270;

  return (
    <div
      aria-hidden={distance === 0 && !refreshing}
      className="pointer-events-none fixed left-1/2 z-[100] flex -translate-x-1/2 items-center justify-center"
      style={{
        top: `calc(env(safe-area-inset-top, 0px) + 8px)`,
        transform: `translate(-50%, ${distance - 40}px)`,
        opacity,
        transition: distance === 0 || refreshing ? "transform 200ms ease, opacity 200ms ease" : "none",
      }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-md border border-border">
        <RefreshCw
          className={`h-5 w-5 text-primary ${refreshing ? "animate-spin" : ""}`}
          style={{ transform: refreshing ? undefined : `rotate(${rotate}deg)` }}
        />
      </div>
    </div>
  );
}
