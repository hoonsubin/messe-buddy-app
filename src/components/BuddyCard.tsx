import type { BuddyProfile } from '../types'

interface BuddyCardProps extends BuddyProfile {}

export default function BuddyCard({ name, role, tenure, contactUrl }: BuddyCardProps) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase()

  return (
    <div className="buddy-card">
      <div className="avatar lg" style={{ background: '#d0bfff', color: '#6741d9' }}>
        {initials}
      </div>
      <div className="buddy-info flex1">
        <div className="label" style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', color: '#4dd0c4', marginBottom: 3 }}>
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
