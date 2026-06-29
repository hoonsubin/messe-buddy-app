import { useMemo, useRef, useState } from "react";
import { MdAdd, MdRemove } from "react-icons/md";
import type { Milestone, MilestoneProgress } from "../../types/index.ts";
import mapBg from "../../assets/map-background.jpg";

/**
 * Player milestone map — the Messe München site plan (the map image) with the
 * six milestones placed as isometric buildings, evenly distributed across the
 * open white space in the centre and linked by a street grid. Each building
 * fills blue from the bottom up in proportion to the missions completed in that
 * milestone. Names show on hover; buildings pulse to read as clickable. The map
 * can be zoomed (+/− controls) and dragged to pan; an XP progress bar below it
 * shows total XP earned vs remaining. Tapping a building opens its missions.
 */

interface IsometricMilestoneMapProps {
  readonly milestones: ReadonlyArray<Milestone>;
  readonly milestoneProgress: ReadonlyArray<MilestoneProgress>;
  readonly onMilestoneClick: (id: string) => void;
}

// Background image native size → SVG viewBox, so overlay coords are image pixels.
const VBW = 2180;
const VBH = 1048;

// Isometric building geometry (in viewBox px).
const TW = 66;
const TH = 33;
const GW = 0.9;
const GD = 1.0;
const BLDG_H = 158;

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 1.4;
const DRAG_THRESHOLD = 5; // px before a press counts as a drag (not a click)

// Six anchors (fractions of the image): three columns × two rows.
const ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [0.42, 0.51],
  [0.52, 0.51],
  [0.62, 0.51],
  [0.42, 0.77],
  [0.52, 0.77],
  [0.62, 0.77],
];

interface Pt {
  readonly x: number;
  readonly y: number;
}

const ptsToStr = (pts: ReadonlyArray<Pt>): string =>
  pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

const anchorPt = (i: number): Pt => ({
  x: ANCHORS[i]![0] * VBW,
  y: ANCHORS[i]![1] * VBH,
});

interface Building {
  readonly id: string;
  readonly name: string;
  readonly frac: number;
  readonly baseY: number;
  readonly front: Pt;
  readonly leftBlue: ReadonlyArray<Pt> | null;
  readonly leftGrey: ReadonlyArray<Pt> | null;
  readonly rightBlue: ReadonlyArray<Pt> | null;
  readonly rightGrey: ReadonlyArray<Pt> | null;
  readonly top: ReadonlyArray<Pt>;
  readonly topFilled: boolean;
}

const buildAt = (
  id: string,
  name: string,
  pct: number,
  cx: number,
  cy: number,
): Building => {
  const frac = Math.max(0, Math.min(1, pct));
  const corner = (sx: number, sy: number): Pt => ({
    x: cx + sx * (GW / 2) * TW + sy * (GD / 2) * -TW,
    y: cy + sx * (GW / 2) * TH + sy * (GD / 2) * TH,
  });
  const p00 = corner(-1, -1);
  const p10 = corner(1, -1);
  const p11 = corner(1, 1);
  const p01 = corner(-1, 1);
  const lift = (p: Pt): Pt => ({ x: p.x, y: p.y - BLDG_H });
  const t00 = lift(p00);
  const t10 = lift(p10);
  const t11 = lift(p11);
  const t01 = lift(p01);
  const split = (base: Pt): Pt => ({ x: base.x, y: base.y - frac * BLDG_H });
  const sL0 = split(p01);
  const sL1 = split(p11);
  const sR0 = split(p10);
  const sR1 = split(p11);

  return {
    id,
    name,
    frac,
    baseY: cy,
    front: { x: p11.x, y: (p11.y + t11.y) / 2 },
    leftBlue: frac > 0 ? [p01, p11, sL1, sL0] : null,
    leftGrey: frac < 1 ? [sL0, sL1, t11, t01] : null,
    rightBlue: frac > 0 ? [p10, p11, sR1, sR0] : null,
    rightGrey: frac < 1 ? [sR0, sR1, t11, t10] : null,
    top: [t00, t10, t11, t01],
    topFilled: frac >= 0.999,
  };
};

interface View {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

const IsometricMilestoneMap = (props: IsometricMilestoneMapProps) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, sx: 0, sy: 0, ox: 0, oy: 0, moved: false });

  const progressById = useMemo(
    () => new Map(props.milestoneProgress.map((mp) => [mp.milestoneId, mp])),
    [props.milestoneProgress],
  );

  const ordered = useMemo(
    () => [...props.milestones].sort((m1, m2) => m1.order - m2.order),
    [props.milestones],
  );

  const buildings = useMemo<Building[]>(() => {
    const list = ordered.slice(0, ANCHORS.length).map((m, i) => {
      const a = anchorPt(i);
      const mp = progressById.get(m.id);
      return buildAt(m.id, m.name, mp?.percentComplete ?? 0, a.x, a.y);
    });
    return [...list].sort((a, b) => a.baseY - b.baseY);
  }, [ordered, progressById]);

  // XP totals for the progress bar.
  const { earnedXP, totalXP } = useMemo(() => {
    let e = 0;
    let t = 0;
    for (const mp of props.milestoneProgress) {
      e += mp.earnedXP;
      t += mp.xpThreshold;
    }
    return { earnedXP: e, totalXP: t };
  }, [props.milestoneProgress]);
  const xpPct = totalXP > 0 ? Math.round((earnedXP / totalXP) * 100) : 0;

  // Street grid linking the buildings (drawn under them so they stay visible).
  const streets = useMemo<Pt[][]>(() => [
    [anchorPt(0), anchorPt(1), anchorPt(2)],
    [anchorPt(3), anchorPt(4), anchorPt(5)],
    [anchorPt(0), anchorPt(3)],
    [anchorPt(1), anchorPt(4)],
    [anchorPt(2), anchorPt(5)],
  ], []);

  // ── Pan / zoom ──────────────────────────────────────────────────────────────
  const clampView = (v: View): View => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return v;
    const maxX = (rect.width * (v.scale - 1)) / 2;
    const maxY = (rect.height * (v.scale - 1)) / 2;
    return {
      scale: v.scale,
      x: Math.max(-maxX, Math.min(maxX, v.x)),
      y: Math.max(-maxY, Math.min(maxY, v.y)),
    };
  };

  const zoom = (factor: number) =>
    setView((v) =>
      clampView({
        ...v,
        scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * factor)),
      })
    );

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = {
      active: true,
      sx: e.clientX,
      sy: e.clientY,
      ox: view.x,
      oy: view.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      // Capture only once it's really a drag, so plain clicks still open a
      // building (a captured pointer would divert the click event).
      d.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (d.moved) setView((v) => clampView({ ...v, x: d.ox + dx, y: d.oy + dy }));
  };

  const endDrag = (e: React.PointerEvent) => {
    drag.current.active = false;
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };

  const handleBuildingClick = (id: string) => {
    if (drag.current.moved) return; // it was a pan, not a tap
    props.onMilestoneClick(id);
  };

  const toPct = (p: Pt) => ({
    left: `${(p.x / VBW) * 100}%`,
    top: `${(p.y / VBH) * 100}%`,
  });

  const poly = (pts: ReadonlyArray<Pt>, className: string) => (
    <polygon className={className} points={ptsToStr(pts)} />
  );

  const pannable = view.scale > 1;

  return (
    <div className="iso-map-widget">
      <div
        ref={containerRef}
        className={`iso-map ${pannable ? "iso-map--pannable" : ""}`}
        data-testid="iso-milestone-map"
        style={{
          aspectRatio: `${VBW} / ${VBH}`,
          touchAction: pannable ? "none" : "pan-y",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="iso-map__stage"
          style={{
            transform:
              `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          }}
        >
          <img className="iso-map__bg" src={mapBg} alt="Messe München site plan" />

          <svg
            className="iso-map__svg"
            viewBox={`0 0 ${VBW} ${VBH}`}
            preserveAspectRatio="xMidYMid meet"
            role="presentation"
          >
            <defs>
              <filter id="iso-shadow" x="-30%" y="-30%" width="160%" height="190%">
                <feDropShadow
                  dx="0"
                  dy="9"
                  stdDeviation="10"
                  floodColor="hsl(221 61% 14% / 0.3)"
                />
              </filter>
            </defs>

            {streets.map((seg, i) => (
              <polyline
                key={`st-${i}`}
                className="iso-street"
                points={ptsToStr(seg)}
              />
            ))}
            {streets.map((seg, i) => (
              <polyline
                key={`stl-${i}`}
                className="iso-street__line"
                points={ptsToStr(seg)}
              />
            ))}

            {buildings.map((b) => (
              <g
                key={b.id}
                className="iso-bldg"
                role="button"
                tabIndex={0}
                aria-label={`${b.name} — ${Math.round(b.frac * 100)}% complete`}
                onClick={() => handleBuildingClick(b.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    props.onMilestoneClick(b.id);
                  }
                }}
                onMouseEnter={() => setHovered(b.id)}
                onMouseLeave={() => setHovered((h) => (h === b.id ? null : h))}
                onFocus={() => setHovered(b.id)}
                onBlur={() => setHovered((h) => (h === b.id ? null : h))}
              >
                <g className="iso-bldg__solid" filter="url(#iso-shadow)">
                  {b.leftGrey && poly(b.leftGrey, "iso-face__left--grey")}
                  {b.leftBlue && poly(b.leftBlue, "iso-face__left--blue")}
                  {b.rightGrey && poly(b.rightGrey, "iso-face__right--grey")}
                  {b.rightBlue && poly(b.rightBlue, "iso-face__right--blue")}
                  {poly(
                    b.top,
                    b.topFilled ? "iso-face__top--blue" : "iso-face__top--grey",
                  )}
                </g>
              </g>
            ))}
          </svg>

          <div className="iso-map__overlay" aria-hidden="true">
            {buildings.map((b) => (
              <span
                key={`name-${b.id}`}
                className={`iso-name ${hovered === b.id ? "iso-name--show" : ""}`}
                style={toPct(b.front)}
              >
                {b.name}
                <span className="iso-name__pct">{Math.round(b.frac * 100)}%</span>
              </span>
            ))}
          </div>
        </div>

        {/* Zoom controls (fixed to the corner, outside the panned stage) */}
        <div className="iso-map__zoom">
          <button
            type="button"
            className="iso-zoom-btn"
            aria-label="Zoom in"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => zoom(ZOOM_STEP)}
          >
            <MdAdd size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="iso-zoom-btn"
            aria-label="Zoom out"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => zoom(1 / ZOOM_STEP)}
          >
            <MdRemove size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* XP progress */}
      <div className="iso-xp">
        <div className="iso-xp__head">
          <span className="iso-xp__label">Total XP</span>
          <span className="iso-xp__value">
            {earnedXP} / {totalXP} XP
          </span>
        </div>
        <div
          className="iso-xp__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalXP}
          aria-valuenow={earnedXP}
          aria-label="Total XP earned"
        >
          <div className="iso-xp__fill" style={{ width: `${xpPct}%` }} />
        </div>
      </div>
    </div>
  );
};

export default IsometricMilestoneMap;
