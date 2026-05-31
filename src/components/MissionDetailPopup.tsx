import type { Mission } from '../types.ts'
import TagBadge from './TagBadge.tsx'

interface MissionDetailPopupProps {
  mission: Mission
  isDone: boolean
  isSubmitting?: boolean
  onClose: () => void
  onMarkComplete: () => void
}

function Stars({ n, max = 5 }: { n: number; max?: number }) {
  return (
    <span className="stars">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`star ${i < n ? 'on' : 'off'}`}>★</span>
      ))}
    </span>
  )
}

export default function MissionDetailPopup({
  mission, isDone, isSubmitting, onClose, onMarkComplete,
}: MissionDetailPopupProps) {
  const typeLabel = { text: 'Read & Confirm', link: 'Visit Link', form: 'Fill Form' }[mission.type]

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-panel" onClick={e => e.stopPropagation()}>

        <div className="panel-hdr">
          <div>
            <h2 style={{ fontSize: '1.05rem', marginBottom: 4 }}>{mission.title}</h2>
            <div className="row gap8" style={{ flexWrap: 'wrap' }}>
              <TagBadge label={mission.type} variant={mission.type} />
              {mission.tags.map(t => <TagBadge key={t} label={t} variant={t} />)}
            </div>
          </div>
          <button type="button" className="panel-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="row sb">
            <div className="col gap4">
              <span className="text-xs text-muted">Difficulty</span>
              <Stars n={mission.difficulty} />
            </div>
            <div className="col gap4" style={{ alignItems: 'flex-end' }}>
              <span className="text-xs text-muted">Reward</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand)' }}>+{mission.xpValue} XP</span>
            </div>
          </div>
          {mission.suggestedDueDate && (
            <div className="text-xs text-muted mt8">
              Suggested due: {mission.suggestedDueDate}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="text-sm text-muted" style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
            {mission.body}
          </div>
          {mission.externalUrl && (
            <a
              href={mission.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-full mt12"
              style={{ textDecoration: 'none' }}
              onClick={e => e.stopPropagation()}
            >
              Open Link ↗
            </a>
          )}
        </div>

        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isDone ? (
            <div
              className="btn btn-full"
              style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)', cursor: 'default' }}
            >
              ✓ Completed
            </div>
          ) : mission.type === 'form' ? (
            <>
              <div className="text-xs text-muted" style={{ textAlign: 'center' }}>
                This is a form mission — fill it in and submit. No QR scan needed.
              </div>
              <button type="button"
                className="btn btn-primary btn-full"
                onClick={onMarkComplete}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting…' : `${typeLabel} →`}
              </button>
            </>
          ) : (
            <>
              <div className="text-xs text-muted" style={{ textAlign: 'center' }}>
                After completing, your Game Maker will scan your QR code to confirm.
              </div>
              <button type="button"
                className="btn btn-primary btn-full"
                onClick={onMarkComplete}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Loading…' : `Mark Complete → Get QR Code`}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
