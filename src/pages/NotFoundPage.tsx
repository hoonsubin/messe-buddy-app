import { useNavigate, useRouteError } from "react-router-dom";
import { MdErrorOutline } from "react-icons/md";

const NotFoundPage = () => {
  const navigate = useNavigate();
  // useRouteError is defined when rendered as an errorElement; undefined otherwise.
  const error = useRouteError() as
    | { status?: number; statusText?: string }
    | undefined;
  const is404 = !error || error.status === 404;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        padding: "var(--space-6)",
        gap: "var(--space-4)",
        textAlign: "center",
        background: "hsl(var(--color-bg))",
        color: "hsl(var(--color-fg))",
      }}
    >
      <MdErrorOutline
        size={48}
        aria-hidden="true"
        style={{ color: "hsl(var(--color-muted-fg))" }}
      />
      <h1
        style={{
          margin: 0,
          fontSize: "var(--text-2xl)",
          fontWeight: "var(--weight-bold)",
        }}
      >
        {is404 ? "Page not found" : "Something went wrong"}
      </h1>
      <p
        style={{
          margin: 0,
          fontSize: "var(--text-sm)",
          color: "hsl(var(--color-muted-fg))",
          maxWidth: "24rem",
        }}
      >
        {is404
          ? "This URL doesn't exist in MesseBuddy."
          : `An unexpected error occurred${
            error?.statusText ? `: ${error.statusText}` : "."
          }`}
      </p>
      <button
        type="button"
        className="btn btn--primary"
        onClick={() => navigate("/")}
      >
        Go home
      </button>
    </div>
  );
};

export default NotFoundPage;
