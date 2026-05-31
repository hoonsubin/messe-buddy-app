import type { TutorialStep } from '../types'

interface TutorialOverlayProps {
  steps: TutorialStep[]
  currentStep: number
  onNext: () => void
  onComplete: () => void
}

export default function TutorialOverlay({ steps, currentStep, onNext, onComplete }: TutorialOverlayProps) {
  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1

  return (
    <div className="tutorial-bg">
      <div className="tutorial-card">
        <div className="tutorial-step">Step {currentStep + 1} of {steps.length}</div>
        <div className="tutorial-title">{step.title}</div>
        <div className="tutorial-body">{step.body}</div>
        <div className="tutorial-footer">
          <button className="tutorial-skip" onClick={onComplete}>
            Skip tutorial
          </button>
          <div className="tutorial-dots">
            {steps.map((_, i) => (
              <div key={i} className={`t-dot${i === currentStep ? ' on' : ''}`} />
            ))}
          </div>
          <button className="tutorial-next" onClick={isLast ? onComplete : onNext}>
            {isLast ? 'Get started →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
