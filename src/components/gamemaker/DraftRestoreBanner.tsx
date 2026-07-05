import { formatTime } from "../../utils/draftStorage.ts";

interface DraftRestoreBannerProps {
  readonly savedAt: string;
  readonly onDismiss: () => void;
  readonly onLoad: () => void;
}

const DraftRestoreBanner = (props: DraftRestoreBannerProps) => (
  <div className="draft-banner" role="status">
    <span className="draft-banner__text">
      Unsaved draft from {formatTime(props.savedAt)}
    </span>
    <div className="draft-banner__actions">
      <button
        type="button"
        className="btn btn--ghost draft-banner__action"
        onClick={props.onDismiss}
      >
        Dismiss
      </button>
      <button
        type="button"
        className="btn btn--secondary draft-banner__action"
        onClick={props.onLoad}
      >
        Load draft
      </button>
    </div>
  </div>
);

export default DraftRestoreBanner;
