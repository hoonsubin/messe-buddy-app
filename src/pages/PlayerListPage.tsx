import type { Navigate } from '../types.ts'
import { MOCK_PLAYERS, MOCK_MILESTONES } from '../mockData.ts'
import TopBar from '../components/TopBar.tsx'

interface PlayerListPageProps {
  sessionId: string
  navigate: Navigate
}

export default function PlayerListPage({ sessionId, navigate }: PlayerListPageProps) {
  const maxXP = MOCK_MILESTONES.length * 100

  return (
    <div className="app-screen">
      <TopBar
        title="← Players"
        onBack={() => navigate({ name: 'adminCockpit', sessionId })}
      />

      {/* Filter strip */}
      <div style={{ padding: '8px 12px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="row sb">
          <span className="text-sm text-muted">{MOCK_PLAYERS.length} players joined</span>
          <select className="input" style={{ width: 'auto', fontSize: '0.8rem', padding: '5px 8px' }}>
            <option>Sort: Name</option>
            <option>Sort: XP</option>
            <option>Sort: Start Date</option>
          </select>
        </div>
        <input className="input mt4" placeholder="Search players..." />
      </div>

      <div className="scroll">
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MOCK_PLAYERS.map(player => {
            const pct = Math.round((player.totalXP / maxXP) * 100)
            const statusColor =
              pct >= 50 ? 'var(--success)' :
              pct >= 20 ? 'var(--brand)' :
              'var(--danger)'
            const statusLabel =
              pct >= 50 ? 'Ahead' :
              pct >= 20 ? 'On track' :
              'Needs attention'

            return (
              <div
                key={player.id}
                className="player-card"
                onClick={() => navigate({ name: 'playerDetail', sessionId, playerId: player.id })}
              >
                <div className="avatar md" style={{ background: "var(--brand-bg)", color: "var(--brand)" }}>
                  {player.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div className="flex1">
                  <div className="player-name">{player.name}</div>
                  <div className="player-role">{player.jobTitle}</div>
                  <div style={{ marginTop: 6 }}>
                    <div
                      className="pbar"
                      style={{ width: '100%', marginBottom: 3 }}
                    >
                      <div
                        className="pbar-fill"
                        style={{ width: `${pct}%`, background: statusColor }}
                      />
                    </div>
                    <span className="text-xs text-muted">{player.totalXP}/{maxXP} XP</span>
                  </div>
                </div>
                <div>
                  <span
                    className="tag"
                    style={{
                      borderColor: statusColor,
                      color: statusColor,
                      background: statusColor === 'var(--danger)' ? 'var(--danger-bg)' :
                                  statusColor === 'var(--success)' ? 'var(--success-bg)' : 'var(--brand-bg)',
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
                <span style={{ color: 'var(--text-subtle)', fontSize: '1rem' }}>›</span>
              </div>
            )
          })}
        </div>

        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="text-xs text-muted" style={{ textAlign: 'center' }}>
            Session: {sessionId} · 0 pending validations
          </div>
        </div>
      </div>
    </div>
  )
}
