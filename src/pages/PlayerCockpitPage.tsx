import { useState } from 'react'
import type { Navigate, Mission, ProgressEvent } from '../types.ts'
import {
  MOCK_MILESTONES, MOCK_MISSIONS, MOCK_BUDDY, MOCK_RESOURCES,
  getMissionsForMilestone, getProgressForPlayer, isMissionDone,
  getMilestoneById, TUTORIAL_STEPS, getPlayerById,
} from '../mockData.ts'
import TopBar from '../components/TopBar.tsx'
import MilestoneMapViewer from '../components/MilestoneMapViewer.tsx'
import MilestoneSidebarViewer from '../components/MilestoneSidebarViewer.tsx'
import MissionDetailPopup from '../components/MissionDetailPopup.tsx'
import QRDisplay from '../components/QRDisplay.tsx'
import TutorialOverlay from '../components/TutorialOverlay.tsx'
import BuddyCard from '../components/BuddyCard.tsx'
import ResourcesSection from '../components/ResourcesSection.tsx'
import TagBadge from '../components/TagBadge.tsx'

interface PlayerCockpitPageProps {
  sessionId: string
  playerId: string
  navigate: Navigate
}

export default function PlayerCockpitPage({ sessionId, playerId, navigate }: PlayerCockpitPageProps) {
  const player = getPlayerById(playerId)!
  const [progress, setProgress] = useState<ProgressEvent[]>(getProgressForPlayer(playerId))
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null)
  const [activeMission, setActiveMission] = useState<Mission | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [showTutorial, setShowTutorial] = useState(!player.tutorialComplete)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [resourceQuery, setResourceQuery] = useState('')

  // Active milestone: first inProgress one
  const currentMilestoneId = MOCK_MILESTONES.find(m => m.status === 'inProgress')?.id
  const currentMissions = MOCK_MISSIONS.filter(m => m.isInCurrentMissions)
  const totalXP = progress.reduce((sum, pe) => {
    const mission = MOCK_MISSIONS.find(m => m.id === pe.missionId)
    return sum + (mission?.xpValue ?? 0)
  }, 0)

  // Milestone progress for pips
  const pips = MOCK_MILESTONES.map(ms => {
    const missions = getMissionsForMilestone(ms.id)
    const allDone = missions.length > 0 && missions.every(m => isMissionDone(m.id, progress))
    return { ms, allDone }
  })

  function handleMissionClick(mission: Mission) {
    if (mission.type === 'form') {
      navigate({ name: 'formPage', missionId: mission.id, sessionId, playerId })
      return
    }
    setActiveMission(mission)
    setSelectedMilestoneId(null)
  }

  function handleMarkComplete() {
    if (!activeMission) return
    if (activeMission.type === 'form') return
    setActiveMission(null)
    setShowQR(true)
  }

  function handleQRValidated() {
    if (!activeMission) return
    const newEvent: ProgressEvent = {
      id: `pe-${Date.now()}`, playerId,
      missionId: activeMission.id, status: 'completed',
      validatedAt: new Date().toISOString(),
    }
    setProgress(prev => [...prev, newEvent])
    setShowQR(false)
    setActiveMission(null)
  }

  const selectedMilestone = selectedMilestoneId ? getMilestoneById(selectedMilestoneId) : null

  return (
    <div className="app-screen">
      <TopBar
        title="MesseBuddy"
        totalXP={totalXP}
      />

      {/* Progress strip */}
      <div className="ms-strip">
        <span style={{ fontSize: '0.72rem' }}>
          Day 23 of 90 · {MOCK_MILESTONES.find(m => m.id === currentMilestoneId)?.name ?? 'All done!'}
        </span>
        <div className="ms-pips">
          {pips.map(({ ms, allDone }) => (
            <div
              key={ms.id}
              className="ms-pip"
              style={{
                background: allDone ? 'var(--success)' : ms.status === 'inProgress' ? 'var(--brand)' : 'var(--border)',
              }}
            />
          ))}
        </div>
      </div>

      <div className="scroll">
        {/* Milestone map */}
        <MilestoneMapViewer
          milestones={MOCK_MILESTONES}
          currentMilestoneId={currentMilestoneId}
          onMilestoneClick={id => setSelectedMilestoneId(id)}
        />

        {/* Current missions */}
        <div className="sec-hdr">
          YOUR NEXT STEPS
          <span>
            {currentMilestoneId
              ? `${MOCK_MILESTONES.find(m => m.id === currentMilestoneId)?.name} · ${currentMissions.filter(m => isMissionDone(m.id, progress)).length}/${currentMissions.length} done`
              : ''
            }
          </span>
        </div>
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {currentMissions.map(mission => {
            const done = isMissionDone(mission.id, progress)
            return (
              <div
                key={mission.id}
                className={`mission-card${done ? ' done' : ''}`}
                onClick={() => handleMissionClick(mission)}
              >
                <div className={`mission-accent ${mission.type}`} />
                <div className="mission-body">
                  <div className="mission-title">{mission.title}</div>
                  <div className="mission-meta">
                    <TagBadge label={mission.type} variant={mission.type} />
                    {mission.tags.slice(0, 2).map(t => <TagBadge key={t} label={t} variant={t} />)}
                    <span className="mission-xp">+{mission.xpValue} XP</span>
                  </div>
                </div>
                {done
                  ? <div className="mission-check">✓</div>
                  : <div className="mission-check" style={{ color: 'var(--text-subtle)' }}>›</div>
                }
              </div>
            )
          })}
        </div>

        {/* Buddy card */}
        <div className="sec-hdr">YOUR BUDDY</div>
        <div style={{ padding: '8px 12px' }}>
          <BuddyCard {...MOCK_BUDDY} />
        </div>

        {/* Resources */}
        <div className="sec-hdr">RESOURCES</div>
        <div style={{ padding: '8px 12px 20px' }}>
          <ResourcesSection
            resources={MOCK_RESOURCES}
            searchQuery={resourceQuery}
            onSearch={setResourceQuery}
          />
        </div>
      </div>

      {/* Milestone sidebar panel */}
      {selectedMilestone && (
        <MilestoneSidebarViewer
          milestone={selectedMilestone}
          missions={getMissionsForMilestone(selectedMilestone.id)}
          progressEvents={progress}
          onClose={() => setSelectedMilestoneId(null)}
          onMissionClick={m => { handleMissionClick(m); }}
        />
      )}

      {/* Mission detail popup */}
      {activeMission && !showQR && (
        <MissionDetailPopup
          mission={activeMission}
          isDone={isMissionDone(activeMission.id, progress)}
          onClose={() => setActiveMission(null)}
          onMarkComplete={handleMarkComplete}
        />
      )}

      {/* QR Display */}
      {showQR && activeMission && (
        <QRDisplay
          missionTitle={activeMission.title}
          xpValue={activeMission.xpValue}
          onValidated={handleQRValidated}
          onClose={() => { setShowQR(false); setActiveMission(null) }}
        />
      )}

      {/* Tutorial overlay */}
      {showTutorial && (
        <TutorialOverlay
          steps={TUTORIAL_STEPS}
          currentStep={tutorialStep}
          onNext={() => setTutorialStep(s => s + 1)}
          onComplete={() => setShowTutorial(false)}
        />
      )}
    </div>
  )
}
