import { useCallback, useEffect, useState } from "react";
import type {
  FormSchema,
  Milestone,
  Mission,
  Resource,
  Session,
  TemplateExport,
} from "../types/index.ts";
import { MISSION_TYPE } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { applyTemplateToSession } from "../use-cases/applyTemplateToSession.ts";
import { exportTemplate } from "../use-cases/exportTemplate.ts";

export interface SaveAsTemplateInput {
  readonly session: Session;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly resources: ReadonlyArray<Resource>;
}

export interface UseHireTemplatesResult {
  readonly templates: ReadonlyArray<TemplateExport>;
  readonly applying: boolean;
  /** Apply a saved template (by name) into this hire's session. */
  readonly applyTemplate: (templateName: string) => Promise<void>;
  /** Overwrite a saved template with the hire's current content. */
  readonly saveAsTemplate: (
    name: string,
    input: SaveAsTemplateInput,
  ) => Promise<void>;
}

/**
 * Loads the saved onboarding templates and applies one into a specific hire's
 * session (replacing its milestones/missions/resources). Keeps adapter access
 * out of the page (C-18).
 */
export const useHireTemplates = (sid: string): UseHireTemplatesResult => {
  const adapter = useAdapter();
  const [templates, setTemplates] = useState<ReadonlyArray<TemplateExport>>([]);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    void adapter.listTemplates().then(setTemplates);
  }, [adapter]);

  const applyTemplate = useCallback(
    async (templateName: string): Promise<void> => {
      const t = templates.find((tpl) => tpl.name === templateName);
      if (!t) return;
      setApplying(true);
      try {
        await applyTemplateToSession(sid, t, adapter);
      } finally {
        setApplying(false);
      }
    },
    [templates, sid, adapter],
  );

  const saveAsTemplate = useCallback(
    async (name: string, input: SaveAsTemplateInput): Promise<void> => {
      const formMissions = input.missions.filter(
        (m) => m.type === MISSION_TYPE.FORM,
      );
      const schemaResults = await Promise.all(
        formMissions.map((m) => adapter.getFormSchema(m.id).catch(() => null)),
      );
      const schemas = schemaResults.filter(
        (s): s is FormSchema => s !== null,
      );
      const tpl = exportTemplate(
        name,
        input.session,
        input.milestones,
        input.missions,
        schemas,
        input.resources,
      );
      await adapter.saveTemplate(tpl);
      setTemplates((prev) => [...prev.filter((t) => t.name !== name), tpl]);
    },
    [adapter],
  );

  return { templates, applying, applyTemplate, saveAsTemplate };
};
