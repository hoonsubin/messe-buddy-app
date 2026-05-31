import { useState } from 'react'
import type { Navigate } from '../types'
import TopBar from '../components/TopBar'

interface QRScannerPageProps {
  sessionId: string
  navigate: Navigate
}

type ScanState = 'idle' | 'scanned' | 'confirmed'

export default function QRScannerPage({ sessionId, navigate }: QRScannerPageProps) {
  const [scanState, setScanState] = useState<ScanState>('idle')

  function handleSimulateScan() { setScanState('scanned') }
  function handleConfirm() { setScanState('confirmed') }

  return (
    <div className="app-screen">
      <TopBar
        title="QR Scanner"
        onBack={() => navigate({ name: 'adminCockpit', sessionId })}
      />

      <div className="p16" style={{ flex: 1 }}>
        {/* Camera viewport */}
        <div
          style={{
            background: '#1a1a2e', borderRadius: 'var(--radius)', width: '100%',
            aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', color: '#74c0fc', fontSize: '0.9rem', marginBottom: 16,
          }}
        >
          {/* Corner brackets */}
          {[
            { top: 12, left: 12, borderRight: 'none', borderBottom: 'none' },
            { top: 12, right: 12, borderLeft: 'none', borderBottom: 'none' },
            { bottom: 12, left: 12, borderRight: 'none', borderTop: 'none' },
            { bottom: 12, right: 12, borderLeft: 'none', borderTop: 'none' },
          ].map((style, i) => (
            <div
              key={i}
              style={{
                position: 'absolute', width: 28, height: 28,
                border: '3px solid var(--primary)', ...style,
              }}
            />
          ))}
          {scanState === 'idle'
            ? 'Point at player\'s QR code'
            : scanState === 'scanned'
            ? <span style={{ color: '#2f9e44' }}>QR scanned ✓</span>
            : <span style={{ color: '#2f9e44' }}>✓ Confirmed!</span>
          }
        </div>

        {/* Scan result */}
        <div
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 16, marginBottom: 16,
          }}
        >
          <div className="text-xs text-muted bold" style={{ marginBottom: 8, letterSpacing: '0.06em' }}>
            SCAN RESULT
          </div>
          <div className="divider" style={{ marginBottom: 10 }} />
          {scanState === 'idle' ? (
            <div className="empty" style={{ padding: '8px 0' }}>
              Waiting for QR code…
            </div>
          ) : (
            <>
              <div className="row sb" style={{ marginBottom: 8 }}>
                <div>
                  <div className="text-xs text-muted">Player</div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Alex Meyer</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="text-xs text-muted">XP</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>+30</div>
                </div>
              </div>
              <div className="text-xs text-muted">Mission</div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem', marginTop: 2 }}>
                Meet Your Manager
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {scanState === 'idle' && (
          <button className="btn btn-primary btn-full btn-lg" onClick={handleSimulateScan}>
            [Demo] Simulate Scan
          </button>
        )}
        {scanState === 'scanned' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-success flex1 btn-lg" onClick={handleConfirm}>
              ✓ Confirm
            </button>
            <button className="btn btn-danger flex1 btn-lg" onClick={() => setScanState('idle')}>
              ✕ Reject
            </button>
          </div>
        )}
        {scanState === 'confirmed' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', color: 'var(--success)', fontWeight: 600 }}
            >
              ✓ Mission confirmed! +30 XP awarded
            </div>
            <div className="text-xs text-muted">
              Player's QR screen will close automatically via SSE push.
            </div>
            <button className="btn btn-ghost btn-full" onClick={() => setScanState('idle')}>
              Scan another QR
            </button>
          </div>
        )}

        {/* Session info */}
        <div className="text-xs text-muted mt12" style={{ textAlign: 'center' }}>
          Session: {sessionId} · GM view
        </div>
      </div>
    </div>
  )
}
