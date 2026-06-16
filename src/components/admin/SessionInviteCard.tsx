import { useEffect, useRef, useState } from "react";
import { MdCheck, MdContentCopy, MdPersonAdd } from "react-icons/md";

interface SessionInviteCardProps {
  readonly sessionId: string;
}

// Load qrcode.js from CDN and generate a QR code into a canvas element.
// Returns a cleanup function that removes the canvas content.
function renderQRCode(canvas: HTMLCanvasElement, url: string): void {
  // Use the global QRCode constructor if the script has already loaded.
  if (typeof (globalThis as Record<string, unknown>)["QRCode"] !== "undefined") {
    const QRCode = (globalThis as Record<string, unknown>)["QRCode"] as new (
      el: HTMLElement,
      opts: Record<string, unknown>,
    ) => unknown;
    new QRCode(canvas, {
      text: url,
      width: 160,
      height: 160,
      colorDark: "#1a2744",
      colorLight: "#ffffff",
      correctLevel: 1, // L
    });
    return;
  }

  // Script not yet loaded — inject it and retry on load.
  const existing = document.getElementById("qrcode-js-cdn");
  const script = existing ??
    Object.assign(document.createElement("script"), {
      id: "qrcode-js-cdn",
      src: "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
    });

  script.addEventListener("load", () => renderQRCode(canvas, url), {
    once: true,
  });

  if (!existing) document.head.appendChild(script);
}

const SessionInviteCard = ({ sessionId }: SessionInviteCardProps) => {
  const [copied, setCopied] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const joinUrl = `${globalThis.location.origin}/join/${sessionId}`;

  // Render QR code into the container div
  useEffect(() => {
    const container = qrContainerRef.current;
    if (!container || !sessionId) return;
    // Clear any previous QR code
    container.innerHTML = "";
    renderQRCode(container as unknown as HTMLCanvasElement, joinUrl);
  }, [joinUrl, sessionId]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = joinUrl;
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

      {/* QR code */}
      <div
        style={{ display: "flex", justifyContent: "center" }}
        aria-label={`QR code for join URL: ${joinUrl}`}
      >
        <div
          ref={qrContainerRef}
          style={{
            width: "10rem",
            height: "10rem",
            borderRadius: "var(--radius)",
            overflow: "hidden",
            border: "1px solid hsl(var(--color-border))",
            background: "#fff",
          }}
        />
      </div>

      {/* URL display + copy button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          background: "hsl(var(--color-secondary))",
          borderRadius: "var(--radius)",
          padding: "var(--space-2) var(--space-3)",
          border: "1px solid hsl(var(--color-border))",
        }}
      >
        <span
          aria-label="Session join URL"
          style={{
            flex: 1,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            color: "hsl(var(--color-fg))",
            wordBreak: "break-all",
            userSelect: "all",
          }}
        >
          {joinUrl}
        </span>
        <button
          type="button"
          className="btn btn--ghost"
          aria-label={copied ? "Copied!" : "Copy join URL"}
          onClick={() => void handleCopyUrl()}
          style={{
            minWidth: "var(--min-touch)",
            minHeight: "var(--min-touch)",
            flexShrink: 0,
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
