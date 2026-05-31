import { useState } from 'react'
import type { Milestone, Mission, ProgressEvent } from '../types.ts'
import TagBadge from './TagBadge.tsx'
import { isMissionDone } from '../mockData.ts'

interface MilestoneSidebarViewerProps {
  milestone: Milestone
  missions: Mission[]
  progressEvents: ProgressEvent[]
  onClose: () => void
  onMissionClick: (mission: Mission) => void
}

const TABS = ['Tasks', 'FAQs', 'People', 'Resources'] as const
type Tab = typeof TABS[number]

export default function MilestoneSidebarViewer({
  milestone, missions, progressEvents, onClose, onMissionClick,
}: MilestoneSidebarViewerProps) {
  const [tab, setTab] = useState<Tab>('Tasks')
  const doneMissions = missions.filter(m => isMissionDone(m.id, progressEvents))
  const progressPct = Math.round((milestone.earnedXP / milestone.xpThreshold) * 100)

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="panel-hdr">
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>
              {milestone.subtitle}
            </div>
            <h2 style={{ fontSize: '1.1rem' }}>{milestone.name}</h2>
            <div className="row gap8 mt4">
              <span className="text-xs text-muted">{missions.length} tasks</span>
              <span className="text-xs text-muted">·</span>
              <span className="text-xs" style={{ color: 'var(--brand)', fontWeight: 600 }}>
                {milestone.earnedXP} / {milestone.xpThreshold} XP
              </span>
            </div>
            <div className="pbar mt4" style={{ width: 200 }}>
              <div
                className={`pbar-fill ${milestone.status === 'completed' ? 'success' : 'primary'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <button type="button" className="panel-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map(t => (
            <button type="button" key={t} className={`tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
              {t === 'Tasks' ? `Tasks ${missions.length}` : t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tab === 'Tasks' && (
            missions.length === 0
              ? <div className="empty">No tasks in this milestone</div>
              : missions.map(m => {
                  const done = isMissionDone(m.id, progressEvents)
                  return (
                    <div
                      key={m.id}
                      className={`mission-card${done ? ' done' : ''}`}
                      onClick={() => onMissionClick(m)}
                    >
                      <div className={`mission-accent ${m.type}`} />
                      <div className="mission-body">
                        <div className="mission-title">{m.title}</div>
                        <div className="mission-meta">
                          <TagBadge label={m.type} variant={m.type} />
                          {m.tags.map(t => <TagBadge key={t} label={t} variant={t} />)}
                          <span className="mission-xp">+{m.xpValue} XP</span>
                        </div>
                      </div>
                      {done
                        ? <div className="mission-check">✓</div>
                        : <div className="mission-check" style={{ color: 'var(--text-subtle)' }}>›</div>
                      }
                    </div>
                  )
                })
          )}
          {tab === 'FAQs' && (
            <div className="empty">FAQs for this milestone will appear here.</div>
          )}
          {tab === 'People' && (
            <div className="empty">
              <div style={{ marginBottom: 12 }}>Key contacts for this milestone:</div>
              <div className="row" style={{ gap: 12, justifyContent: 'center' }}>
                {['Your Manager', 'IT Support', 'HR Team'].map(p => (
                  <div key={p} style={{ textAlign: 'center' }}>
                    <div className="avatar md" style={{ margin: '0 auto 4px' }}>{p[0]}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === 'Resources' && (
            <div className="empty">Resources specific to {milestone.name} will appear here.</div>
          )}
        </div>

        {/* Progress summary */}
        <div style={{ padding: '10px 14px 16px', borderTop: '1px solid var(--border)', marginTop: 4 }}>
          <div className="row sb text-sm text-muted">
            <span>{doneMissions.length} of {missions.length} done</span>
            <span style={{ color: 'var(--brand)', fontWeight: 600 }}>{progressPct}% complete</span>
          </div>
        </div>

      </div>
    </div>
  )
}
