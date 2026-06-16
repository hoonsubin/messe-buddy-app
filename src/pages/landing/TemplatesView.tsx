import TemplateLibrary from "../../components/shared/TemplateLibrary.tsx";
import type { TemplateExport } from "../../types/index.ts";
import type { LandingStatus, LandingView } from "../../hooks/useLandingFlow.ts";
import { toTemplateSummaries } from "../../utils/templateSummary.ts";

interface TemplatesViewProps {
  readonly templates: ReadonlyArray<TemplateExport>;
  readonly status: LandingStatus;
  readonly errorMessage: string;
  readonly onLoadTemplate: (templateName: string) => void;
  readonly onGoToView: (view: LandingView) => void;
}

const TemplatesView = ({
  templates,
  status,
  errorMessage,
  onLoadTemplate,
  onGoToView,
}: TemplatesViewProps) => (
  <>
    <p className="landing__section-label landing__section-label--emphasis">
      Select a template to create a new session
    </p>
    {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
    <TemplateLibrary
      templates={toTemplateSummaries(templates)}
      onLoad={onLoadTemplate}
      showSearch={false}
      showTitle={false}
      showPlaceholders={false}
      loading={status === "loading"}
      loadLabel="Use Template"
      emptyMessage="No templates saved yet. Create a session and save it as a template to see it here."
    />
    <button
      type="button"
      className="btn btn--ghost landing__back-btn"
      onClick={() => onGoToView("create")}
    >
      Back
    </button>
  </>
);

export default TemplatesView;
