import { useMemo } from "react";
import type {
  Milestone,
  Mission,
  PBRecord,
  Resource,
} from "../../types/index.ts";
import type { TemplateExport } from "../../types/exports.ts";
import TemplateSelect from "../../components/admin/TemplateSelect.tsx";
import MilestoneGrid from "../../components/admin/MilestoneGrid.tsx";
import MilestoneMapEditor from "../../components/admin/MilestoneMapEditor.tsx";
import ResourcesEditor from "../../components/admin/ResourcesEditor.tsx";
import HireDetailSection from "./HireDetailSection.tsx";
import HireInviteAccordion from "./HireInviteAccordion.tsx";

interface HireCustomizeTabProps {
  readonly hireFirstName: string;
  readonly sessionId: string;
  readonly templates: ReadonlyArray<TemplateExport>;
  readonly appliedTemplate: string | null;
  readonly applyingTemplate: boolean;
  readonly draftMilestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly completedMissionIds: ReadonlyArray<string>;
  readonly resources: ReadonlyArray<Resource>;
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
  readonly onAddResource: (data: Omit<Resource, keyof PBRecord>) => void;
  readonly onUpdateResource: (
    id: string,
    patch: Partial<Omit<Resource, keyof PBRecord>>,
  ) => void;
  readonly onDeleteResource: (id: string) => void;
  readonly onToggleVisibility: (id: string, visible: boolean) => void;
}

const HireCustomizeTab = ({
  hireFirstName,
  sessionId,
  templates,
  appliedTemplate,
  applyingTemplate,
  draftMilestones,
  missions,
  completedMissionIds,
  resources,
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
  onAddResource,
  onUpdateResource,
  onDeleteResource,
  onToggleVisibility,
}: HireCustomizeTabProps) => {
  const missionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of missions) {
      counts[m.milestoneId] = (counts[m.milestoneId] ?? 0) + 1;
    }
    return counts;
  }, [missions]);

  return (
    <main className="hire-detail__main hire-detail__main--wide">
      <HireDetailSection title="Onboarding template">
        <TemplateSelect
          templates={templates}
          appliedName={appliedTemplate}
          applying={applyingTemplate}
          onSelect={onSelectTemplate}
          onAddNew={onAddTemplate}
        />
      </HireDetailSection>

      <HireDetailSection title="Milestones & Missions">
        <p className="core-text-sm core-text-muted core-mb-3">
          Drag nodes to reposition them on the journey map, use the + button to
          add a new milestone, or pick a template above.
        </p>
        <div className="hire-detail__map-wrap">
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
        <MilestoneGrid
          milestones={draftMilestones}
          missions={missions}
          completedMissionIds={completedMissionIds}
          onSelect={onSelectMilestone}
        />
      </HireDetailSection>

      <HireDetailSection title="Resources">
        <ResourcesEditor
          resources={resources}
          sessionId={sessionId}
          onAdd={(data) => onAddResource(data)}
          onUpdate={(id, patch) => onUpdateResource(id, patch)}
          onDelete={(id) => onDeleteResource(id)}
          onToggleVisibility={(id, visible) => onToggleVisibility(id, visible)}
        />
      </HireDetailSection>

      <HireInviteAccordion
        hireFirstName={hireFirstName}
        sessionId={sessionId}
      />
    </main>
  );
};

export default HireCustomizeTab;
