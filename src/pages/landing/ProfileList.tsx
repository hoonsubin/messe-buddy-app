import { MdAdd, MdPersonAdd } from "react-icons/md";
import type { CachedIdentity } from "../../types/index.ts";
import { Button } from "../../components/ui/index.ts";
import { cn } from "../../utils/cn.ts";
import type { ActiveForm } from "../../hooks/useLandingFlow.ts";
import ProfileCard from "./ProfileCard.tsx";

interface ProfileListProps {
  readonly profiles: ReadonlyArray<CachedIdentity>;
  readonly orphanedUids: ReadonlySet<string>;
  readonly keyPopupUid: string | null;
  readonly activeForm: ActiveForm;
  readonly onResume: (identity: CachedIdentity) => void;
  readonly onRemove: (uid: string) => void;
  readonly onShowKey: (uid: string) => void;
  readonly onHideKey: () => void;
  readonly onToggleForm: (form: "employee" | "gamemaker") => void;
}

const ProfileList = ({
  profiles,
  orphanedUids,
  keyPopupUid,
  activeForm,
  onResume,
  onRemove,
  onShowKey,
  onHideKey,
  onToggleForm,
}: ProfileListProps) => (
  <>
    <p className="landing__section-label">Your profiles</p>

    {profiles.length === 0 && (
      <p className="landing__empty-profiles">
        No saved profiles. Add one below.
      </p>
    )}

    {profiles.map((identity) => (
      <ProfileCard
        key={identity.uid}
        identity={identity}
        isOrphaned={orphanedUids.has(identity.uid)}
        isKeyOpen={keyPopupUid === identity.uid}
        onResume={onResume}
        onRemove={onRemove}
        onShowKey={onShowKey}
        onHideKey={onHideKey}
      />
    ))}

    <div
      className={cn(
        "landing-role-toggles",
        profiles.length > 0 && "landing-role-toggles--spaced",
      )}
    >
      <Button
        type="button"
        variant="secondary"
        className={cn(
          "landing-role-toggle",
          activeForm === "employee" && "landing-role-toggle--active",
        )}
        data-role="player"
        onClick={() => onToggleForm("employee")}
      >
        <MdPersonAdd size={16} />
        Employee
      </Button>
      <Button
        type="button"
        variant="secondary"
        className={cn(
          "landing-role-toggle",
          activeForm === "gamemaker" && "landing-role-toggle--active",
        )}
        data-role="gamemaker"
        onClick={() => onToggleForm("gamemaker")}
      >
        <MdAdd size={16} />
        Game Maker
      </Button>
    </div>
  </>
);

export default ProfileList;
