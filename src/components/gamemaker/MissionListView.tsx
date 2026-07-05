// Mission list with swipe-to-delete and drag-to-reorder.
// Analog of Ionic's ion-list with ion-item-sliding + ion-reorder-group.

import { useCallback, useMemo, useRef, useState } from "react";
import type { Mission } from "../../types/index.ts";
import MissionListItem from "./MissionListItem.tsx";

// ── Types ──────────────────────────────────────────────────────────────────────

interface MissionListViewProps {
  readonly missions: ReadonlyArray<Mission>;
  readonly activeMissionId: string | null;
  readonly onMissionSelect: (missionId: string) => void;
  readonly onAddMission: () => void;
  readonly onDeleteMission: (missionId: string) => void;
  readonly onReorderMission: (missionId: string, newOrder: number) => void;
}

interface DragState {
  readonly id: string;
  readonly fromIndex: number;
  toIndex: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

const MissionListView = (props: MissionListViewProps) => {
  const {
    missions,
    activeMissionId,
    onMissionSelect,
    onAddMission,
    onDeleteMission,
    onReorderMission,
  } = props;

  // ── Drag-to-reorder state ────────────────────────────────────────────────────
  const [dragState, setDragState] = useState<DragState | null>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const listRef = useRef<HTMLUListElement>(null);
  const dragPointerIdRef = useRef<number | null>(null);

  // Compute display order while dragging (reinsert at toIndex)
  const displayMissions = useMemo(() => {
    if (!dragState) return missions;
    const arr = [...missions];
    const [dragged] = arr.splice(dragState.fromIndex, 1);
    arr.splice(dragState.toIndex, 0, dragged);
    return arr;
  }, [missions, dragState]);

  // ── Drag: start (called by item's drag handle) ───────────────────────────────
  const handleDragStart = useCallback((
    id: string,
    index: number,
    _startY: number,
    pointerId: number,
  ) => {
    dragPointerIdRef.current = pointerId;
    setDragState({ id, fromIndex: index, toIndex: index });
    listRef.current?.setPointerCapture(pointerId);
  }, []);

  // ── Drag: pointer move on list container ─────────────────────────────────────
  const handleListPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== dragPointerIdRef.current) return;
    if (!dragState) return;

    for (let i = 0; i < itemRefs.current.length; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY < rect.bottom) {
        if (i !== dragState.toIndex) {
          setDragState((prev) => prev ? { ...prev, toIndex: i } : null);
        }
        break;
      }
    }
  }, [dragState]);

  // ── Drag: pointer up — commit reorder ────────────────────────────────────────
  const handleListPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== dragPointerIdRef.current) return;
    dragPointerIdRef.current = null;
    if (!dragState) return;

    if (dragState.fromIndex !== dragState.toIndex) {
      onReorderMission(dragState.id, dragState.toIndex);
    }
    setDragState(null);
  }, [dragState, onReorderMission]);

  // ── Item ref collector ───────────────────────────────────────────────────────
  const makeItemRef = useCallback(
    (i: number) => (el: HTMLLIElement | null) => {
      itemRefs.current[i] = el;
    },
    [],
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <ul
        ref={listRef}
        className="sheet-mission-list"
        role="list"
        onPointerMove={handleListPointerMove}
        onPointerUp={handleListPointerUp}
        onPointerCancel={handleListPointerUp}
      >
        {displayMissions.map((m, i) => (
          <MissionListItem
            key={m.id}
            mission={m}
            index={i}
            isActive={m.id === activeMissionId}
            isDragging={dragState?.id === m.id}
            onSelect={onMissionSelect}
            onDelete={onDeleteMission}
            onDragHandlePointerDown={handleDragStart}
            itemRef={makeItemRef(i)}
          />
        ))}
      </ul>

      <div style={{ padding: "var(--space-4) var(--space-5)" }}>
        <button
          type="button"
          className="btn btn--secondary"
          style={{ width: "100%", minHeight: "var(--touch-target)" }}
          onClick={onAddMission}
        >
          + Add mission
        </button>
      </div>
    </div>
  );
};

export default MissionListView;
