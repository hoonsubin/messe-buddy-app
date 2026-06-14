import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { FormSchema, Player } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { useIdentity } from "../hooks/useIdentity.ts";
import { useSession } from "../hooks/useSession.ts";
import { usePlayerProgress } from "../hooks/usePlayerProgress.ts";
import TopBar from "../components/shared/TopBar.tsx";
import FormShell from "../components/form/FormShell.tsx";

const FormPage = () => {
  const { missionId } = useParams<{ missionId: string }>();
  const navigate = useNavigate();
  const adapter = useAdapter();
  const { identity } = useIdentity();

  const sessionId = identity?.sessionId ?? "";

  // Resolve player PB record (upsertProgressEvent needs PB id, not UID)
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);

  useEffect(() => {
    if (!identity) {
      setPlayerLoading(false);
      return;
    }
    let cancelled = false;
    const resolve = async () => {
      try {
        const p = await adapter.getPlayer(identity.uid);
        if (!cancelled) setPlayer(p);
      } catch {
        // Player lookup failed — player stays null
      } finally {
        if (!cancelled) setPlayerLoading(false);
      }
    };
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [adapter, identity]);

  // Fetch session data (missions + milestones) via shared hook
  const {
    milestones,
    missions: sessionMissions,
    loading: sessionLoading,
  } = useSession(sessionId);

  const mission = sessionMissions.find((m) => m.id === missionId) ?? null;

  // Derive real player XP from progress events
  const { playerProgress } = usePlayerProgress(
    player?.id ?? "",
    milestones,
    sessionMissions,
  );

  // Form schema from adapter
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  useEffect(() => {
    if (!missionId) return;
    let cancelled = false;

    const fetch = async () => {
      setSchemaLoading(true);
      setSchemaError(null);
      try {
        const schema = await adapter.getFormSchema(missionId);
        if (!cancelled) setFormSchema(schema);
      } catch (e) {
        if (!cancelled) {
          setSchemaError(
            e instanceof Error ? e.message : "Failed to load form",
          );
        }
      } finally {
        if (!cancelled) setSchemaLoading(false);
      }
    };

    void fetch();
    return () => {
      cancelled = true;
    };
  }, [adapter, missionId]);

  // Form state
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  // Pre-populate values from schema defaults (empty strings) when schema loads
  useEffect(() => {
    if (!formSchema) return;
    const defaults: Record<string, string> = {};
    for (const field of formSchema.fields) {
      defaults[field.id] = "";
    }
    setValues(defaults);
  }, [formSchema]);

  // Field change handler
  const handleFieldChange = useCallback(
    (fieldId: string, value: string) => {
      setValues((prev) => ({ ...prev, [fieldId]: value }));
      // Clear error when user edits
      setErrors((prev) => {
        if (!prev[fieldId]) return prev;
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    },
    [],
  );

  // Validate required fields, return true if valid
  const validate = useCallback((): boolean => {
    if (!formSchema) return false;

    const newErrors: Record<string, string> = {};
    for (const field of formSchema.fields) {
      if (field.required && !values[field.id]?.trim()) {
        newErrors[field.id] = `${field.label} is required`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formSchema, values]);

  // Submit handler — uses player.id (PB record ID) not identity.uid
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    if (!player || !missionId) return;

    setIsSubmitting(true);
    setIsDraft(false);
    try {
      await adapter.upsertProgressEvent(player.id, missionId, {
        status: "autoApproved",
        formResponse: values,
      });

      // Navigate back to cockpit after successful submission
      if (sessionId) {
        navigate(`/session/${sessionId}`, { replace: true });
      }
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        _form: e instanceof Error ? e.message : "Submission failed",
      }));
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, player, missionId, adapter, values, sessionId, navigate]);

  // Save for later — just keep local state (persistence is Phase 4-3)
  const handleSaveForLater = useCallback(() => {
    setIsDraft(true);
  }, []);

  // Back navigation
  const handleBack = useCallback(() => {
    if (sessionId) {
      navigate(`/session/${sessionId}`);
    }
  }, [sessionId, navigate]);

  // Missing identity guard
  if (!identity) {
    return (
      <div
        data-testid="form-page"
        data-page="form"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          color: "hsl(var(--color-muted-fg))",
          background: "hsl(var(--color-bg))",
        }}
      >
        <p>Please sign in first.</p>
      </div>
    );
  }

  // Loading state
  const isLoading = playerLoading || sessionLoading || schemaLoading;
  if (isLoading) {
    return (
      <div
        data-testid="form-page"
        data-page="form"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          color: "hsl(var(--color-muted-fg))",
          background: "hsl(var(--color-bg))",
        }}
      >
        <p>Loading form…</p>
      </div>
    );
  }

  // Error state
  if (schemaError) {
    return (
      <div
        data-testid="form-page"
        data-page="form"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          color: "hsl(var(--color-muted-fg))",
          background: "hsl(var(--color-bg))",
          gap: "var(--space-4)",
          padding: "var(--space-6)",
        }}
      >
        <p style={{ color: "hsl(var(--color-destructive))" }}>
          {schemaError}
        </p>
        {sessionId && (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleBack}
          >
            ← Back to Dashboard
          </button>
        )}
      </div>
    );
  }

  // Not found state
  if (!formSchema) {
    return (
      <div
        data-testid="form-page"
        data-page="form"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          color: "hsl(var(--color-muted-fg))",
          background: "hsl(var(--color-bg))",
          gap: "var(--space-4)",
          padding: "var(--space-6)",
        }}
      >
        <p>No form schema found for this mission.</p>
        {sessionId && (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleBack}
          >
            ← Back to Dashboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="form-page"
      data-page="form"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        background: "hsl(var(--color-bg))",
      }}
    >
      <TopBar
        playerName={player?.name || (identity.uid.slice(0, 6))}
        totalXP={playerProgress?.totalXP ?? 0}
        role="player"
      />

      <main
        style={{
          flex: 1,
          paddingTop: "var(--topbar-h)",
          display: "flex",
          justifyContent: "center",
          padding:
            "calc(var(--topbar-h) + var(--space-6)) var(--space-4) var(--space-8)",
        }}
      >
        <div style={{ width: "100%", maxWidth: "36rem" }}>
          {errors._form && (
            <p
              style={{
                color: "hsl(var(--color-destructive))",
                fontSize: "var(--text-sm)",
                marginBottom: "var(--space-4)",
                padding: "var(--space-3)",
                background: "hsl(var(--color-destructive) / 0.08)",
                borderRadius: "var(--radius-md)",
              }}
              role="alert"
            >
              {errors._form}
            </p>
          )}
          <FormShell
            missionTitle={mission?.title ?? "Form Mission"}
            description={mission?.body}
            fields={formSchema.fields}
            values={values}
            errors={errors}
            isSubmitting={isSubmitting}
            isDraft={isDraft}
            onFieldChange={handleFieldChange}
            onSubmit={handleSubmit}
            onSaveForLater={handleSaveForLater}
            onBack={handleBack}
          />
        </div>
      </main>
    </div>
  );
};

export default FormPage;
