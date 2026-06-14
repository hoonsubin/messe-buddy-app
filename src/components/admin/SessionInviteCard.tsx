import { useState } from "react";
import { MdCheck, MdContentCopy, MdPersonAdd } from "react-icons/md";

interface SessionInviteCardProps {
  readonly sessionId: string;
}

const SessionInviteCard = ({ sessionId }: SessionInviteCardProps) => {
  const [copied, setCopied] = useState(false);

  const joinUrl = `${window.location.origin}/`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement("textarea");
      el.value = sessionId;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section
      aria-label="Invite new hire"
      className="card"
      style={{
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <header
        style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
      >
        <MdPersonAdd
          size={18}
          aria-hidden="true"
          style={{ color: "hsl(var(--color-accent))", flexShrink: 0 }}
        />
        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-base)",
            fontWeight: "var(--weight-semibold)",
            color: "hsl(var(--color-fg))",
          }}
        >
          Invite New Hire
        </h3>
      </header>

      <p
        style={{
          margin: 0,
          fontSize: "var(--text-sm)",
          color: "hsl(var(--color-muted-fg))",
        }}
      >
        Share this code with the new hire. They'll enter it on the{" "}
        <strong>New Employee</strong> login screen at{" "}
        <span style={{ fontFamily: "monospace" }}>{joinUrl}</span>
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          background: "hsl(var(--color-secondary))",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-2) var(--space-3)",
          border: "1px solid hsl(var(--color-border))",
        }}
      >
        <span
          aria-label="Session join code"
          style={{
            flex: 1,
            fontFamily: "monospace",
            fontSize: "var(--text-base)",
            fontWeight: "var(--weight-semibold)",
            color: "hsl(var(--color-fg))",
            letterSpacing: "0.05em",
            userSelect: "all",
          }}
        >
          {sessionId}
        </span>
        <button
          type="button"
          className="btn btn--ghost"
          aria-label={copied ? "Copied!" : "Copy session code"}
          onClick={() => void handleCopyCode()}
          style={{
            minWidth: "var(--min-touch)",
            minHeight: "var(--min-touch)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
            color: copied ? "hsl(var(--color-status-complete))" : undefined,
            transition: "color 0.2s",
          }}
        >
          {copied
            ? <MdCheck size={18} aria-hidden="true" />
            : <MdContentCopy size={18} aria-hidden="true" />}
          <span style={{ fontSize: "var(--text-sm)" }}>
            {copied ? "Copied" : "Copy"}
          </span>
        </button>
      </div>
    </section>
  );
};

export default SessionInviteCard;
