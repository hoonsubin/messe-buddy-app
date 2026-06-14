import { useEffect, useRef, useState } from "react";
import type { Milestone } from "../../types/index.ts";
import type { MilestoneProgress } from "../../types/index.ts";
import MilestoneNode from "../shared/MilestoneNode.tsx";
import YouAreHereMarker from "./YouAreHereMarker.tsx";

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const ZOOM_STEP = 1.3;
const DEFAULT_SCALE = 1.5;

interface MapTransform {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

interface MilestoneMapViewerProps {
  readonly milestones: ReadonlyArray<Milestone>;
  readonly milestoneProgress: ReadonlyArray<MilestoneProgress>;
  readonly bgImageUrl: string;
  readonly playerXPercent?: number;
  readonly playerYPercent?: number;
  readonly onMilestoneClick: (id: string) => void;
}

const dist = (a: Touch, b: Touch): number =>
  Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

const clampScale = (s: number): number => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));

const MilestoneMapViewer = (props: MilestoneMapViewerProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);

  // Default pan: center the canvas, accounting for DEFAULT_SCALE.
  // At scale S with transform-origin 0 0, the canvas is S times larger.
  // To center the view on a node at (xPct, yPct) of the original canvas:
  //   panX = viewportW/2 - (canvasW * xPct/100) * S
  //   panY = viewportH/2 - (canvasH * yPct/100) * S
  // We compute this once after mount.
  const [transform, setTransform] = useState<MapTransform>({ x: 0, y: 0, scale: DEFAULT_SCALE });

  // Initialise pan so the first milestone (or map center) is visible.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const focal = props.milestones[0];
    const focalX = focal !== undefined ? focal.xPercent / 100 : 0.5;
    const focalY = focal !== undefined ? focal.yPercent / 100 : 0.5;
    setTransform({
      scale: DEFAULT_SCALE,
      x: width / 2 - width * focalX * DEFAULT_SCALE,
      y: height / 2 - height * focalY * DEFAULT_SCALE,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once — milestones are stable mock data

  // Mutable drag/pinch state — stored in a ref to avoid stale closures inside the effect.
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
  transformRef.current = transform;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      // Don't prevent default on node buttons — let clicks through.
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
        // Midpoint of pinch in viewport coords
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
        const newScale = clampScale(g.pinchStartScale * (newDist / g.pinchStartDist));
        // Zoom toward the pinch midpoint
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
  }, []); // safe — all mutable state lives in refs

  // ── Mouse drag (desktop) ─────────────────────────────────────────────────

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
      x: gesture.current.startPan.x + (e.clientX - gesture.current.startClient.x),
      y: gesture.current.startPan.y + (e.clientY - gesture.current.startClient.y),
    }));
  };

  const handleMouseUp = () => { gesture.current.dragging = false; };

  // ── Zoom buttons ─────────────────────────────────────────────────────────

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

  const progressById = new Map(props.milestoneProgress.map((mp) => [mp.milestoneId, mp]));

  return (
    <div
      ref={viewportRef}
      className="map-viewport"
      data-testid="milestone-map-viewer"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Transformable canvas */}
      <div
        className="map-canvas"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
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
          )
        }

        {/* Milestone nodes */}
        {props.milestones.map((ms) => {
          const mp = progressById.get(ms.id);
          return (
            <MilestoneNode
              key={ms.id}
              id={ms.id}
              label={ms.name}
              xPercent={ms.xPercent}
              yPercent={ms.yPercent}
              progressPercent={mp?.percentComplete ?? 0}
              status={mp?.status ?? "upcoming"}
              onClick={() => props.onMilestoneClick(ms.id)}
            />
          );
        })}

        {/* Player location marker */}
        {props.playerXPercent !== undefined && props.playerYPercent !== undefined && (
          <YouAreHereMarker
            xPercent={props.playerXPercent}
            yPercent={props.playerYPercent}
          />
        )}
      </div>

      {/* Zoom controls — outside the canvas so they don't scale */}
      <div className="map-zoom-controls" aria-label="Map zoom controls">
        <button
          type="button"
          className="map-zoom-btn"
          aria-label="Zoom in"
          onClick={() => zoomToward(ZOOM_STEP)}
        >
          🔍<sup>+</sup>
        </button>
        <button
          type="button"
          className="map-zoom-btn"
          aria-label="Zoom out"
          onClick={() => zoomToward(1 / ZOOM_STEP)}
        >
          🔍<sup>−</sup>
        </button>
      </div>
    </div>
  );
};

export default MilestoneMapViewer;
