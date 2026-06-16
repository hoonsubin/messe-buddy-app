import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FormSchema, TemplateExport } from "../types/index.ts";
import { MISSION_TYPE } from "../types/index.ts";
import type { AppAdapter } from "../adapters/interface.ts";
import type { Mission, Session } from "../types/index.ts";
import { exportTemplate } from "../use-cases/exportTemplate.ts";
import { importTemplate } from "../use-cases/importTemplate.ts";
import type { Resource } from "../types/index.ts";
import type { Milestone } from "../types/index.ts";

interface UseTemplateLibraryOptions {
  readonly sid: string;
  readonly active: boolean;
  readonly session: Session | null;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly resources: ReadonlyArray<Resource>;
  readonly gmUid: string | undefined;
  readonly adapter: AppAdapter;
}

interface UseTemplateLibraryResult {
  readonly templates: ReadonlyArray<TemplateExport>;
  readonly saveTemplateOpen: boolean;
  readonly templateName: string;
  readonly isSavingTemplate: boolean;
  readonly setSaveTemplateOpen: (open: boolean) => void;
  readonly setTemplateName: (name: string) => void;
  readonly handleExportTemplate: (replaceTarget?: string) => Promise<void>;
  readonly handleLoadTemplate: (templateId: string) => Promise<void>;
  readonly handleDeleteTemplate: (templateId: string) => Promise<void>;
}

/**
 * Manages the template library panel:
 * - Lists templates when the Active Session tab is open
 * - Exports (save + download) the current session as a template
 * - Imports a template into a new session and navigates there
 * - Deletes templates from the store
 */
export const useTemplateLibrary = ({
  sid,
  active,
  session,
  milestones,
  missions,
  resources,
  gmUid,
  adapter,
}: UseTemplateLibraryOptions): UseTemplateLibraryResult => {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<ReadonlyArray<TemplateExport>>([]);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Load template list whenever the active session tab is shown
  useEffect(() => {
    if (!active) return;
    void adapter.listTemplates().then(setTemplates);
  }, [adapter, active]);

  const handleExportTemplate = useCallback(
    async (replaceTarget?: string) => {
      if (!session) return;
      setIsSavingTemplate(true);
      try {
        const formMissions = missions.filter((m) =>
          m.type === MISSION_TYPE.FORM
        );
        const schemaResults = await Promise.all(
          formMissions.map((m) =>
            adapter.getFormSchema(m.id).catch(() => null)
          ),
        );
        const formSchemas = schemaResults.filter(
          (s): s is FormSchema => s !== null,
        );

        const name = replaceTarget ?? (templateName.trim() || session.name);
        const template = exportTemplate(
          name,
          session,
          milestones,
          missions,
          formSchemas,
          resources,
        );

        await adapter.saveTemplate(template);

        // Download as JSON file
        const blob = new Blob([JSON.stringify(template, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${name.replace(/\s+/g, "-").toLowerCase()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setSaveTemplateOpen(false);
        setTemplateName("");
      } finally {
        setIsSavingTemplate(false);
      }
    },
    [adapter, session, milestones, missions, resources, templateName],
  );

  const handleLoadTemplate = useCallback(
    async (templateId: string) => {
      const template = templates.find((t) => t.name === templateId);
      if (!template) return;
      const uid = gmUid ?? crypto.randomUUID();
      const newSessionId = await importTemplate(
        template,
        template.name,
        uid,
        adapter,
      );
      navigate(`/admin/${newSessionId}`, { replace: true });
    },
    [adapter, gmUid, navigate, templates],
  );

  const handleDeleteTemplate = useCallback(
    async (templateId: string) => {
      await adapter.deleteTemplate(templateId);
      setTemplates((prev) => prev.filter((t) => t.name !== templateId));
    },
    [adapter],
  );

  return {
    templates,
    saveTemplateOpen,
    templateName,
    isSavingTemplate,
    setSaveTemplateOpen,
    setTemplateName,
    handleExportTemplate,
    handleLoadTemplate,
    handleDeleteTemplate,
  };
};
