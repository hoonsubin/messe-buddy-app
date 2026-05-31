import { useState } from 'react'
import type { Navigate } from '../types'
import { MOCK_PLAYERS } from '../mockData'

interface LandingPageProps { navigate: Navigate }

type Mode = 'home' | 'joinPlayer' | 'createGM' | 'recover'

export default function LandingPage({ navigate }: LandingPageProps) {
  const [mode, setMode] = useState<Mode>('home')
  const [sessionId, setSessionId] = useState('demo-2026')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [error, setError] = useState('')

  function handleJoin() {
    if (!sessionId.trim()) { setError('Enter a Session ID'); return }
    // Prototype: go straight to player cockpit with first player
    navigate({ name: 'playerCockpit', sessionId: sessionId.trim(), playerId: MOCK_PLAYERS[0].id })
  }

  function handleCreate() {
    navigate({ name: 'adminCockpit', sessionId: sessionId.trim() || 'demo-2026' })
  }

  function handleRecover() {
    if (!recoveryKey.trim()) { setError('Enter your recovery key'); return }
    // Prototype: any key works
    navigate({ name: 'playerCockpit', sessionId: 'demo-2026', playerId: MOCK_PLAYERS[0].id })
  }

  if (mode === 'joinPlayer') return (
    <div className="app-screen">
      <div className="topbar">
        <button className="topbar-back" onClick={() => { setMode('home'); setError('') }}>‹</button>
        <span className="topbar-title">Join Session</span>
      </div>
      <div className="p16">
        <div className="col" style={{ marginBottom: 8 }}>
          <label className="text-xs text-muted bold">Session ID</label>
          <input
            className="input"
            placeholder="e.g. demo-2026"
            value={sessionId}
            onChange={e => { setSessionId(e.target.value); setError('') }}
          />
          <p className="text-xs text-muted mt4">Your Game Maker will share this with you.</p>
        </div>
        {error && <div className="text-xs" style={{ color: 'var(--danger)' }}>{error}</div>}
        <button className="btn btn-primary btn-full btn-lg mt8" onClick={handleJoin}>
          Join →
        </button>
        <div className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 8 }}>
          Demo: any Session ID works
        </div>
      </div>
    </div>
  )

  if (mode === 'createGM') return (
    <div className="app-screen">
      <div className="topbar">
        <button className="topbar-back" onClick={() => { setMode('home'); setError('') }}>‹</button>
        <span className="topbar-title">Create Session</span>
      </div>
      <div className="p16">
        <div className="col" style={{ marginBottom: 8 }}>
          <label className="text-xs text-muted bold">Session Name</label>
          <input
            className="input"
            placeholder="e.g. Messe München · June 2026"
            value={sessionId}
            onChange={e => setSessionId(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-full btn-lg mt8" onClick={handleCreate}>
          Create Session →
        </button>
        <button className="btn btn-ghost btn-full mt8" onClick={handleCreate}>
          Load from Template
        </button>
        <div className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 8 }}>
          Demo: opens admin view directly
        </div>
      </div>
    </div>
  )

  if (mode === 'recover') return (
    <div className="app-screen">
      <div className="topbar">
        <button className="topbar-back" onClick={() => { setMode('home'); setError('') }}>‹</button>
        <span className="topbar-title">Recover Progress</span>
      </div>
      <div className="p16">
        <div className="col" style={{ marginBottom: 8 }}>
          <label className="text-xs text-muted bold">Recovery Key</label>
          <input
            className="input"
            placeholder="e.g. A3K9-XZ7M"
            value={recoveryKey}
            onChange={e => { setRecoveryKey(e.target.value); setError('') }}
          />
          <p className="text-xs text-muted mt4">The 8-character key shown when you first joined.</p>
        </div>
        {error && <div className="text-xs" style={{ color: 'var(--danger)' }}>{error}</div>}
        <button className="btn btn-primary btn-full btn-lg mt8" onClick={handleRecover}>
          Recover →
        </button>
        <div className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 8 }}>
          Demo: any key restores the demo session
        </div>
      </div>
    </div>
  )

  // ── Home ──────────────────────────────────────────────────────────────────
  return (
    <div className="app-screen">
      <div className="land-hero">
        <div className="land-logo">MesseBuddy</div>
        <div className="land-tag">Your first 90 days at Messe München</div>
      </div>

      <div className="p16">
        <div style={{ marginBottom: 8, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--muted)' }}>
          FOR NEW EMPLOYEES
        </div>
        <button className="btn btn-primary btn-full btn-lg" onClick={() => setMode('joinPlayer')}>
          Join Session →
        </button>
        <p className="text-xs text-muted mt4">Enter your Session ID or open your invite link.</p>

        <div className="divider" style={{ margin: '20px 0' }} />

        <div style={{ marginBottom: 8, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--muted)' }}>
          FOR HR &amp; TEAM LEADS
        </div>
        <button className="btn btn-ghost btn-full btn-lg" onClick={() => setMode('createGM')}>
          Create Session
        </button>

        <div className="divider" style={{ margin: '20px 0' }} />

        <button className="btn btn-ghost btn-full" onClick={() => setMode('recover')}>
          Recover my progress →
        </button>

        <div
          className="mt12"
          style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}
        >
          <div className="text-xs bold" style={{ color: 'var(--warn)', marginBottom: 4 }}>Save your Recovery Key!</div>
          <div className="text-xs text-muted">Shown once on first join. Copy and save it somewhere safe.</div>
        </div>
      </div>
    </div>
  )
}
