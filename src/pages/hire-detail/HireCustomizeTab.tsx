import type {
  Milestone,
  Mission,
  PBRecord,
  Resource,
} from "../../types/index.ts";
import type { TemplateExport } from "../../types/exports.ts";
import TemplateSelect from "../../components/admin/TemplateSelect.tsx";
import MilestoneGrid from "../../components/admin/MilestoneGrid.tsx";
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
  readonly onSelectTemplate: (name: string) => void;
  readonly onAddTemplate: () => void;
  readonly onSelectMilestone: (id: string) => void;
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
  onSelectTemplate,
  onAddTemplate,
  onSelectMilestone,
  onAddResource,
  onUpdateResource,
  onDeleteResource,
  onToggleVisibility,
}: HireCustomizeTabProps) => (
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

    <HireInviteAccordion hireFirstName={hireFirstName} sessionId={sessionId} />
  </main>
);

export default HireCustomizeTab;
