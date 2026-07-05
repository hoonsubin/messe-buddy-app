import type { TemplateExport } from "../../types/index.ts";
import SelectCard from "../patterns/SelectCard.tsx";

interface TemplateRadioListProps {
  readonly templates: ReadonlyArray<TemplateExport>;
  readonly value: string | null;
  readonly onChange: (templateName: string | null) => void;
}

const TemplateRadioList = ({
  templates,
  value,
  onChange,
}: TemplateRadioListProps) => (
  <div className="select-card-list" role="radiogroup" aria-label="Starting template">
    <SelectCard
      selected={value === null}
      testId="oj-template-scratch"
      title="Start from scratch"
      subtitle="Empty journey — add milestones on the player page"
      onSelect={() => onChange(null)}
    />
    {templates.map((template) => {
      const milestoneCount = template.milestones.length;
      const missionCount = template.missions.length;
      return (
        <SelectCard
          key={template.name}
          selected={value === template.name}
          testId={`oj-template-option-${template.name}`}
          title={template.name}
          subtitle={`${milestoneCount} milestone${
            milestoneCount === 1 ? "" : "s"
          } · ${missionCount} mission${missionCount === 1 ? "" : "s"}`}
          onSelect={() => onChange(template.name)}
        />
      );
    })}
  </div>
);

export default TemplateRadioList;
