/**
 * Toast - ephemeral status notification anchored to the bottom of the viewport.
 *
 * Renders nothing when `message` is null/undefined.
 * The caller is responsible for setting a timeout to clear the message.
 *
 * Usage:
 *   const [toast, setToast] = useState<string | null>(null);
 *   const showToast = (msg: string) => {
 *     setToast(msg);
 *     setTimeout(() => setToast(null), 3000);
 *   };
 *   <Toast message={toast} />
 */

interface ToastProps {
  /** The message to show. Pass null/undefined to hide. */
  readonly message: string | null | undefined;
  /** Treat message as an error (red text). Defaults to false. */
  readonly isError?: boolean;
}

const Toast = ({ message, isError = false }: ToastProps) => {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "var(--space-6)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2000,
        padding: "var(--space-3) var(--space-5)",
        borderRadius: "var(--radius-md)",
        background: "hsl(var(--color-card))",
        boxShadow: "var(--shadow-lg)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-medium)",
        color: isError
          ? "hsl(var(--color-destructive))"
          : "hsl(var(--color-status-complete))",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
  );
};

export default Toast;
