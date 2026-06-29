import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { USER_ROLE } from "../types/index.ts";
import { useActiveProfile } from "../hooks/useActiveProfile.ts";
import { useResolvedPlayer } from "../hooks/useResolvedPlayer.ts";
import { useSession } from "../hooks/useSession.ts";
import { useProgressPlayer } from "../hooks/useProgress/index.ts";
import { useFormMission } from "../hooks/useFormMission.ts";
import TopBar from "../components/shared/TopBar.tsx";
import FetchErrorPanel from "../components/shared/FetchErrorPanel.tsx";
import FormShell from "../components/form/FormShell.tsx";

const FormPage = () => {
  const { sessionId: routeSessionId, missionId } = useParams<{
    sessionId: string;
    missionId: string;
  }>();
  const sessionId = routeSessionId ?? "";
  const navigate = useNavigate();
  const identity = useActiveProfile(sessionId, USER_ROLE.PLAYER);

  const {
    player,
    loading: playerLoading,
    updatePlayer,
  } = useResolvedPlayer(identity?.uid);

  const {
    milestones,
    missions,
    loading: sessionLoading,
    error: sessionError,
    refresh: refreshSession,
  } = useSession(sessionId);

  const progress = useProgressPlayer({
    playerId: player?.id ?? "",
    milestones,
    missions,
  });

  const formMission = useFormMission(sessionId, missionId, missions, {
    player,
    updatePlayer,
    markAutoApproved: progress.markAutoApproved,
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  useEffect(() => {
    if (!formMission.formSchema) return;
    // Merge admin-seeded initialValues (PLR-1); fall back to "" for unknown fields.
    const defaults: Record<string, string> = { ...formMission.initialValues };
    for (const field of formMission.formSchema.fields) {
      if (!(field.id in defaults)) defaults[field.id] = "";
    }
    setValues(defaults);
  }, [formMission.formSchema, formMission.initialValues]);

  const handleFieldChange = useCallback(
    (fieldId: string, value: string) => {
      setValues((prev) => ({ ...prev, [fieldId]: value }));
      setErrors((prev) => {
        if (!prev[fieldId]) return prev;
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    },
    [],
  );

  const validate = useCallback((): boolean => {
    if (!formMission.formSchema) return false;

    const newErrors: Record<string, string> = {};
    for (const field of formMission.formSchema.fields) {
      if (field.required && !values[field.id]?.trim()) {
        newErrors[field.id] = `${field.label} is required`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formMission.formSchema, values]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    if (!player || !missionId) return;

    setIsSubmitting(true);
    setIsDraft(false);
    try {
      await formMission.submitForm(values);
      navigate(`/session/${sessionId}`, { replace: true });
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        _form: e instanceof Error ? e.message : "Submission failed",
      }));
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, player, missionId, formMission, values, sessionId, navigate]);

  const handleSaveForLater = useCallback(() => {
    setIsDraft(true);
  }, []);

  const handleBack = useCallback(() => {
    navigate(`/session/${sessionId}`);
  }, [sessionId, navigate]);

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

  if (sessionError && !sessionLoading) {
    return (
      <FetchErrorPanel
        message="Could not load session data. Please try again."
        onRetry={refreshSession}
        testId="form-page"
        page="form"
        {...(sessionId && {
          onBack: () => navigate(`/session/${sessionId}`),
          backLabel: "← Back to Dashboard",
        })}
      />
    );
  }

  const isLoading = playerLoading || sessionLoading || formMission.loading;
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

  if (formMission.error) {
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
          {formMission.error.message}
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

  if (!formMission.formSchema) {
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
        totalXP={progress.playerProgress?.totalXP ?? 0}
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
            missionTitle={formMission.missionTitle}
            description={formMission.missionBody}
            fields={formMission.formSchema.fields}
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
