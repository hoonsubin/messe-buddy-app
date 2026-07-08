import type { LibraryResource, TemplateExport } from "../../types/index.ts";
import Button from "../shared/Button.tsx";
import { BUTTON_VARIANT } from "../shared/types.ts";
import {
  Modal,
  ModalActions,
  ModalDescription,
  ModalTitle,
} from "../shared/Modal.tsx";
import { MODAL_VARIANT } from "../shared/types.ts";

interface AssignResourceToTemplateModalProps {
  readonly resource: LibraryResource;
  readonly templates: ReadonlyArray<TemplateExport>;
  readonly onToggle: (
    templateName: string,
    milestoneIndex: number,
    attach: boolean,
  ) => void;
  readonly onClose: () => void;
}

/**
 * Multi-select picker: for each template, tick the milestones this library
 * resource should be attached to. Attaching writes the resourceKey straight
 * into that template's `TemplateMilestone.resources` list — every future
 * player seeded from the template inherits it. Existing players already
 * mid-journey are unaffected, same as any other template edit.
 */
const AssignResourceToTemplateModal = ({
  resource,
  templates,
  onToggle,
  onClose,
}: AssignResourceToTemplateModalProps) => {
  return (
    <Modal
      open
      variant={MODAL_VARIANT.NARROW}
      role="dialog"
      aria-labelledby="assign-resource-modal-title"
      testId="assign-resource-modal"
      onBackdropClick={onClose}
    >
      <ModalTitle id="assign-resource-modal-title">
        Assign "{resource.title}" to milestones
      </ModalTitle>
      <ModalDescription>
        Pick which templates and milestones should include this resource. Only
        players onboarded after a template change will see it.
      </ModalDescription>

      {templates.length === 0 && (
        <p className="gm-home__empty-text">
          No templates yet. Save a player's journey as a template first.
        </p>
      )}

      <div className="assign-resource-modal__templates">
        {templates.map((template) => (
          <div
            key={template.name}
            className="card assign-resource-modal__template"
          >
            <p className="assign-resource-modal__template-name">
              {template.name}
            </p>
            <ul className="assign-resource-modal__milestone-list">
              {template.milestones.map((milestone, milestoneIndex) => {
                const checked = (milestone.resources ?? []).includes(
                  resource.resourceKey,
                );
                return (
                  <li key={milestoneIndex}>
                    <label className="assign-resource-modal__milestone-label">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          onToggle(
                            template.name,
                            milestoneIndex,
                            e.target.checked,
                          )}
                      />
                      {milestone.name}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <ModalActions>
        <Button variant={BUTTON_VARIANT.GHOST} onClick={onClose}>
          Done
        </Button>
      </ModalActions>
    </Modal>
  );
};

export default AssignResourceToTemplateModal;
