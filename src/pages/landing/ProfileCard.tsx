import { MdClose, MdVpnKey } from "react-icons/md";
import { DEMO_PROFILES } from "../../hooks/useLandingFlow.ts";
import type { CachedIdentity } from "../../types/index.ts";
import { IconButton } from "../../components/ui/index.ts";
import { cn } from "../../utils/cn.ts";
import { landingRoleFor, profileInitials, roleLabel } from "./landingUtils.ts";

const isDemoProfile = (uid: string) => DEMO_PROFILES.some((d) => d.uid === uid);

interface ProfileCardProps {
  readonly identity: CachedIdentity;
  readonly isKeyOpen: boolean;
  readonly onResume: (identity: CachedIdentity) => void;
  readonly onRemove: (uid: string) => void;
  readonly onShowKey: (uid: string) => void;
  readonly onHideKey: () => void;
}

const ProfileCard = ({
  identity,
  isKeyOpen,
  onResume,
  onRemove,
  onShowKey,
  onHideKey,
}: ProfileCardProps) => {
  const demo = isDemoProfile(identity.uid);
  const role = landingRoleFor(identity.role);

  return (
    <div className="landing-profile">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Resume as ${identity.name ?? "unnamed"}`}
        className={cn(
          "landing-profile__card",
          isKeyOpen && "landing-profile__card--key-open",
        )}
        data-role={role}
        {...(demo ? { "data-demo": true } : {})}
        onClick={() => onResume(identity)}
        onKeyDown={(e) => e.key === "Enter" && onResume(identity)}
      >
        {demo && <span className="landing-profile__demo-pill">DEMO</span>}

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

        <div
          className="landing-profile__actions"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <IconButton
            type="button"
            aria-label={isKeyOpen ? "Hide recovery key" : "Show recovery key"}
            className={cn(
              isKeyOpen && "landing-profile__key-btn--active",
            )}
            data-role={role}
            onClick={() => (isKeyOpen ? onHideKey() : onShowKey(identity.uid))}
          >
            <MdVpnKey size={18} />
          </IconButton>
          {!demo && (
            <IconButton
              type="button"
              aria-label="Remove profile"
              onClick={() => onRemove(identity.uid)}
            >
              <MdClose size={18} />
            </IconButton>
          )}
        </div>
      </div>

      {isKeyOpen && (
        <div className="landing-profile__key-reveal">
          <p className="landing-profile__key-label">
            Recovery key:{" "}
            <span className="landing-profile__key-value">
              {identity.recoveryKey}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default ProfileCard;
