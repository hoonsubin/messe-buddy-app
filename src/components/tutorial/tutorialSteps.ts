// Tutorial step definitions — shared between TutorialOverlay and PlayerCockpitPage.
// Each step highlights a target region via `targetSelector` (CSS selector) and
// renders an instructional card anchored near the highlight ring.
//
// Flow: Welcome → Map → Buddy → Resources → Profile (completes tutorial)

export interface TutorialStepData {
  readonly stepNumber: number; // 1-based display index
  readonly totalSteps: number;
  readonly title: string;
  readonly body: string;
  readonly ctaLabel: string;
  readonly targetSelector?: string; // CSS selector of the element to highlight
}

export const PLACEHOLDER_STEPS: ReadonlyArray<TutorialStepData> = [
  // Step 1 — Welcome (no highlight)
  {
    stepNumber: 1,
    totalSteps: 5,
    title: "Welcome to MesseBuddy",
    body:
      "Welcome to MesseBuddy. Here's what you'll do: complete missions across different office spaces to earn XP, unlock new areas, and get to know your team — all with help from your personal buddy.",
    ctaLabel: "Let's start",
    targetSelector: undefined,
  },
  // Step 2 — The Journey Map
  {
    stepNumber: 2,
    totalSteps: 5,
    title: "The Journey Map",
    body:
      "Each milestone is a chapter of your onboarding. Complete missions within a milestone to earn XP and unlock the next one.",
    ctaLabel: "Got it",
    targetSelector: '[data-testid="milestone-map-viewer"]',
  },
  // Step 3 — Your Buddy
  {
    stepNumber: 3,
    totalSteps: 5,
    title: "Your Buddy",
    body:
      "Your buddy is your guide for the first weeks. They'll help you navigate the company, answer questions, and make sure you feel at home. Reach out any time — they're here to help.",
    ctaLabel: "Got it",
    targetSelector: ".buddy-card",
  },
  // Step 4 — AI policy assistant
  {
    stepNumber: 4,
    totalSteps: 5,
    title: "Ask about policies",
    body:
      "Have a quick question about company policies — vacation, hours, expenses? Open the assistant at the top of the page for instant answers drawn straight from the official documents. For anything personal, your buddy is still your best contact. Hand-picked resources are in the block at the bottom.",
    ctaLabel: "Got it",
    targetSelector: ".assistant-chat-card",
  },
  // Step 5 — Complete Your Profile (final step — submitting the form completes the tutorial)
  {
    stepNumber: 5,
    totalSteps: 5,
    title: "Complete Your Profile",
    body:
      "Now let's set up your profile. Your buddy and team will use this to get to know you. Click the mandatory Profile Setup mission below — it only takes a few minutes.",
    ctaLabel: "Set up profile",
    targetSelector: '[data-testid="current-missions-list"]',
  },
];
