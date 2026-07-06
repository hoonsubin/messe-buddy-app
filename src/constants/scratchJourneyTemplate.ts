import type { TemplateExport } from "../types/index.ts";
import { MISSION_TAG, MISSION_TYPE, VALIDATION_METHOD } from "../types/unions.ts";
import { PROFILE_FORM_FIELDS } from "./profileFormFields.ts";

/**
 * Applied when a GM chooses "Start from scratch" in the onboarding wizard
 * instead of a registered template: one milestone, one mission (the
 * player's profile) — everything else is added by the GM afterward on the
 * player page. Deliberately not registered via `saveTemplate` — it isn't a
 * selectable template, it's what "no template" seeds.
 */
export const SCRATCH_JOURNEY_TEMPLATE: TemplateExport = {
  exportType: "template",
  exportedAt: "2026-07-06T00:00:00.000Z",
  name: "Scratch",
  milestones: [
    {
      name: "Get Started",
      xPercent: 50,
      yPercent: 50,
      xpThreshold: 10,
      missions: [
        {
          title: "Complete Your Profile",
          body:
            "Set your preferred name, role, and department so your team can get to know you.\n\nAnswer a few questions about your skills, interests, and learning goals. Uploading a photo is optional but encouraged. You can also set your communication preferences here.",
          type: MISSION_TYPE.FORM,
          xpValue: 10,
          tags: [MISSION_TAG.MANDATORY, MISSION_TAG.ONBOARDING_PROFILE],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.SELF_APPROVE,
          formFields: PROFILE_FORM_FIELDS,
        },
      ],
    },
  ],
};
