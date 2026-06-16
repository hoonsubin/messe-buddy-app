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
 * @param scrollRef          - ref to the scrollable container element
 * @param resetKey           - any value; when it changes the hook resets to
 *                             expanded and scrolls the container back to top.
 *                             Pass the active tab id, route, or any discriminator
 *                             so the effect resets correctly on navigation.
 * @param fastScrollThreshold - minimum px/ms for "fast" upward scroll (default 1.0)
 *
 * Reuse pattern:
 *   const collapsed = useScrollCollapse(scrollRef, activeTab);
 *   // Pass `collapsed` via data-attribute or context to the collapsible panel.
 */
export const useScrollCollapse = (
  scrollRef: React.RefObject<HTMLElement | null>,
  resetKey: unknown = undefined,
  fastScrollThreshold = 1.0,
): boolean => {
  const [collapsed, setCollapsed] = useState(false);

  const lastTopRef = useRef(0);
  const lastTimeRef = useRef(0);

  // ── Reset on key change ─────────────────────────────────────────────────────
  // Whenever resetKey changes (e.g. active tab switches), snap the scroll
  // container back to the top and expand the collapsible panel so the new
  // content always starts from a clean state.
  useEffect(() => {
    const el = scrollRef.current;
    setCollapsed(false);
    lastTopRef.current = 0;
    lastTimeRef.current = 0;
    if (el) {
      el.scrollTop = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // ── Scroll handler ──────────────────────────────────────────────────────────
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

  // ── Attach / detach listener ────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [scrollRef, handleScroll]);

  return collapsed;
};
