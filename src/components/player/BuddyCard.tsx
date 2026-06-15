import { MdEmail, MdPhone } from "react-icons/md";

interface BuddyCardProps {
  readonly name: string;
  readonly role: string;
  readonly tenure?: string;
  readonly avatarUrl?: string;
  readonly contactUrl?: string;
  readonly quote?: string;
  readonly email?: string;
  readonly phone?: string;
}

/** Returns initials from a full name (up to 2 chars). */
const initials = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

const BuddyCard = (props: BuddyCardProps) => (
  <div className="buddy-card" data-testid="buddy-card">
    <p className="section-label" style={{ margin: 0 }}>Your Buddy</p>

    {/* Identity row */}
    <div className="buddy-card__identity">
      <div className="buddy-card__avatar" aria-hidden="true">
        {props.avatarUrl
          ? (
            <img
              src={props.avatarUrl}
              alt=""
              width="48"
              height="48"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )
          : initials(props.name)}
      </div>
      <div>
        <p className="buddy-card__name">{props.name}</p>
        <p className="buddy-card__role">{props.role}</p>
        {props.tenure !== undefined && (
          <p className="buddy-card__tenure">{props.tenure}</p>
        )}
      </div>
    </div>

    {/* Quote */}
    {props.quote !== undefined && (
      <p className="buddy-card__quote">"{props.quote}"</p>
    )}

    {/* Contact links + CTA */}
    {(props.email !== undefined || props.phone !== undefined ||
      props.contactUrl !== undefined) && (
      <div className="buddy-card__contacts">
        {props.email !== undefined && (
          <a
            className="buddy-card__contact-link"
            href={`mailto:${props.email}`}
          >
            <MdEmail size={16} aria-hidden="true" />
            {props.email}
          </a>
        )}
        {props.phone !== undefined && (
          <a className="buddy-card__contact-link" href={`tel:${props.phone}`}>
            <MdPhone size={16} aria-hidden="true" />
            {props.phone}
          </a>
        )}
        {props.contactUrl !== undefined && (
          <a
            className="btn btn--secondary"
            href={props.contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginTop: "var(--space-1)", justifyContent: "center" }}
          >
            Book a meeting
          </a>
        )}
      </div>
    )}
  </div>
);

export default BuddyCard;
