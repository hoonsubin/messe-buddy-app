import { useState } from "react";
import { MdExpandLess, MdExpandMore, MdPersonAdd } from "react-icons/md";
import SessionInviteCard from "../../components/admin/SessionInviteCard.tsx";

interface HireInviteAccordionProps {
  readonly hireFirstName: string;
  readonly sessionId: string;
}

const HireInviteAccordion = ({
  hireFirstName,
  sessionId,
}: HireInviteAccordionProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="card hire-invite" data-testid="hire-invite-accordion">
      <button
        type="button"
        data-testid="invite-toggle"
        aria-expanded={open}
        className="hire-invite__trigger"
        onClick={() => setOpen((o) => !o)}
      >
        <MdPersonAdd
          size={22}
          aria-hidden="true"
          className="core-icon-accent"
        />
        <span className="hire-invite__trigger-text">
          <span className="hire-invite__title">
            Send {hireFirstName} their onboarding link
          </span>
          <span className="hire-invite__subtitle">
            {hireFirstName}{" "}
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
        <div className="hire-invite__body">
          <SessionInviteCard sessionId={sessionId} compact bare />
        </div>
      )}
    </div>
  );
};

export default HireInviteAccordion;
