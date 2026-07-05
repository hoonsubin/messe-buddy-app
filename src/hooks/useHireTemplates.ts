import { useCallback, useEffect, useState } from "react";
import type {
  FormSchema,
  Milestone,
  Mission,
  Resource,
  TemplateExport,
} from "../types/index.ts";
import { MISSION_TYPE } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { applyTemplateToPlayer } from "../use-cases/applyTemplateToSession.ts";
import { exportTemplate } from "../use-cases/exportTemplate.ts";

export interface SaveAsTemplateInput {
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly resources: ReadonlyArray<Resource>;
}

export interface UsePlayerTemplatesResult {
  readonly templates: ReadonlyArray<TemplateExport>;
  readonly applying: boolean;
  readonly applyTemplate: (templateName: string) => Promise<void>;
  readonly saveAsTemplate: (
    name: string,
    input: SaveAsTemplateInput,
  ) => Promise<void>;
}

export const usePlayerTemplates = (
  _sessionId: string,
  playerId: string,
): UsePlayerTemplatesResult => {
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
        await applyTemplateToPlayer(playerId, t, adapter);
      } finally {
        setApplying(false);
      }
    },
    [templates, playerId, adapter],
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
      const [library, attachments] = await Promise.all([
        adapter.listLibraryResources(),
        adapter.listMilestoneResources(playerId),
      ]);
      const visibilityByLib = new Map(
        input.resources.map((r) => [r.id, r.isVisibleToPlayer]),
      );
      const milestoneResources = attachments.map((mr) => ({
        ...mr,
        isVisibleToPlayer: visibilityByLib.get(mr.libraryResourceId) ??
          mr.isVisibleToPlayer,
      }));
      const tpl = exportTemplate(
        name,
        input.milestones,
        input.missions,
        schemas,
        milestoneResources,
        library,
      );
      await adapter.saveTemplate(tpl);
      setTemplates((prev) => [...prev.filter((t) => t.name !== name), tpl]);
    },
    [adapter, playerId],
  );

  return { templates, applying, applyTemplate, saveAsTemplate };
};

export const useHireTemplates = usePlayerTemplates;
