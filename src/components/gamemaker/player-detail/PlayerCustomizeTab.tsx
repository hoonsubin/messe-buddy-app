import { useMemo } from "react";
import type { ClaimStatus, Milestone, Mission } from "../../../types/index.ts";
import type { TemplateExport } from "../../../types/exports.ts";
import TemplateSelect from "../TemplateSelect.tsx";
import MilestoneMapEditor from "../MilestoneMapEditor.tsx";
import PlayerDetailSection from "./PlayerDetailSection.tsx";
import PlayerInviteAccordion from "./PlayerInviteAccordion.tsx";

interface PlayerCustomizeTabProps {
  readonly playerFirstName: string;
  readonly sessionId: string;
  readonly inviteToken: string;
  readonly claimStatus: ClaimStatus;
  readonly templates: ReadonlyArray<TemplateExport>;
  readonly appliedTemplate: string | null;
  readonly applyingTemplate: boolean;
  readonly draftMilestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly bgImageUrl: string;
  readonly mapNodeScale: number;
  readonly onSelectTemplate: (name: string) => void;
  readonly onAddTemplate: () => void;
  readonly onSelectMilestone: (id: string) => void;
  readonly onAddMilestoneAt: (xPercent: number, yPercent: number) => void;
  readonly onNodeDrop: (id: string, xPercent: number, yPercent: number) => void;
  readonly onDeleteMilestone: (id: string) => void;
  readonly onResetToGrid: () => void;
  readonly onUploadBackground: (file: File) => void;
  readonly onMapNodeScaleChange: (scale: number) => void;
  readonly onOpenScanner: () => void;
}

const PlayerCustomizeTab = ({
  playerFirstName,
  sessionId,
  inviteToken,
  claimStatus,
  templates,
  appliedTemplate,
  applyingTemplate,
  draftMilestones,
  missions,
  bgImageUrl,
  mapNodeScale,
  onSelectTemplate,
  onAddTemplate,
  onSelectMilestone,
  onAddMilestoneAt,
  onNodeDrop,
  onDeleteMilestone,
  onResetToGrid,
  onUploadBackground,
  onMapNodeScaleChange,
  onOpenScanner,
}: PlayerCustomizeTabProps) => {
  const missionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of missions) {
      counts[m.milestoneId] = (counts[m.milestoneId] ?? 0) + 1;
    }
    return counts;
  }, [missions]);

  return (
    <main className="player-detail__main player-detail__main--wide">
      <PlayerInviteAccordion
        playerFirstName={playerFirstName}
        sessionId={sessionId}
        inviteToken={inviteToken}
        claimStatus={claimStatus}
        pinnedUntilClaimed
      />

      <PlayerDetailSection title="Onboarding template">
        <TemplateSelect
          templates={templates}
          appliedName={appliedTemplate}
          applying={applyingTemplate}
          onSelect={onSelectTemplate}
          onAddNew={onAddTemplate}
        />
      </PlayerDetailSection>

      <PlayerDetailSection title="Milestones & Missions">
        <p className="core-text-sm core-text-muted core-mb-3">
          Drag nodes to reposition them on the journey map, use the + button to
          add a new milestone, or pick a template above. Tap a milestone to edit
          missions and resources.
        </p>
        <div className="player-detail__map-wrap">
          <MilestoneMapEditor
            milestones={draftMilestones}
            missionCounts={missionCounts}
            bgImageUrl={bgImageUrl}
            mapNodeScale={mapNodeScale}
            onMilestoneClick={onSelectMilestone}
            onNodeDrop={onNodeDrop}
            onAddMilestoneAt={onAddMilestoneAt}
            onDelete={onDeleteMilestone}
            onUploadBackground={onUploadBackground}
            onMapNodeScaleChange={onMapNodeScaleChange}
            onOpenScanner={onOpenScanner}
            onResetToGrid={onResetToGrid}
          />
        </div>
      </PlayerDetailSection>
    </main>
  );
};

export default PlayerCustomizeTab;
