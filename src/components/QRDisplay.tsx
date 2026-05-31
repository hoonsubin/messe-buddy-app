import { useEffect, useState } from 'react'

interface QRDisplayProps {
  missionTitle: string
  xpValue: number
  onValidated: () => void
  onClose: () => void
}

// Deterministic QR-like grid pattern
const GRID = Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9), c = i % 9
  // Finder pattern top-left
  if ((r < 3 && c < 3) || (r === 0 || r === 2) && c < 3 || r < 3 && (c === 0 || c === 2)) return 1
  // Finder pattern top-right
  if ((r < 3 && c > 5) || (r === 0 || r === 2) && c > 5 || r < 3 && (c === 6 || c === 8)) return 1
  return (r * 3 + c * 7 + 13) % 3 === 0 ? 1 : 0
})

export default function QRDisplay({ missionTitle, xpValue, onValidated, onClose }: QRDisplayProps) {
  const [simulating, setSimulating] = useState(false)

  // Prototype: simulate GM scan after a few seconds if user clicks
  function simulateScan() {
    setSimulating(true)
    setTimeout(() => { onValidated() }, 1400)
  }

  return (
    <div className="fullscreen" style={{ background: '#0f1923' }}>
      <div className="qr-banner">Show this to your Game Maker</div>

      <div className="qr-screen">
        <div className="qr-box">
          {/* Fake QR pattern */}
          <div className="qr-grid">
            {GRID.map((v, i) => (
              <div key={i} className="qr-cell" style={{ opacity: v ? 1 : 0 }} />
            ))}
          </div>
        </div>

        <div className="qr-info">
          <div className="qr-title">{missionTitle}</div>
          <div className="qr-meta">+{xpValue} XP · Awaiting scan</div>
        </div>

        <div className="sse-bar">
          {simulating
            ? <span>✓ Scanned! Processing…</span>
            : <><span className="sse-dot" />Waiting for Game Maker scan… (SSE active)</>
          }
        </div>

        {/* Prototype helper */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!simulating && (
            <button className="btn btn-success btn-full" onClick={simulateScan}>
              [Demo] Simulate GM Scan
            </button>
          )}
          <button
            className="btn btn-ghost btn-full"
            onClick={onClose}
            style={{ background: '#1c2b3a', color: '#6c757d', border: '1px solid #2d4a6a' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
