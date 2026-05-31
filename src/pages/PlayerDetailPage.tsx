import type { Navigate } from '../types'
import { getPlayerById, MOCK_MILESTONES, getMissionsForMilestone, MOCK_BUDDY } from '../mockData'
import TopBar from '../components/TopBar'
import BuddyCard from '../components/BuddyCard'

interface PlayerDetailPageProps {
  sessionId: string
  playerId: string
  navigate: Navigate
}

export default function PlayerDetailPage({ sessionId, playerId, navigate }: PlayerDetailPageProps) {
  const player = getPlayerById(playerId)!
  const maxXP = MOCK_MILESTONES.length * 100
  const overallPct = Math.round((player.totalXP / maxXP) * 100)
  const initials = player.name.split(' ').map(w => w[0]).join('')

  const msColors: Record<string, string> = {
    completed: 'var(--success)', inProgress: 'var(--primary)',
    upcoming: 'var(--subtle)', locked: '#374151',
  }

  return (
    <div className="app-screen">
      <TopBar
        title={`← ${player.name}`}
        onBack={() => navigate({ name: 'playerList', sessionId })}
        action={{ label: 'Open QR', onClick: () => navigate({ name: 'qrScanner', sessionId }), variant: 'green' }}
      />

      <div className="scroll">
        {/* Profile header */}
        <div style={{ background: '#1c2b3a', padding: '14px 16px' }}>
          <div className="row gap8">
            <div className="avatar lg" style={{ background: '#a5d8ff', color: '#1864ab', width: 56, height: 56, fontSize: '1.1rem' }}>
              {initials}
            </div>
            <div className="flex1">
              <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>{player.name}</div>
              <div style={{ fontSize: '0.78rem', color: '#74c0fc', marginTop: 2 }}>
                {player.jobTitle} · {player.team}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#4a6a8a', marginTop: 2 }}>
                Start: {player.startDate} · {player.location}
              </div>
            </div>
            <div style={{ background: '#2d4a6a', borderRadius: 20, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, color: '#74c0fc' }}>
              {player.totalXP}/{maxXP} XP
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <div className="pbar">
              <div className="pbar-fill primary" style={{ width: `${overallPct}%` }} />
            </div>
            <div style={{ fontSize: '0.68rem', color: '#74c0fc', marginTop: 4 }}>
              {overallPct}% overall progress · Day 23 of 90
            </div>
          </div>
        </div>

        {/* Milestone progress */}
        <div className="sec-hdr">MILESTONE PROGRESS</div>
        <div style={{ padding: '8px 16px' }}>
          {MOCK_MILESTONES.map(ms => {
            const missions = getMissionsForMilestone(ms.id)
            const col = msColors[ms.status]
            const msPct = ms.xpThreshold > 0 ? Math.round((ms.earnedXP / ms.xpThreshold) * 100) : 0
            return (
              <div key={ms.id} className="ms-row">
                <div className="ms-dot" style={{ background: col }} />
                <div className="ms-row-name" style={{ color: ms.status === 'locked' || ms.status === 'upcoming' ? 'var(--muted)' : 'var(--text)' }}>
                  {ms.name}
                  <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                    {ms.subtitle} · {missions.length} tasks
                  </div>
                </div>
                <div className="ms-row-xp" style={{ color: col }}>{ms.earnedXP}/{ms.xpThreshold}</div>
              </div>
            )
          })}
        </div>

        {/* Buddy */}
        <div className="sec-hdr">BUDDY ASSIGNED</div>
        <div style={{ padding: '8px 12px' }}>
          <BuddyCard {...MOCK_BUDDY} />
          <button
            className="btn btn-ghost btn-full mt8"
            onClick={() => alert('Change buddy (prototype)')}
          >
            Change Buddy
          </button>
        </div>

        {/* Pending QR validation */}
        <div className="sec-hdr">
          PENDING QR VALIDATION
          <span>1 waiting</span>
        </div>
        <div style={{ padding: '8px 12px 20px' }}>
          <div
            style={{
              background: 'var(--warn-bg)', border: '1px solid var(--warn)',
              borderRadius: 'var(--radius-sm)', padding: '12px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>Meet Your Manager</div>
              <div className="text-xs text-muted mt4">Awaiting GM scan · Hall A4 · +30 XP</div>
            </div>
            <button
              className="btn btn-success btn-sm"
              onClick={() => navigate({ name: 'qrScanner', sessionId })}
            >
              Scan QR →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
