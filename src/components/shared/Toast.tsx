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
      className={`toast${isError ? " toast--error" : ""}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
};

export default Toast;
