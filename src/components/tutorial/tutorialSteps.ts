// Tutorial step definitions — shared between TutorialOverlay and PlayerCockpitPage.
// Each step highlights a target region via `targetSelector` (CSS selector) and
// renders an instructional card anchored near the highlight ring.

export interface TutorialStepData {
  readonly stepNumber: number; // 1-based display index
  readonly totalSteps: number;
  readonly title: string;
  readonly body: string;
  readonly ctaLabel: string;
  readonly targetSelector?: string; // CSS selector of the element to highlight
}

export const PLACEHOLDER_STEPS: ReadonlyArray<TutorialStepData> = [
  {
    stepNumber: 1,
    totalSteps: 5,
    title: "Welcome to MesseBuddy",
    body:
      "Welcome to MesseBuddy. Here's what you'll do: complete missions across different office spaces to earn XP, unlock new areas, and get to know your team — all with help from your personal buddy.",
    ctaLabel: "Let's start",
    targetSelector: undefined,
  },
  {
    stepNumber: 2,
    totalSteps: 5,
    title: "Your Profile",
    body:
      "First, tell us a bit about yourself. Your buddy and team will use this to get to know you.",
    ctaLabel: "Set up profile",
    targetSelector: '[data-testid="current-missions-list"]',
  },
  {
    stepNumber: 3,
    totalSteps: 5,
    title: "The Journey Map",
    body:
      "Each milestone is a chapter of your onboarding. Complete missions within a milestone to earn XP and unlock the next one.",
    ctaLabel: "Got it",
    targetSelector: '[data-testid="milestone-map-viewer"]',
  },
  {
    stepNumber: 4,
    totalSteps: 5,
    title: "Your Buddy",
    body:
      "Your buddy is your guide for the first weeks. They'll help you navigate the company, answer questions, and make sure you feel at home. Reach out any time — they're here to help.",
    ctaLabel: "Got it",
    targetSelector: ".buddy-card",
  },
  {
    stepNumber: 5,
    totalSteps: 5,
    title: "Resources & AI Q&A",
    body:
      "Browse hand-picked resources for your first weeks. Have a question? Use the AI Q&A tab — it's trained on company policies and can give you instant answers.",
    ctaLabel: "Start exploring",
    targetSelector: ".resources-chat",
  },
];
