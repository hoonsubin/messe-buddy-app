import { useState } from "react";
import { MdExpandLess, MdExpandMore, MdPersonAdd } from "react-icons/md";
import type { ClaimStatus } from "../../../types/index.ts";
import SessionInviteCard from "../SessionInviteCard.tsx";

interface PlayerInviteAccordionProps {
  readonly playerFirstName: string;
  readonly sessionId: string;
  readonly inviteToken: string;
  readonly claimStatus?: ClaimStatus;
  readonly pinnedUntilClaimed?: boolean;
}

const PlayerInviteAccordion = ({
  playerFirstName,
  sessionId,
  inviteToken,
  claimStatus = "invited",
  pinnedUntilClaimed = false,
}: PlayerInviteAccordionProps) => {
  const pinned = pinnedUntilClaimed && claimStatus === "invited";
  const [open, setOpen] = useState(pinned);
  const tokenReady = inviteToken.trim().length >= 8;

  return (
    <div
      className={`card player-invite${pinned ? " player-invite--pinned" : ""}`}
      data-testid="player-invite-accordion"
    >
      <button
        type="button"
        data-testid="invite-toggle"
        aria-expanded={open}
        className="player-invite__trigger"
        onClick={() => setOpen((o) => !o)}
      >
        <MdPersonAdd
          size={22}
          aria-hidden="true"
          className="core-icon-accent"
        />
        <span className="player-invite__trigger-text">
          <span className="player-invite__title">
            Send {playerFirstName} their onboarding link
          </span>
          <span className="player-invite__subtitle">
            {playerFirstName}{" "}
            can start their onboarding straight away by using this link.
          </span>
        </span>
        {open
          ? (
            <MdExpandLess
              size={20}
              aria-hidden="true"
              className="core-icon-muted"
            />
          )
          : (
            <MdExpandMore
              size={20}
              aria-hidden="true"
              className="core-icon-muted"
            />
          )}
      </button>
      {open && (
        <div
          className="player-invite__body"
          data-testid="player-invite-body"
        >
          {tokenReady
            ? (
              <SessionInviteCard
                sessionId={sessionId}
                inviteToken={inviteToken}
                compact
                bare
              />
            )
            : (
              <p
                className="core-text-sm core-text-muted"
                data-testid="player-invite-loading"
              >
                Preparing invite link…
              </p>
            )}
        </div>
      )}
    </div>
  );
};

export default PlayerInviteAccordion;
