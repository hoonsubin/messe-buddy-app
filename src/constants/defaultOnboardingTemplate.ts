import type { TemplateExport } from "../types/index.ts";
import {
  MISSION_TAG,
  MISSION_TYPE,
  VALIDATION_METHOD,
} from "../types/unions.ts";
import { PROFILE_FORM_FIELDS } from "./profileFormFields.ts";

/** Bundled journey applied when a GM onboards a player without selecting a template. */
export const DEFAULT_ONBOARDING_TEMPLATE: TemplateExport = {
  exportType: "template",
  exportedAt: "2026-07-06T00:00:00.000Z",
  name: "Default Onboarding",
  milestones: [
    {
      name: "Arrive & Get Set Up",
      xPercent: 13,
      yPercent: 33,
      xpThreshold: 100,
      order: 0,
    },
  ],
  missions: [
    {
      title: "Complete Your Profile",
      body:
        "Set your preferred name, role, and department so your team can get to know you.\n\nAnswer a few questions about your skills, interests, and learning goals. You can update this any time.",
      type: MISSION_TYPE.FORM,
      xpValue: 10,
      tags: [MISSION_TAG.MANDATORY, MISSION_TAG.ONBOARDING_PROFILE],
      order: 0,
      isInCurrentMissions: true,
      validationMethod: VALIDATION_METHOD.SELF_APPROVE,
      _milestoneOrder: 0,
    },
  ],
  formSchemas: [
    {
      fields: PROFILE_FORM_FIELDS,
      _missionOrder: 0,
    },
  ],
  resourceBindings: [],
};
