import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

const MIN_SCALE = 0.3;
const MAX_SCALE = 4;
const ZOOM_STEP = 1.3;
const DEFAULT_SCALE = 1.0;
/** Pixel movement below which a touch-end is treated as a tap. */
const TAP_THRESHOLD_PX = 5;

interface MapTransform {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

interface MapViewportProps {
  readonly bgImageUrl: string;
  readonly children: ReactNode;
  readonly testId?: string;
  /**
   * When true, touches that start on a milestone node still pan the map.
   * A tap (movement < TAP_THRESHOLD_PX) fires a synthetic click on the node.
   * Use for the player view where the user should always be able to pan.
   *
   * When false (default), touches on nodes are ignored by the viewport so the
   * GM editor's pointer-event handlers can take over.
   */
  readonly panFromNodes?: boolean;
  /**
   * Fraction of the background image covered by the node canvas (0–1).
   * Comes from Session.mapNodeScale — single source of truth for both views.
   * 1    = background fills the canvas exactly (no transform applied).
   * 0.33 = nodes occupy the center 1/9 of the background; background is 3×
   *        the canvas in each dimension (scale(1/0.33) ≈ scale(3.03)).
   * Applied as a CSS transform on the background element; does not affect
   * node positions or the pan/zoom camera.
   */
  readonly nodeScale: number;
}

export interface MapViewportHandle {
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly resetView: () => void;
}

const dist = (a: Touch, b: Touch): number =>
  Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

const clampScale = (s: number): number =>
  Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));

/**
 * Shared map viewport with pan/zoom/pinch gestures.
 * Renders children inside a transformable canvas with a background image.
 * Used by both MilestoneMapViewer (player) and MilestoneMapEditor (admin).
 *
 * Exposes zoomIn / zoomOut / resetView via forwardRef so parent toolbars can
 * control the camera.
 *
 * Sets --node-w on itself via ResizeObserver so descendant nodes can size
 * themselves to always fit 4 columns inside the visible viewport at scale 1.
 */
const MapViewport = forwardRef<MapViewportHandle, MapViewportProps>(
  (props, ref) => {
    const { panFromNodes = false, nodeScale } = props;
    const viewportRef = useRef<HTMLDivElement>(null);

    const [transform, setTransform] = useState<MapTransform>(() => ({
      x: 0,
      y: 0,
      scale: DEFAULT_SCALE,
    }));

    // ── --node-w: size nodes to fit 4 columns with 8px gaps, 12px side padding ─

    useEffect(() => {
      const el = viewportRef.current;
      if (!el) return;
      const observer = new ResizeObserver(([entry]) => {
        if (!entry) return;
        const w = entry.contentRect.width;
        // 4 cols · 3 inner gaps (8px) · 2 side pads (12px each) = 24+24 = 48px
        const nodeW = Math.max(44, Math.floor((w - 48) / 4));
        el.style.setProperty("--node-w", `${nodeW}px`);
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    // ── Gesture state ──────────────────────────────────────────────────────────

    const gesture = useRef({
      dragging: false,
      startClient: { x: 0, y: 0 },
      startPan: { x: 0, y: 0 },
      pinching: false,
      pinchStartDist: 0,
      pinchStartScale: DEFAULT_SCALE,
      transformAtGestureStart: { x: 0, y: 0, scale: DEFAULT_SCALE },
      /** Node element the current touch started on (panFromNodes mode only). */
      startedOnNode: null as HTMLElement | null,
      /** Whether the current touch has moved beyond the tap threshold. */
      hasMoved: false,
    });

    const transformRef = useRef(transform);
    useEffect(() => {
      transformRef.current = transform;
    }, [transform]);

    // ── Touch events ───────────────────────────────────────────────────────────

    useEffect(() => {
      const el = viewportRef.current;
      if (!el) return;

      const onTouchStart = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        const nodeEl = target.closest(".milestone-node") as HTMLElement | null;

        // In default (admin) mode: let node touches pass through to pointer handlers.
        if (!panFromNodes && nodeEl) return;

        e.preventDefault();

        const g = gesture.current;
        const cur = transformRef.current;

        if (e.touches.length === 1) {
          const t = e.touches[0]!;
          g.dragging = true;
          g.pinching = false;
          g.startClient = { x: t.clientX, y: t.clientY };
          g.startPan = { x: cur.x, y: cur.y };
          g.startedOnNode = panFromNodes ? nodeEl : null;
          g.hasMoved = false;
        } else if (e.touches.length === 2) {
          g.dragging = false;
          g.pinching = true;
          g.startedOnNode = null;
          g.hasMoved = false;
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
        const nodeEl = target.closest(".milestone-node");

        if (!panFromNodes && nodeEl) return;

        e.preventDefault();

        const g = gesture.current;
        const cur = transformRef.current;

        if (g.dragging && e.touches.length === 1) {
          const t = e.touches[0]!;
          const dx = t.clientX - g.startClient.x;
          const dy = t.clientY - g.startClient.y;
          if (Math.hypot(dx, dy) > TAP_THRESHOLD_PX) {
            g.hasMoved = true;
          }
          setTransform((prev) => ({
            ...prev,
            x: g.startPan.x + dx,
            y: g.startPan.y + dy,
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
        const nodeEl = target.closest(".milestone-node");

        if (!panFromNodes && nodeEl) return;

        const g = gesture.current;

        if (e.touches.length === 0) {
          // Tap on a node (panFromNodes=true): synthesise a click so the
          // node's onClick fires even though we called preventDefault.
          if (panFromNodes && g.startedOnNode && !g.hasMoved) {
            g.startedOnNode.click();
          }
          g.dragging = false;
          g.pinching = false;
          g.startedOnNode = null;
          g.hasMoved = false;
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
    }, [panFromNodes]);

    // ── Mouse drag (desktop) ───────────────────────────────────────────────────

    const handleMouseDown = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!panFromNodes && target.closest(".milestone-node")) return;
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

    // ── Zoom (exposed via ref) ─────────────────────────────────────────────────

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

    const resetView = () => {
      setTransform({ x: 0, y: 0, scale: DEFAULT_SCALE });
    };

    useImperativeHandle(ref, () => ({
      zoomIn: () => zoomToward(ZOOM_STEP),
      zoomOut: () => zoomToward(1 / ZOOM_STEP),
      resetView,
    }));

    return (
      <div
        ref={viewportRef}
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
          {props.bgImageUrl
            ? (
              <img
                className="map-canvas__bg"
                src={props.bgImageUrl}
                alt="Messe München floor plan"
                draggable={false}
                style={nodeScale !== 1
                  ? {
                    transform: `scale(${1 / nodeScale})`,
                    transformOrigin: "center center",
                  }
                  : undefined}
              />
            )
            : (
              <div
                className="map-canvas__bg"
                style={{
                  background: "hsl(var(--color-border) / 0.3)",
                  ...(nodeScale !== 1
                    ? {
                      transform: `scale(${1 / nodeScale})`,
                      transformOrigin: "center center",
                    }
                    : {}),
                }}
              />
            )}

          {props.children}
        </div>
      </div>
    );
  },
);

MapViewport.displayName = "MapViewport";

export default MapViewport;
