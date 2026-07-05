// Swipeable, draggable mission list item.
// Analog of Ionic's ion-item-sliding + ion-reorder.
//
// Touch / pointer:
//   Swipe left   → reveal red delete zone; past 160 px → immediate delete.
//   Long press   → trigger drag-to-reorder (500 ms, no movement).
// Mouse (PC):
//   Right-click  → toggle delete zone (equivalent of swipe-left).
//   Click & hold → trigger drag-to-reorder (500 ms, no movement).

import { useCallback, useRef, useState } from "react";
import { MdDelete, MdDragIndicator } from "react-icons/md";
import type { Mission } from "../../types/index.ts";
import TagBadge from "../shared/TagBadge.tsx";

// ── Constants ──────────────────────────────────────────────────────────────────

const SWIPE_REVEAL_PX = 72;
const SWIPE_AUTO_DELETE_PX = 160;
const AXIS_LOCK_PX = 4;
const LONG_PRESS_MS = 500;

const VALIDATION_LABEL: Record<string, string> = {
  gmApprove: "GM",
  selfApprove: "Self",
  qr: "QR",
};

const TYPE_LABEL: Record<string, string> = {
  text: "Text",
  link: "Link",
  form: "Form",
};

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MissionListItemProps {
  readonly mission: Mission;
  readonly index: number;
  readonly isActive: boolean;
  readonly isDragging: boolean;
  readonly onSelect: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onDragHandlePointerDown: (
    id: string,
    index: number,
    startY: number,
    pointerId: number,
  ) => void;
  readonly itemRef: React.RefCallback<HTMLLIElement>;
}

// ── Component ──────────────────────────────────────────────────────────────────

const MissionListItem = (props: MissionListItemProps) => {
  const {
    mission,
    index,
    isActive,
    isDragging,
    onSelect,
    onDelete,
    onDragHandlePointerDown,
    itemRef,
  } = props;

  // ── Swipe state ─────────────────────────────────────────────────────────────
  const [offsetX, setOffsetX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isHorizontallyDragging, setIsHorizontallyDragging] = useState(false);

  const swipeRef = useRef<{
    startX: number;
    startY: number;
    axis: "h" | "v" | null;
    active: boolean;
    pointerId: number;
  }>({ startX: 0, startY: 0, axis: null, active: false, pointerId: -1 });

  // Dedup: pointer-up called onSelect; suppress the synthetic click that follows.
  const pointerHandledRef = useRef(false);

  // Long-press timer (drag-to-reorder without handle)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // ── Defensive reset when item is deselected ──────────────────────────────────
  // When inactive, force neutral swipe visuals without an effect — internal state
  // may stay dirty but is hidden until the item is active again (items remount
  // on view switch in the common case).
  const displayOffsetX = isActive ? offsetX : 0;
  const displayRevealed = isActive ? isRevealed : false;
  const displayHorizontallyDragging = isActive ? isHorizontallyDragging : false;

  // ── Pointer handlers ─────────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Drag handle has its own dedicated handler
      if ((e.target as HTMLElement).closest(".mi-drag-handle")) return;

      clearLongPress();
      e.currentTarget.setPointerCapture(e.pointerId);

      swipeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        axis: null,
        active: true,
        pointerId: e.pointerId,
      };

      // Long-press → drag-to-reorder
      const capturedId = e.pointerId;
      const capturedY = e.clientY;
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        if (swipeRef.current.active && swipeRef.current.axis === null) {
          swipeRef.current.active = false;
          setIsHorizontallyDragging(false);
          onDragHandlePointerDown(
            mission.id,
            index,
            capturedY,
            capturedId,
          );
        }
      }, LONG_PRESS_MS);
    },
    [mission.id, index, onDragHandlePointerDown, clearLongPress],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = swipeRef.current;
      if (!s.active) return;

      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      // Lock axis on first movement past threshold
      if (s.axis === null) {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
        s.axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";

        if (s.axis === "v") {
          // Return scroll control to the browser
          clearLongPress();
          e.currentTarget.releasePointerCapture(e.pointerId);
          s.active = false;
          setIsHorizontallyDragging(false);
          return;
        }

        // Horizontal locked — cancel pending long-press
        clearLongPress();
        setIsHorizontallyDragging(true);
      }

      if (s.axis !== "h") return;
      e.stopPropagation();

      const base = isRevealed ? -SWIPE_REVEAL_PX : 0;
      const raw = base + dx;
      setOffsetX(Math.max(-SWIPE_AUTO_DELETE_PX - 10, Math.min(0, raw)));
    },
    [isRevealed, clearLongPress],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      clearLongPress();
      const s = swipeRef.current;
      if (!s.active) return;
      s.active = false;
      setIsHorizontallyDragging(false);

      if (s.axis !== "h") {
        // Pure tap (axis never locked)
        if (s.axis === null) {
          if (isRevealed) {
            setIsRevealed(false);
            setOffsetX(0);
          } else {
            pointerHandledRef.current = true;
            setTimeout(() => {
              pointerHandledRef.current = false;
            }, 100);
            onSelect(mission.id);
          }
        }
        return;
      }

      const dx = e.clientX - s.startX;
      const base = isRevealed ? -SWIPE_REVEAL_PX : 0;
      const finalOffset = base + dx;

      if (finalOffset < -SWIPE_AUTO_DELETE_PX) {
        onDelete(mission.id);
      } else if (finalOffset < -(SWIPE_REVEAL_PX / 2)) {
        setIsRevealed(true);
        setOffsetX(-SWIPE_REVEAL_PX);
      } else {
        setIsRevealed(false);
        setOffsetX(0);
      }
    },
    [isRevealed, mission.id, onSelect, onDelete, clearLongPress],
  );

  // Cancel: browser or OS grabbed the touch. Snap back to the stable pre-gesture
  // state. DO NOT compute a final position from cancelEvent.clientX — it can be
  // 0 or stale, producing huge negative offsets that trigger accidental deletes.
  const handlePointerCancel = useCallback(() => {
    clearLongPress();
    swipeRef.current.active = false;
    setIsHorizontallyDragging(false);
    // Snap back to wherever we were before this gesture started
    setOffsetX(isRevealed ? -SWIPE_REVEAL_PX : 0);
  }, [isRevealed, clearLongPress]);

  // ── Drag handle ──────────────────────────────────────────────────────────────
  const handleDragPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      onDragHandlePointerDown(mission.id, index, e.clientY, e.pointerId);
    },
    [mission.id, index, onDragHandlePointerDown],
  );

  // ── Right-click → toggle delete zone (PC equivalent of swipe-left) ───────────
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (isRevealed) {
        setIsRevealed(false);
        setOffsetX(0);
      } else {
        setIsRevealed(true);
        setOffsetX(-SWIPE_REVEAL_PX);
      }
    },
    [isRevealed],
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  const xpDisplay = mission.xpValue ?? 0;

  return (
    <li
      ref={itemRef}
      className={`swipe-item${isDragging ? " swipe-item--dragging" : ""}`}
    >
      {/* Delete zone (behind content, revealed by slide) */}
      <div className="swipe-item__delete-zone" aria-hidden="true">
        <button
          type="button"
          className="swipe-item__delete-btn"
          onClick={() => onDelete(mission.id)}
          tabIndex={displayRevealed ? 0 : -1}
          aria-label={`Delete ${mission.title}`}
        >
          <MdDelete size={22} aria-hidden="true" />
        </button>
      </div>

      {/* Content layer — slides left to reveal delete zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label={mission.title || "Untitled mission"}
        className={`swipe-item__content${
          isActive ? " swipe-item__content--active" : ""
        }`}
        style={{
          transform: `translateX(${displayOffsetX}px)`,
          transition: displayHorizontallyDragging
            ? "none"
            : "transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={handleContextMenu}
        onClick={() => {
          // Pointer-up handled selection for real pointer events;
          // this covers synthetic clicks (keyboard, test runners, assistive tech).
          if (pointerHandledRef.current) return;
          if (displayRevealed) {
            setIsRevealed(false);
            setOffsetX(0);
          } else onSelect(mission.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelect(mission.id);
        }}
      >
        {/* Order badge */}
        <span className="mi-order" aria-hidden="true">{index + 1}</span>

        {/* Body */}
        <div className="mi-body">
          <p className="mi-title">
            {mission.title || <em style={{ opacity: 0.5 }}>Untitled</em>}
          </p>

          {/* Line 2: XP + type + validation */}
          <div className="mi-meta">
            <span className="mi-badge mi-badge--xp">⚡ {xpDisplay} XP</span>
            <span className="mi-badge">
              {TYPE_LABEL[mission.type] ?? mission.type}
            </span>
            <span className="mi-badge">
              {VALIDATION_LABEL[mission.validationMethod] ??
                mission.validationMethod}
            </span>
          </div>

          {/* Line 3: tags */}
          {mission.tags.length > 0 && (
            <div className="mi-tags">
              {mission.tags.map((tag) => <TagBadge key={tag} label={tag} />)}
            </div>
          )}
        </div>

        {/* Drag handle (touch) / also the visual cue for click-and-hold (PC) */}
        <button
          type="button"
          className="mi-drag-handle"
          aria-label="Drag to reorder"
          onPointerDown={handleDragPointerDown}
        >
          <MdDragIndicator size={20} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
};

export default MissionListItem;
