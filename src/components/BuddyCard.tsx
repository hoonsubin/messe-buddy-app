import type { BuddyProfile } from '../types.ts'

type BuddyCardProps = BuddyProfile

export default function BuddyCard({ name, role, tenure, contactUrl }: BuddyCardProps) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase()

  return (
    <div className="buddy-card">
      <div className="avatar lg" style={{ background: 'var(--brand-bg)', color: 'var(--brand)' }}>
        {initials}
      </div>
      <div className="buddy-info flex1">
        <div className="label" style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', color: "rgba(150,200,255,0.6)", marginBottom: 3 }}>
          YOUR ONBOARDING BUDDY
        </div>
        <div className="buddy-name">{name}</div>
        <div className="buddy-meta">{role}{tenure ? ` · ${tenure}` : ''}</div>
      </div>
      {contactUrl && (
        <a href={contactUrl} className="buddy-btn" target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
          Contact ↗
        </a>
      )}
    </div>
  )
}
