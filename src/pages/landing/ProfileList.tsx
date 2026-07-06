import type { CachedIdentity } from "../../types/index.ts";
import { Button } from "../../components/shared/index.ts";
import ProfileCard from "./ProfileCard.tsx";

interface ProfileListProps {
  readonly profiles: ReadonlyArray<CachedIdentity>;
  readonly orphanedUids: ReadonlySet<string>;
  readonly workspacePanelOpen: boolean;
  readonly onResume: (identity: CachedIdentity) => void;
  readonly onRemove: (uid: string) => void;
  readonly onToggleWorkspacePanel: () => void;
}

const ProfileList = ({
  profiles,
  orphanedUids,
  workspacePanelOpen,
  onResume,
  onRemove,
  onToggleWorkspacePanel,
}: ProfileListProps) => (
  <>
    <p className="landing__section-label">Your profiles</p>

    {profiles.length === 0 && (
      <p className="landing__empty-profiles">
        No saved profiles. Create a workspace below.
      </p>
    )}

    {profiles.map((identity) => (
      <ProfileCard
        key={identity.uid}
        identity={identity}
        isOrphaned={orphanedUids.has(identity.uid)}
        onResume={onResume}
        onRemove={onRemove}
      />
    ))}

    <div className="landing-new-journey">
      <Button
        type="button"
        variant="primary"
        fullWidth
        className="landing-new-journey__btn"
        data-testid="landing-new-journey-btn"
        aria-expanded={workspacePanelOpen}
        onClick={onToggleWorkspacePanel}
      >
        New onboarding journey
      </Button>
      <p className="landing-new-journey__hint">
        Players join only via invitation link
      </p>
    </div>
  </>
);

export default ProfileList;
