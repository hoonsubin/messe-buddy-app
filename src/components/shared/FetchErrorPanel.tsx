interface FetchErrorPanelProps {
  readonly message?: string;
  readonly onRetry: () => void;
  readonly retryLabel?: string;
  readonly onBack?: () => void;
  readonly backLabel?: string;
  readonly testId?: string;
  readonly page?: string;
}

/**
 * Full-viewport error state with a retry action for failed data fetches.
 * Used by pages that consume hooks exposing a `refresh()` callback.
 */
const FetchErrorPanel = ({
  message = "Could not load data. Please try again.",
  onRetry,
  retryLabel = "Try again",
  onBack,
  backLabel = "Go back",
  testId,
  page,
}: FetchErrorPanelProps) => (
  <div
    {...(testId !== undefined && { "data-testid": testId })}
    {...(page !== undefined && { "data-page": page })}
    className="fetch-error"
  >
    <p role="alert" className="fetch-error__message">
      {message}
    </p>
    <div className="fetch-error__actions">
      <button
        type="button"
        className="btn btn--primary"
        onClick={onRetry}
      >
        {retryLabel}
      </button>
      {onBack !== undefined && (
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onBack}
        >
          {backLabel}
        </button>
      )}
    </div>
  </div>
);

export default FetchErrorPanel;
