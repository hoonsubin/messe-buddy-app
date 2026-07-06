import type { TemplateExport } from "../../types/index.ts";
import SelectCardList from "../shared/SelectCardList.tsx";

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
  <SelectCardList
    ariaLabel="Starting template"
    items={[
      {
        id: "scratch",
        title: "Start from scratch",
        subtitle:
          "Includes a profile mission to get started — customize the journey on the player page",
        testId: "oj-template-scratch",
        selected: value === null,
        onSelect: () => onChange(null),
      },
      ...templates.map((template) => {
        const milestoneCount = template.milestones.length;
        const missionCount = template.missions.length;
        return {
          id: template.name,
          title: template.name,
          subtitle: `${milestoneCount} milestone${
            milestoneCount === 1 ? "" : "s"
          } · ${missionCount} mission${missionCount === 1 ? "" : "s"}`,
          testId: `oj-template-option-${template.name}`,
          selected: value === template.name,
          onSelect: () => onChange(template.name),
        };
      }),
    ]}
  />
);

export default TemplateRadioList;
