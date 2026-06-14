import { useEffect, useRef, useState } from "react";
import { MdZoomIn, MdZoomOut } from "react-icons/md";
import type { ReactNode } from "react";

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const ZOOM_STEP = 1.3;
const DEFAULT_SCALE = 1.5;

interface MapTransform {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

interface MapViewportProps {
  readonly bgImageUrl: string;
  readonly children: ReactNode;
  readonly overlayControls?: ReactNode;
  readonly testId?: string;
}

const dist = (a: Touch, b: Touch): number =>
  Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

const clampScale = (s: number): number =>
  Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));

/**
 * Shared map viewport with pan/zoom/pinch gestures.
 * Renders children inside a transformable canvas with a background image.
 * Used by both MilestoneMapViewer (player) and MilestoneMapEditor (admin).
 */
const MapViewport = (props: MapViewportProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);

  // Derive initial centered transform from the ref element once mounted.
  const getCenteredTransform = (el: HTMLDivElement | null): MapTransform => {
    if (!el) return { x: 0, y: 0, scale: DEFAULT_SCALE };
    const { width, height } = el.getBoundingClientRect();
    return {
      scale: DEFAULT_SCALE,
      x: width / 2 - (width * DEFAULT_SCALE) / 2,
      y: height / 2 - (height * DEFAULT_SCALE) / 2,
    };
  };

  const [transform, setTransform] = useState<MapTransform>(() => {
    // During SSR / initial render the ref is null — fall back to origin.
    // The correct centered transform is applied via the callback ref below
    // when the viewport mounts, before the first paint.
    return { x: 0, y: 0, scale: DEFAULT_SCALE };
  });

  // Callback ref: fires synchronously during the commit phase, before paint.
  // This eliminates the double-render from origin → centered that a useEffect
  // would cause.
  const viewportCallbackRef = (el: HTMLDivElement | null) => {
    viewportRef.current = el;
    if (el) {
      setTransform(getCenteredTransform(el));
    }
  };

  // Mutable drag/pinch state — stored in a ref to avoid stale closures.
  const gesture = useRef({
    dragging: false,
    startClient: { x: 0, y: 0 },
    startPan: { x: 0, y: 0 },
    pinching: false,
    pinchStartDist: 0,
    pinchStartScale: DEFAULT_SCALE,
    transformAtGestureStart: { x: 0, y: 0, scale: DEFAULT_SCALE },
  });

  // Keep a ref in sync with state so the effect's event handlers can read it.
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".milestone-node")) return;
      e.preventDefault();

      const g = gesture.current;
      const cur = transformRef.current;

      if (e.touches.length === 1) {
        const t = e.touches[0]!;
        g.dragging = true;
        g.pinching = false;
        g.startClient = { x: t.clientX, y: t.clientY };
        g.startPan = { x: cur.x, y: cur.y };
      } else if (e.touches.length === 2) {
        g.dragging = false;
        g.pinching = true;
        g.pinchStartDist = dist(e.touches[0]!, e.touches[1]!);
        g.pinchStartScale = cur.scale;
        g.transformAtGestureStart = { ...cur };
        const mx = (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2;
        const my = (e.touches[0]!.clientY + e.touches[1]!.clientY) / 2;
        const rect = el.getBoundingClientRect();
        g.startClient = { x: mx - rect.left, y: my - rect.top };
        g.startPan = { x: cur.x, y: cur.y };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".milestone-node")) return;
      e.preventDefault();

      const g = gesture.current;
      const cur = transformRef.current;

      if (g.dragging && e.touches.length === 1) {
        const t = e.touches[0]!;
        setTransform((prev) => ({
          ...prev,
          x: g.startPan.x + (t.clientX - g.startClient.x),
          y: g.startPan.y + (t.clientY - g.startClient.y),
        }));
      } else if (g.pinching && e.touches.length === 2) {
        const newDist = dist(e.touches[0]!, e.touches[1]!);
        const newScale = clampScale(
          g.pinchStartScale * (newDist / g.pinchStartDist),
        );
        const scaleRatio = newScale / cur.scale;
        const px = g.startClient.x;
        const py = g.startClient.y;
        setTransform((prev) => ({
          scale: newScale,
          x: px - (px - prev.x) * scaleRatio,
          y: py - (py - prev.y) * scaleRatio,
        }));
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".milestone-node")) return;
      if (e.touches.length === 0) {
        gesture.current.dragging = false;
        gesture.current.pinching = false;
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // ── Mouse drag (desktop) ───────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".milestone-node")) return;
    gesture.current.dragging = true;
    gesture.current.startClient = { x: e.clientX, y: e.clientY };
    gesture.current.startPan = { x: transform.x, y: transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!gesture.current.dragging) return;
    setTransform((prev) => ({
      ...prev,
      x: gesture.current.startPan.x +
        (e.clientX - gesture.current.startClient.x),
      y: gesture.current.startPan.y +
        (e.clientY - gesture.current.startClient.y),
    }));
  };

  const handleMouseUp = () => {
    gesture.current.dragging = false;
  };

  // ── Zoom buttons ───────────────────────────────────────────────────────

  const zoomToward = (factor: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const cx = width / 2;
    const cy = height / 2;
    setTransform((prev) => {
      const newScale = clampScale(prev.scale * factor);
      const ratio = newScale / prev.scale;
      return {
        scale: newScale,
        x: cx - (cx - prev.x) * ratio,
        y: cy - (cy - prev.y) * ratio,
      };
    });
  };

  return (
    <div
      ref={viewportCallbackRef}
      className="map-viewport"
      data-testid={props.testId ?? "map-viewport"}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Transformable canvas */}
      <div
        className="map-canvas"
        style={{
          transform:
            `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        {/* Background floor plan */}
        {props.bgImageUrl
          ? (
            <img
              className="map-canvas__bg"
              src={props.bgImageUrl}
              alt="Messe München floor plan"
              draggable={false}
            />
          )
          : (
            <div
              className="map-canvas__bg"
              style={{ background: "hsl(var(--color-border) / 0.3)" }}
            />
          )}

        {/* Children rendered inside the transformable canvas */}
        {props.children}
      </div>

      {/* Zoom controls + overlay controls — outside the canvas so they don't scale */}
      <div className="map-zoom-controls" aria-label="Map zoom controls">
        {props.overlayControls}
        <button
          type="button"
          className="map-zoom-btn"
          aria-label="Zoom in"
          onClick={() => zoomToward(ZOOM_STEP)}
        >
          <MdZoomIn size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="map-zoom-btn"
          aria-label="Zoom out"
          onClick={() => zoomToward(1 / ZOOM_STEP)}
        >
          <MdZoomOut size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default MapViewport;
