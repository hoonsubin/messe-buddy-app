import type { Milestone, MilestoneStatus } from '../types.ts'
import { MILESTONE_CONNECTIONS } from '../mockData.ts'

interface MilestoneMapViewerProps {
  milestones: Milestone[]
  currentMilestoneId?: string
  draggable?: boolean
  onMilestoneClick: (id: string) => void
}

// Build a lookup for SVG connections
function statusColor(status: MilestoneStatus): string {
  if (status === 'completed') return '#2f9e44'
  if (status === 'inProgress') return '#1971c2'
  return '#3a5a7a'
}

function isPathActive(from: Milestone, to: Milestone) {
  return from.status === 'completed' && (to.status === 'completed' || to.status === 'inProgress')
}

export default function MilestoneMapViewer({
  milestones, currentMilestoneId, draggable = false, onMilestoneClick,
}: MilestoneMapViewerProps) {
  const byId = Object.fromEntries(milestones.map(m => [m.id, m]))

  return (
    <div className="map-canvas">
      <div className="map-hint">Isometric floor plan · Custom bg image</div>

      {/* Connection lines */}
      <svg className="map-svg">
        {MILESTONE_CONNECTIONS.map(([fromId, toId]) => {
          const from = byId[fromId]
          const to   = byId[toId]
          if (!from || !to) return null
          const active = isPathActive(from, to)
          const color = active ? statusColor(from.status) : '#142848'
          const strokeWidth = active ? 2 : 1
          const strokeDash = to.status === 'upcoming' || to.status === 'locked' ? '4,3' : undefined
          return (
            <line
              key={`${fromId}-${toId}`}
              x1={`${from.xPercent}%`} y1={`${from.yPercent}%`}
              x2={`${to.xPercent}%`}   y2={`${to.yPercent}%`}
              stroke={color} strokeWidth={strokeWidth}
              strokeDasharray={strokeDash}
              opacity={active ? 1 : 0.6}
            />
          )
        })}
      </svg>

      {/* Milestone nodes */}
      {milestones.map(ms => (
        <MilestoneNode
          key={ms.id}
          milestone={ms}
          isActive={ms.id === currentMilestoneId}
          draggable={draggable}
          onClick={() => ms.status !== 'locked' && onMilestoneClick(ms.id)}
        />
      ))}

      {/* Legend */}
      <div className="map-legend">
        {[
          { label: 'done', color: '#2f9e44' },
          { label: 'active', color: '#1971c2' },
          { label: 'next', color: '#2D4B6E' },
          { label: 'locked', color: '#374151' },
        ].map(l => (
          <div key={l.label} className="leg-item">
            <div className="leg-dot" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Internal node component ───────────────────────────────────────────────────

interface MilestoneNodeProps {
  milestone: Milestone
  isActive: boolean
  draggable: boolean
  onClick: () => void
}

function MilestoneNode({ milestone: ms, isActive, onClick }: MilestoneNodeProps) {
  const classNames = ['ms-node', ms.status, isActive ? 'active' : ''].filter(Boolean).join(' ')
  const progressPct = ms.xpThreshold > 0 ? (ms.earnedXP / ms.xpThreshold) * 100 : 0

  const fillColor =
    ms.status === 'completed'  ? '#2f9e44' :
    ms.status === 'inProgress' ? '#1971c2' :
    ms.status === 'upcoming'   ? '#2D4B6E' : 'transparent'

  // Short label: hall number only
  const shortLabel = ms.name.split(' ').slice(0, 2).join(' ')

  return (
    <div
      className={classNames}
      style={{ left: `${ms.xPercent}%`, top: `${ms.yPercent}%` }}
      onClick={onClick}
      title={`${ms.name} · ${ms.subtitle}`}
    >
      <div className="ms-room">
        <div
          className="ms-room-fill"
          style={{ width: `${progressPct}%`, background: fillColor }}
        />
        {ms.status === 'completed' ? '✓' : shortLabel.replace('Hall ', '')}
      </div>
      {isActive && <div className="you-here">You are here</div>}
      <div className="ms-lbl">{ms.name}</div>
    </div>
  )
}
