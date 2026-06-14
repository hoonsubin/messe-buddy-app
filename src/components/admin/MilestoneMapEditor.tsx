import type { Milestone } from "../../types/index.ts";
import MapViewport from "../shared/MapViewport.tsx";
import MilestoneNode from "../shared/MilestoneNode.tsx";
import BackgroundImageUploader from "./BackgroundImageUploader.tsx";
import GridOverlay, { GridToggleButton } from "./GridOverlay.tsx";

interface MilestoneMapEditorProps {
  readonly milestones: ReadonlyArray<Milestone>;
  readonly bgImageUrl: string;
  readonly onMilestoneClick: (id: string) => void;
  readonly onNodeDrop: (id: string, x: number, y: number) => void;
  readonly onAddMilestone: () => void;
  readonly onRename: (id: string, name: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onUploadBackground: (file: File) => void;
}

const MilestoneMapEditor = (props: MilestoneMapEditorProps) => (
  <div
    data-testid="milestone-map-editor"
    style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
  >
    <BackgroundImageUploader
      currentImageUrl={props.bgImageUrl}
      onUpload={props.onUploadBackground}
    />

    <MapViewport
      bgImageUrl={props.bgImageUrl}
      testId="milestone-map-editor-viewport"
      overlayControls={
        <GridToggleButton enabled={false} onToggle={() => undefined} />
      }
    >
      {/* Draggable milestone nodes */}
      {props.milestones.map((ms) => (
        <MilestoneNode
          key={ms.id}
          id={ms.id}
          label={ms.name}
          xPercent={ms.xPercent}
          yPercent={ms.yPercent}
          progressPercent={0}
          status="upcoming"
          draggable
          onClick={() => props.onMilestoneClick(ms.id)}
          onDragEnd={(x, y) => props.onNodeDrop(ms.id, x, y)}
        />
      ))}

      <GridOverlay enabled={false} columns={10} rows={6} />
    </MapViewport>

    <div className="map-editor-toolbar">
      <button
        type="button"
        className="btn btn--secondary"
        onClick={props.onAddMilestone}
      >
        + Add Milestone
      </button>
    </div>
  </div>
);

export default MilestoneMapEditor;
