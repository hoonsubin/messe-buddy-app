// Phase 1 shell — logic wired in Phase 2+.
interface BuddyCardProps {
  readonly name: string;
  readonly role: string;
  readonly tenure?: string;
  readonly avatarUrl?: string;
  readonly contactUrl?: string;
}

const BuddyCard = (props: BuddyCardProps) => (
  <div className="buddy-card card" data-testid="buddy-card">
    <div className="buddy-card__avatar" aria-hidden="true">
      {props.avatarUrl && <img src={props.avatarUrl} alt="" width="48" height="48" />}
    </div>
    <div>
      <p className="buddy-card__name">{props.name}</p>
      <p className="buddy-card__role">{props.role}</p>
      <p className="buddy-card__tenure">{props.tenure}</p>
      <a
        className="btn btn--ghost"
        href={props.contactUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ marginTop: "var(--space-2)", display: "inline-flex" }}
      >
        Contact
      </a>
    </div>
  </div>
);

export default BuddyCard;
