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
    navigate({ name: 'playerCockpit', sessionId: sessionId.trim(), playerId: MOCK_PLAYERS[0].id })
  }
  function handleCreate() {
    navigate({ name: 'adminCockpit', sessionId: sessionId.trim() || 'demo-2026' })
  }
  function handleRecover() {
    if (!recoveryKey.trim()) { setError('Enter your recovery key'); return }
    navigate({ name: 'playerCockpit', sessionId: 'demo-2026', playerId: MOCK_PLAYERS[0].id })
  }

  if (mode === 'joinPlayer') return (
    <div className="app-screen">
      <div className="topbar">
        <button className="topbar-back" onClick={() => { setMode('home'); setError('') }}>‹</button>
        <span className="topbar-title">Join Session</span>
      </div>
      <div className="p16">
        <div className="col mt8">
          <label className="text-xs bold uppercase text-muted">Session ID</label>
          <input className="input" placeholder="e.g. demo-2026" value={sessionId}
            onChange={e => { setSessionId(e.target.value); setError('') }} />
          <p className="text-xs text-muted">Your Game Maker will share this with you.</p>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <button className="btn btn-primary btn-full btn-lg mt12" onClick={handleJoin}>Join →</button>
        <p className="text-xs text-subtle" style={{ textAlign: 'center', marginTop: 8 }}>
          Demo: any Session ID opens the prototype
        </p>
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
        <div className="col mt8">
          <label className="text-xs bold uppercase text-muted">Session Name</label>
          <input className="input" placeholder="e.g. Messe München · June 2026" value={sessionId}
            onChange={e => setSessionId(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-full btn-lg mt12" onClick={handleCreate}>
          Create Session →
        </button>
        <button className="btn btn-ghost btn-full mt8" onClick={handleCreate}>
          Load from Template
        </button>
        <p className="text-xs text-subtle" style={{ textAlign: 'center', marginTop: 8 }}>
          Demo: opens admin cockpit directly
        </p>
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
        <div className="col mt8">
          <label className="text-xs bold uppercase text-muted">Recovery Key</label>
          <input className="input" placeholder="e.g. A3K9-XZ7M" value={recoveryKey}
            onChange={e => { setRecoveryKey(e.target.value); setError('') }} />
          <p className="text-xs text-muted">The 8-character key shown when you first joined.</p>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <button className="btn btn-primary btn-full btn-lg mt12" onClick={handleRecover}>Recover →</button>
        <p className="text-xs text-subtle" style={{ textAlign: 'center', marginTop: 8 }}>
          Demo: any key restores the demo session
        </p>
      </div>
    </div>
  )

  return (
    <div className="app-screen">
      {/* Hero */}
      <div className="land-hero">
        <div className="land-logo">MesseBuddy</div>
        <div className="land-logo-sub">Messe München · Onboarding</div>
        <div className="land-tag">Your journey through the first 90 days.</div>
      </div>

      <div className="p16">
        {/* Player entry */}
        <div style={{ marginBottom: 4, fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          For New Employees
        </div>
        <button className="btn btn-primary btn-full btn-lg" onClick={() => setMode('joinPlayer')}>
          Join Session →
        </button>
        <p className="text-xs text-muted mt4">Enter your Session ID or open your invite link.</p>

        <div className="divider" style={{ margin: '20px 0' }} />

        {/* GM entry */}
        <div style={{ marginBottom: 4, fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          For HR &amp; Team Leads
        </div>
        <button className="btn btn-ghost btn-full btn-lg" onClick={() => setMode('createGM')}>
          Create Session
        </button>

        <div className="divider" style={{ margin: '20px 0' }} />

        <button className="btn btn-ghost btn-full" onClick={() => setMode('recover')}>
          Recover my progress →
        </button>

        {/* Recovery key notice */}
        <div
          className="mt12"
          style={{
            background: 'var(--warn-bg)',
            border: '1px solid var(--warn-mid)',
            borderRadius: 'var(--r-sm)',
            padding: '10px 13px',
          }}
        >
          <div className="text-xs bold" style={{ color: 'var(--warn)', marginBottom: 3 }}>
            Save your Recovery Key
          </div>
          <div className="text-xs text-muted">
            Shown once on first join. Copy and save it — you'll need it if you switch devices.
          </div>
        </div>
      </div>
    </div>
  )
}
