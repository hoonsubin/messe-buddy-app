import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePlayerFormPage } from "../hooks/pages/usePlayerFormPage.ts";
import TopBar from "../components/shared/TopBar.tsx";
import FetchErrorPanel from "../components/shared/FetchErrorPanel.tsx";
import FormShell from "../components/form/FormShell.tsx";
import {
  buildFormDefaultValues,
  formInitKey,
} from "../utils/formDefaultValues.ts";

const PlayerFormPage = () => {
  const navigate = useNavigate();
  const { missionId = "" } = useParams<{
    sessionId: string;
    missionId: string;
  }>();
  const vm = usePlayerFormPage();

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const lastFormInitKeyRef = useRef<string | null>(null);

  const readyFormSchema = vm.status === "ready" ? vm.formSchema : null;
  const initialValues = vm.status === "ready" ? vm.initialValues : null;

  useEffect(() => {
    if (vm.status !== "ready" || !readyFormSchema || !initialValues) return;

    const nextKey = formInitKey(
      missionId,
      readyFormSchema.fields,
      initialValues,
    );
    if (lastFormInitKeyRef.current === nextKey) return;
    lastFormInitKeyRef.current = nextKey;

    setValues(buildFormDefaultValues(initialValues, readyFormSchema.fields));
  }, [vm.status, readyFormSchema, initialValues, missionId]);

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
    if (vm.status !== "ready" || !vm.formSchema) return false;

    const newErrors: Record<string, string> = {};
    for (const field of vm.formSchema.fields) {
      if (field.required && !values[field.id]?.trim()) {
        newErrors[field.id] = `${field.label} is required`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, vm]);

  const handleSubmit = useCallback(async () => {
    if (vm.status !== "ready") return;
    if (!validate()) return;
    if (!vm.player) return;

    setIsSubmitting(true);
    setIsDraft(false);
    try {
      await vm.submitForm(values);
      navigate(`/session/${vm.sessionId}`, { replace: true });
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        _form: e instanceof Error ? e.message : "Submission failed",
      }));
    } finally {
      setIsSubmitting(false);
    }
  }, [navigate, validate, values, vm]);

  const handleSaveForLater = useCallback(() => {
    setIsDraft(true);
  }, []);

  if (vm.status === "no-identity") {
    return (
      <div
        data-testid="form-page"
        data-page="player-form"
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

  if (vm.status === "session-error") {
    return (
      <FetchErrorPanel
        message="Could not load session data. Please try again."
        onRetry={vm.refreshSession}
        testId="form-page"
        page="form"
        onBack={vm.navigateBack}
        backLabel="← Back to Dashboard"
      />
    );
  }

  if (vm.status === "loading") {
    return (
      <div
        data-testid="form-page"
        data-page="player-form"
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

  if (vm.status === "form-error") {
    return (
      <div
        data-testid="form-page"
        data-page="player-form"
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
          {vm.formError?.message}
        </p>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={vm.navigateBack}
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  if (vm.status === "no-schema") {
    return (
      <div
        data-testid="form-page"
        data-page="player-form"
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
        <button
          type="button"
          className="btn btn--secondary"
          onClick={vm.navigateBack}
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  if (vm.status !== "ready" || !vm.formSchema) {
    return null;
  }

  const { formSchema } = vm;

  return (
    <div
      data-testid="form-page"
      data-page="player-form"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        background: "hsl(var(--color-bg))",
      }}
    >
      <TopBar
        playerName={vm.player?.name || (vm.identity.uid.slice(0, 6))}
        totalXP={vm.progress.playerProgress?.totalXP ?? 0}
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
            missionTitle={vm.missionTitle}
            description={vm.missionBody}
            fields={formSchema.fields}
            values={values}
            errors={errors}
            isSubmitting={isSubmitting}
            isDraft={isDraft}
            onFieldChange={handleFieldChange}
            onSubmit={handleSubmit}
            onSaveForLater={handleSaveForLater}
            onBack={vm.navigateBack}
          />
        </div>
      </main>
    </div>
  );
};

export default PlayerFormPage;
