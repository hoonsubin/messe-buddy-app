/**
 * ProfileEditSheet
 *
 * Bottom sheet for editing profile information. Two variants:
 *   - "player": name, preferredName, role, department + avatar stub
 *   - "gm":     display name only
 *
 * Uses the existing .bottom-sheet / .bottom-sheet-backdrop CSS classes for
 * slide-up animation. Height is capped at 62dvh (not the full 94dvh used
 * by MissionBottomSheet).
 *
 * State ownership: draft is local. Parent receives final values only via
 * onSave(). onClose() is called on cancel/scrim when not dirty, or after
 * the inline discard prompt resolves.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { MdDragHandle, MdPerson } from "react-icons/md";
import Toast from "./Toast.tsx";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlayerProfileFields {
  readonly name: string;
  readonly preferredName: string;
  readonly role: string;
  readonly department: string;
}

export interface GMProfileFields {
  readonly name: string;
}

interface BaseProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

interface PlayerVariantProps extends BaseProps {
  readonly variant: "player";
  readonly initialValues: PlayerProfileFields;
  readonly avatarUrl?: string;
  readonly onSave: (fields: PlayerProfileFields) => Promise<void>;
}

interface GMVariantProps extends BaseProps {
  readonly variant: "gm";
  readonly initialValues: GMProfileFields;
  readonly onSave: (fields: GMProfileFields) => Promise<void>;
}

type ProfileEditSheetProps = PlayerVariantProps | GMVariantProps;

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]![0] ?? "" : "";
  return (first + last).toUpperCase();
}

// ── Shared field component ────────────────────────────────────────────────────

interface FieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly placeholder?: string;
  readonly id: string;
}

const Field = ({ label, value, onChange, placeholder, id }: FieldProps) => {
  const [focused, setFocused] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1)",
      }}
    >
      <label
        htmlFor={id}
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: "var(--weight-medium)",
          color: "hsl(var(--color-fg))",
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius)",
          border: `1.5px solid ${
            focused ? "hsl(var(--color-primary))" : "hsl(var(--color-border))"
          }`,
          background: "hsl(var(--color-card))",
          color: "hsl(var(--color-fg))",
          fontSize: "var(--text-base)",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.15s",
        }}
      />
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const ProfileEditSheet = (props: ProfileEditSheetProps) => {
  const { isOpen, onClose, variant, initialValues, onSave } = props;

  // ── Draft state ────────────────────────────────────────────────────────────
  // Initialised from props when the sheet opens. Re-initialises on each open
  // so stale drafts don't persist across separate open/close cycles.
  const [draft, setDraft] = useState(() => ({ ...initialValues }));
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Track whether this open-cycle has been initialised so we can re-init on
  // each open without fighting React batching.
  const initialised = useRef(false);

  useEffect(() => {
    if (isOpen && !initialised.current) {
      setDraft({ ...initialValues });
      setShowDiscardPrompt(false);
      initialised.current = true;
    }
    if (!isOpen) {
      initialised.current = false;
    }
  }, [isOpen, initialValues]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Dirty detection ────────────────────────────────────────────────────────
  const isDirty = Object.keys(initialValues).some(
    (k) =>
      (draft as unknown as Record<string, string>)[k] !==
        (initialValues as unknown as Record<string, string>)[k],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleFieldChange = useCallback((field: string) => (value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (variant === "player") {
        await (onSave as PlayerVariantProps["onSave"])(
          draft as PlayerProfileFields,
        );
      } else {
        await (onSave as GMVariantProps["onSave"])(draft as GMProfileFields);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }, [draft, onSave, onClose, variant]);

  const handleCancelAttempt = useCallback(() => {
    if (isDirty) {
      setShowDiscardPrompt(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const handleDiscardConfirm = useCallback(() => {
    setShowDiscardPrompt(false);
    onClose();
  }, [onClose]);

  const handleDiscardCancel = useCallback(() => {
    setShowDiscardPrompt(false);
  }, []);

  const handleScrimClick = useCallback(() => {
    if (isDirty) {
      setShowDiscardPrompt(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const handleAvatarStubClick = useCallback(() => {
    showToast("Avatar upload coming soon");
  }, [showToast]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const playerInitials = variant === "player"
    ? initials((draft as PlayerProfileFields).name)
    : initials((draft as GMProfileFields).name);

  const avatarUrl = variant === "player"
    ? (props as PlayerVariantProps).avatarUrl
    : undefined;

  return (
    <>
      {/* Scrim */}
      <div
        className={`bottom-sheet-backdrop${
          isOpen ? " bottom-sheet-backdrop--visible" : ""
        }`}
        onClick={handleScrimClick}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`bottom-sheet${isOpen ? " bottom-sheet--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        style={{ height: "62dvh", maxWidth: "40rem", marginInline: "auto" }}
      >
        {/* Drag handle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: "var(--space-2)",
            paddingBottom: "var(--space-1)",
            flexShrink: 0,
          }}
        >
          <MdDragHandle
            size={24}
            style={{ color: "hsl(var(--color-muted-fg))" }}
            aria-hidden="true"
          />
        </div>

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "var(--space-4) var(--space-5) var(--space-6)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-5)",
          }}
        >
          {/* Avatar + sheet title */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
            }}
          >
            <button
              type="button"
              onClick={handleAvatarStubClick}
              aria-label="Upload avatar (coming soon)"
              style={{
                width: "3.5rem",
                height: "3.5rem",
                borderRadius: "50%",
                background: "hsl(var(--color-primary))",
                color: "hsl(var(--color-primary-fg))",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "var(--text-lg)",
                fontWeight: "var(--weight-semibold)",
                flexShrink: 0,
              }}
            >
              {avatarUrl
                ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    width="56"
                    height="56"
                    style={{ borderRadius: "50%", objectFit: "cover" }}
                  />
                )
                : playerInitials
                ? <span>{playerInitials}</span>
                : <MdPerson size={24} />}
            </button>
            <div>
              <p
                style={{
                  fontSize: "var(--text-lg)",
                  fontWeight: "var(--weight-semibold)",
                  color: "hsl(var(--color-fg))",
                  margin: 0,
                  lineHeight: "var(--leading-tight)",
                }}
              >
                {variant === "player"
                  ? "Edit profile"
                  : "Edit your display name"}
              </p>
              {variant === "player" && (
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "hsl(var(--color-muted-fg))",
                    margin: "var(--space-1) 0 0",
                  }}
                >
                  Tap photo to upload · coming soon
                </p>
              )}
            </div>
          </div>

          {/* Inline discard prompt */}
          {showDiscardPrompt && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-3)",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius)",
                background: "hsl(var(--color-muted))",
                border: `1px solid hsl(var(--color-border))`,
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  color: "hsl(var(--color-fg))",
                  fontWeight: "var(--weight-medium)",
                }}
              >
                Discard changes?
              </span>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button
                  type="button"
                  onClick={handleDiscardCancel}
                  style={{
                    padding: "var(--space-1) var(--space-3)",
                    borderRadius: "var(--radius)",
                    border: `1px solid hsl(var(--color-border))`,
                    background: "hsl(var(--color-card))",
                    color: "hsl(var(--color-fg))",
                    fontSize: "var(--text-sm)",
                    cursor: "pointer",
                    fontWeight: "var(--weight-medium)",
                  }}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={handleDiscardConfirm}
                  style={{
                    padding: "var(--space-1) var(--space-3)",
                    borderRadius: "var(--radius)",
                    border: "none",
                    background: "hsl(var(--color-destructive))",
                    color: "hsl(var(--color-destructive-fg))",
                    fontSize: "var(--text-sm)",
                    cursor: "pointer",
                    fontWeight: "var(--weight-medium)",
                  }}
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Fields */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <Field
              id="profile-name"
              label="Display name"
              value={(draft as Record<string, string>).name ?? ""}
              onChange={handleFieldChange("name")}
              placeholder="Your full name"
            />

            {variant === "player" && (
              <>
                <Field
                  id="profile-preferred-name"
                  label="Preferred name (shown in greetings)"
                  value={(draft as PlayerProfileFields).preferredName}
                  onChange={handleFieldChange("preferredName")}
                  placeholder="e.g. Alex"
                />
                <Field
                  id="profile-role"
                  label="Role / title"
                  value={(draft as PlayerProfileFields).role}
                  onChange={handleFieldChange("role")}
                  placeholder="e.g. Digital Content Manager"
                />
                <Field
                  id="profile-department"
                  label="Department"
                  value={(draft as PlayerProfileFields).department}
                  onChange={handleFieldChange("department")}
                  placeholder="e.g. Marketing"
                />
              </>
            )}
          </div>
        </div>

        {/* Action buttons — fixed at bottom of sheet */}
        <div
          style={{
            padding: "var(--space-4) var(--space-5) var(--space-6)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
            flexShrink: 0,
            borderTop: `1px solid hsl(var(--color-border))`,
          }}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%",
              padding: "var(--space-3) var(--space-5)",
              borderRadius: "var(--radius)",
              border: "none",
              background: saving
                ? "hsl(var(--color-muted))"
                : "hsl(var(--color-primary))",
              color: saving
                ? "hsl(var(--color-muted-fg))"
                : "hsl(var(--color-primary-fg))",
              fontSize: "var(--text-base)",
              fontWeight: "var(--weight-semibold)",
              cursor: saving ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={handleCancelAttempt}
            style={{
              width: "100%",
              padding: "var(--space-2)",
              background: "none",
              border: "none",
              color: "hsl(var(--color-muted-fg))",
              fontSize: "var(--text-sm)",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      <Toast message={toast} />
    </>
  );
};

export default ProfileEditSheet;
