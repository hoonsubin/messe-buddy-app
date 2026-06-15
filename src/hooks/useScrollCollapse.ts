import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tracks scroll velocity on a container element and returns a `collapsed`
 * boolean for shrinking a header/panel on scroll.
 *
 * Rules:
 *   - Any downward scroll → collapse (regardless of speed)
 *   - Fast upward scroll (speed ≥ fastScrollThreshold px/ms) → expand
 *   - Slow/linear upward scroll → no change
 *   - scrollTop reaches 0 → always expand
 *
 * @param scrollRef - ref to the scrollable container element
 * @param fastScrollThreshold - minimum px/ms for "fast" upward scroll (default 1.0)
 */
export const useScrollCollapse = (
  scrollRef: React.RefObject<HTMLElement | null>,
  fastScrollThreshold = 1.0,
): boolean => {
  const [collapsed, setCollapsed] = useState(false);

  const lastTopRef = useRef(0);
  const lastTimeRef = useRef(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const now = performance.now();
    const top = el.scrollTop;
    const dt = now - lastTimeRef.current;
    const dy = top - lastTopRef.current;

    lastTopRef.current = top;
    lastTimeRef.current = now;

    // At the very top — always expand
    if (top <= 0) {
      setCollapsed(false);
      return;
    }

    if (dy > 0) {
      // Downward scroll — collapse unconditionally
      setCollapsed(true);
    } else if (dy < 0 && dt > 0) {
      // Upward scroll — expand only if fast enough
      const speed = Math.abs(dy / dt); // px/ms
      if (speed >= fastScrollThreshold) {
        setCollapsed(false);
      }
    }
  }, [scrollRef, fastScrollThreshold]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [scrollRef, handleScroll]);

  return collapsed;
};
