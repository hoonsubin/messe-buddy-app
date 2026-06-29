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
    <div className="not-found">
      <MdErrorOutline
        size={48}
        aria-hidden="true"
        className="core-icon-muted"
      />
      <h1 className="not-found__title">
        {is404 ? "Page not found" : "Something went wrong"}
      </h1>
      <p className="not-found__desc">
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
