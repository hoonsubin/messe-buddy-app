import { useCallback, useState } from "react";
import { MdClose } from "react-icons/md";
import { DEMO_PROFILES } from "../../constants/demoInstance.ts";
import type { CachedIdentity } from "../../types/index.ts";
import { IconButton } from "../../components/shared/index.ts";
import ConfirmDialog from "../../components/shared/ConfirmDialog.tsx";
import { cn } from "../../utils/cn.ts";
import { landingRoleFor, profileInitials, roleLabel } from "./landingUtils.ts";

const isDemoProfile = (uid: string) => DEMO_PROFILES.some((d) => d.uid === uid);

interface ProfileCardProps {
  readonly identity: CachedIdentity;
  readonly isOrphaned: boolean;
  readonly onResume: (identity: CachedIdentity) => void;
  readonly onRemove: (uid: string) => void;
}

const ProfileCard = ({
  identity,
  isOrphaned,
  onResume,
  onRemove,
}: ProfileCardProps) => {
  const demo = isDemoProfile(identity.uid);
  const role = landingRoleFor(identity.role);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleClick = useCallback(() => {
    if (isOrphaned) {
      setConfirmOpen(true);
    } else {
      onResume(identity);
    }
  }, [isOrphaned, identity, onResume]);

  const handleConfirmRemove = useCallback(() => {
    setConfirmOpen(false);
    onRemove(identity.uid);
  }, [identity.uid, onRemove]);

  return (
    <div className="landing-profile">
      <div
        role="button"
        tabIndex={0}
        aria-label={isOrphaned
          ? `${identity.name ?? "unnamed"} — user removed`
          : `Resume as ${identity.name ?? "unnamed"}`}
        className={cn(
          "landing-profile__card",
          isOrphaned && "landing-profile__card--orphaned",
        )}
        data-role={role}
        {...(demo ? { "data-demo": true } : {})}
        onClick={handleClick}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
      >
        {demo && <span className="landing-profile__demo-pill">DEMO</span>}
        {isOrphaned && (
          <span className="landing-profile__orphan-pill">User removed</span>
        )}

        <div className="landing-profile__avatar" data-role={role}>
          {profileInitials(identity.name)}
        </div>

        <div className="landing-profile__meta">
          <p className="landing-profile__name">
            {identity.name ?? "Unnamed"}
          </p>
          <p className="landing-profile__session">
            {roleLabel(identity.role)} · {identity.sessionId}
          </p>
        </div>

        {!demo && (
          <div
            className="landing-profile__actions"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <IconButton
              type="button"
              aria-label="Remove profile"
              onClick={() => onRemove(identity.uid)}
            >
              <MdClose size={18} />
            </IconButton>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Profile no longer available"
        body={`The session for "${
          identity.name ?? "this profile"
        }" was deleted from the server. Remove it from your device?`}
        confirmLabel="Remove profile"
        cancelLabel="Keep"
        isDestructive
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default ProfileCard;
