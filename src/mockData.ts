import type {
  BuddyProfile,
  Milestone,
  Mission,
  Player,
  ProgressEvent,
  Resource,
  Session,
  TutorialStep,
} from "./types.ts";

export const MOCK_SESSION: Session = {
  id: "demo-2026",
  name: "Messe München · Onboarding 2026",
  gameMakerId: "gm-hoon",
};

// ─── Milestones ───────────────────────────────────────────────────────────────
// Positions designed to match the isometric Messe München floor plan (WEST→OST)

export const MOCK_MILESTONES: Milestone[] = [
  {
    id: "ms-entrance",
    sessionId: "demo-2026",
    name: "WEST Entrance",
    subtitle: "Day 1",
    xPercent: 12,
    yPercent: 28,
    order: 0,
    status: "completed",
    earnedXP: 100,
    xpThreshold: 100,
  },
  {
    id: "ms-a1",
    sessionId: "demo-2026",
    name: "Hall A1",
    subtitle: "Get Set Up · Week 1",
    xPercent: 26,
    yPercent: 42,
    order: 1,
    status: "completed",
    earnedXP: 100,
    xpThreshold: 100,
  },
  {
    id: "ms-a2",
    sessionId: "demo-2026",
    name: "Hall A2",
    subtitle: "Meet Your Team · Week 2-3",
    xPercent: 20,
    yPercent: 60,
    order: 2,
    status: "completed",
    earnedXP: 100,
    xpThreshold: 100,
  },
  {
    id: "ms-a3",
    sessionId: "demo-2026",
    name: "Hall A3",
    subtitle: "Learn the Basics · Week 2-3",
    xPercent: 43,
    yPercent: 36,
    order: 3,
    status: "completed",
    earnedXP: 100,
    xpThreshold: 100,
  },
  {
    id: "ms-a4",
    sessionId: "demo-2026",
    name: "Hall A4",
    subtitle: "Explore Your Role · Week 4-6",
    xPercent: 52,
    yPercent: 54,
    order: 4,
    status: "inProgress",
    earnedXP: 0,
    xpThreshold: 100,
  },
  {
    id: "ms-a5",
    sessionId: "demo-2026",
    name: "Hall A5",
    subtitle: "Build Your Network · Week 4-6",
    xPercent: 66,
    yPercent: 38,
    order: 5,
    status: "upcoming",
    earnedXP: 0,
    xpThreshold: 100,
  },
  {
    id: "ms-a6",
    sessionId: "demo-2026",
    name: "Hall A6",
    subtitle: "Make Your Contribution · Week 6-8",
    xPercent: 67,
    yPercent: 57,
    order: 6,
    status: "upcoming",
    earnedXP: 0,
    xpThreshold: 100,
  },
  {
    id: "ms-fest",
    sessionId: "demo-2026",
    name: "Festhalle",
    subtitle: "Welcome to the Family · Day 90",
    xPercent: 83,
    yPercent: 67,
    order: 7,
    status: "locked",
    earnedXP: 0,
    xpThreshold: 100,
  },
];

// Milestone connection graph (non-linear paths)
export const MILESTONE_CONNECTIONS: [string, string][] = [
  ["ms-entrance", "ms-a1"],
  ["ms-entrance", "ms-a3"],
  ["ms-a1", "ms-a2"],
  ["ms-a1", "ms-a4"],
  ["ms-a2", "ms-a4"],
  ["ms-a3", "ms-a4"],
  ["ms-a4", "ms-a5"],
  ["ms-a4", "ms-a6"],
  ["ms-a5", "ms-fest"],
  ["ms-a6", "ms-fest"],
];

// ─── Missions ─────────────────────────────────────────────────────────────────

export const MOCK_MISSIONS: Mission[] = [
  // Hall A4 – current milestone (active)
  {
    id: "msn-a4-1",
    milestoneId: "ms-a4",
    title: "Read your role-specific playbook",
    body:
      "Your role playbook covers the tools, rituals, and expectations for your team. Spend 25 minutes reading through it and jot down any questions.\n\n**Why this matters:** It sets the foundation for everything else this week.",
    type: "text",
    difficulty: 2,
    xpValue: 25,
    tags: ["mandatory"],
    isInCurrentMissions: true,
    suggestedDueDate: "2026-06-08",
  },
  {
    id: "msn-a4-2",
    milestoneId: "ms-a4",
    title: "Shadow a senior colleague for half a day",
    body:
      "Reach out to your buddy or manager and arrange a half-day shadow session. Observe how they handle their day-to-day work.\n\n**Tip:** Ask about their workflow, tools, and biggest challenges.",
    type: "text",
    difficulty: 3,
    xpValue: 35,
    tags: ["mandatory", "needsApproval"],
    isInCurrentMissions: true,
    suggestedDueDate: "2026-06-12",
  },
  {
    id: "msn-a4-3",
    milestoneId: "ms-a4",
    title: "Set 30/60/90 day goals with your manager",
    body:
      "Fill in your 30/60/90 day goal form. Your manager will review and approve it.\n\n**Fields:** Short-term wins, medium-term goals, long-term vision.",
    type: "form",
    difficulty: 2,
    xpValue: 25,
    tags: ["mandatory"],
    isInCurrentMissions: true,
    suggestedDueDate: "2026-06-15",
  },
  {
    id: "msn-a4-4",
    milestoneId: "ms-a4",
    title: "Book an intro call with your manager",
    body: "Use the booking link to schedule a 30-minute 1:1 with your manager.",
    type: "link",
    difficulty: 1,
    xpValue: 15,
    tags: [],
    isInCurrentMissions: false,
    externalUrl: "https://calendly.com/demo",
    suggestedDueDate: "2026-06-07",
  },

  // Hall A1 – completed milestone
  {
    id: "msn-a1-1",
    milestoneId: "ms-a1",
    title: "Complete IT security training",
    body:
      "Watch the 15-minute security training module and pass the quick quiz.",
    type: "link",
    difficulty: 1,
    xpValue: 20,
    tags: ["mandatory"],
    isInCurrentMissions: false,
    externalUrl: "https://training.messemuenchen.de/security",
  },
  {
    id: "msn-a1-2",
    milestoneId: "ms-a1",
    title: "Set up your workstation",
    body:
      "Follow the IT setup guide to configure your laptop, install required software, and connect to company systems.",
    type: "form",
    difficulty: 1,
    xpValue: 20,
    tags: [],
    isInCurrentMissions: false,
  },
  {
    id: "msn-a1-3",
    milestoneId: "ms-a1",
    title: "Get your access badge",
    body:
      "Visit the Security desk on Floor 1 of the West entrance to collect your access badge and parking permit.",
    type: "text",
    difficulty: 1,
    xpValue: 20,
    tags: ["mandatory", "urgent"],
    isInCurrentMissions: false,
  },
  {
    id: "msn-a1-4",
    milestoneId: "ms-a1",
    title: "Read the employee handbook",
    body:
      "Download and read the employee handbook. Focus on the Code of Conduct and Benefits sections.",
    type: "link",
    difficulty: 1,
    xpValue: 20,
    tags: [],
    isInCurrentMissions: false,
    externalUrl: "https://intranet.messemuenchen.de/handbook",
  },
  {
    id: "msn-a1-5",
    milestoneId: "ms-a1",
    title: "Tour of the facilities",
    body:
      "Join your buddy for a walking tour of the campus. Note key locations: canteen, medical, parking, bike storage.",
    type: "text",
    difficulty: 1,
    xpValue: 20,
    tags: [],
    isInCurrentMissions: false,
  },
];

// ─── Players ──────────────────────────────────────────────────────────────────

export const MOCK_PLAYERS: Player[] = [
  {
    id: "player-alex",
    name: "Alex Meyer",
    preferredName: "Alex",
    jobTitle: "Product Designer",
    team: "UX & Research",
    startDate: "2026-06-01",
    location: "Munich · GMT+2",
    totalXP: 345,
    profileComplete: true,
    tutorialComplete: false,
  },
  {
    id: "player-maria",
    name: "Maria Schmidt",
    jobTitle: "Marketing Manager",
    team: "Brand & Events",
    startDate: "2026-06-01",
    location: "Munich · GMT+2",
    totalXP: 520,
    profileComplete: true,
    tutorialComplete: true,
  },
  {
    id: "player-tom",
    name: "Tom Weber",
    jobTitle: "Software Engineer",
    team: "Platform",
    startDate: "2026-06-01",
    location: "Remote · GMT+1",
    totalXP: 80,
    profileComplete: false,
    tutorialComplete: false,
  },
  {
    id: "player-lisa",
    name: "Lisa Braun",
    preferredName: "Lisa",
    jobTitle: "UX Designer",
    team: "UX & Research",
    startDate: "2026-06-08",
    location: "Munich · GMT+2",
    totalXP: 200,
    profileComplete: true,
    tutorialComplete: true,
  },
];

// ─── Progress events (mock completed missions) ────────────────────────────────

export const MOCK_PROGRESS: ProgressEvent[] = [
  // Alex has no A4 missions done yet
  // A1 missions completed
  {
    id: "pe-1",
    playerId: "player-alex",
    missionId: "msn-a1-1",
    status: "completed",
    validatedAt: "2026-06-01",
  },
  {
    id: "pe-2",
    playerId: "player-alex",
    missionId: "msn-a1-2",
    status: "autoApproved",
    validatedAt: "2026-06-01",
  },
  {
    id: "pe-3",
    playerId: "player-alex",
    missionId: "msn-a1-3",
    status: "completed",
    validatedAt: "2026-06-02",
  },
  {
    id: "pe-4",
    playerId: "player-alex",
    missionId: "msn-a1-4",
    status: "completed",
    validatedAt: "2026-06-02",
  },
  {
    id: "pe-5",
    playerId: "player-alex",
    missionId: "msn-a1-5",
    status: "completed",
    validatedAt: "2026-06-03",
  },
];

// ─── Buddy ────────────────────────────────────────────────────────────────────

export const MOCK_BUDDY: BuddyProfile = {
  id: "buddy-lena",
  name: "Lena Brunner",
  role: "Marketing & Events",
  tenure: "6 years at Messe München",
  contactUrl:
    "https://teams.microsoft.com/l/chat/0/0?users=lena.brunner@messemuenchen.de",
};

// ─── Resources ────────────────────────────────────────────────────────────────

export const MOCK_RESOURCES: Resource[] = [
  {
    id: "res-1",
    title: "Employee Handbook",
    type: "guide",
    url: "#",
    isVisibleToPlayer: true,
  },
  {
    id: "res-2",
    title: "Company Intro Video",
    type: "video",
    url: "#",
    isVisibleToPlayer: true,
  },
  {
    id: "res-3",
    title: "Benefits Overview",
    type: "document",
    url: "#",
    isVisibleToPlayer: true,
  },
  {
    id: "res-4",
    title: "IT Setup Guide",
    type: "guide",
    url: "#",
    isVisibleToPlayer: true,
  },
  {
    id: "res-5",
    title: "Team Wiki",
    type: "link",
    url: "#",
    isVisibleToPlayer: true,
  },
  {
    id: "res-6",
    title: "Canteen Menu",
    type: "link",
    url: "#",
    isVisibleToPlayer: true,
  },
];

// ─── Tutorial steps ───────────────────────────────────────────────────────────

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome to MesseBuddy! 👋",
    body:
      "This is your onboarding companion for your first 90 days at Messe München. Let's take a quick tour.",
  },
  {
    title: "Your Milestone Map",
    body:
      "This map shows your onboarding journey through Messe München's halls. Each hall is a milestone — tap one to see what's inside.",
  },
  {
    title: "Current Missions",
    body:
      "These are the tasks your Game Maker has queued up for you right now. Complete them to earn XP and unlock the next milestone.",
  },
  {
    title: "Your Buddy",
    body:
      "Lena is your onboarding buddy. She's here to answer questions and guide you. Don't be shy — reach out!",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getMilestoneById(id: string): Milestone | undefined {
  return MOCK_MILESTONES.find((m) => m.id === id);
}

export function getMissionsForMilestone(milestoneId: string): Mission[] {
  return MOCK_MISSIONS.filter((m) => m.milestoneId === milestoneId);
}

export function getProgressForPlayer(playerId: string): ProgressEvent[] {
  return MOCK_PROGRESS.filter((p) => p.playerId === playerId);
}

export function isMissionDone(
  missionId: string,
  progress: ProgressEvent[],
): boolean {
  return progress.some((p) =>
    p.missionId === missionId && p.status !== "pending"
  );
}

export function getPlayerById(id: string): Player | undefined {
  return MOCK_PLAYERS.find((p) => p.id === id);
}

export function getPlayerXPPercent(player: Player): number {
  const maxXP = MOCK_MILESTONES.length * 100;
  return Math.round((player.totalXP / maxXP) * 100);
}
