import type {
  Session,
  Player,
  BuddyProfile,
  Milestone,
  Mission,
  FormSchema,
  ProgressEvent,
  Resource,
} from "../../types/index.ts";

// Seed data for local development. Represents a Messe München onboarding session.
// IDs are descriptive for readability; real PB IDs are 15-char alphanumeric.

const NOW = "2026-06-13T08:00:00.000Z";
const pb = (id: string) => ({ id, created: NOW, updated: NOW });

// ── Session ──────────────────────────────────────────────────────────────────

export const MOCK_SESSION: Session = {
  ...pb("sess_mmt2026"),
  name: "Messe München Onboarding — Summer 2026",
  bgImageUrl: "",
  gameMakerId: "uid_gamemaker_peter",
};

// ── Milestones ────────────────────────────────────────────────────────────────

export const MOCK_MILESTONES: ReadonlyArray<Milestone> = [
  {
    ...pb("ms_orientation"),
    sessionId: "sess_mmt2026",
    name: "Orientation",
    xPercent: 15,
    yPercent: 35,
    xpThreshold: 100,
    order: 0,
  },
  {
    ...pb("ms_team"),
    sessionId: "sess_mmt2026",
    name: "Meet Your Team",
    xPercent: 48,
    yPercent: 60,
    xpThreshold: 100,
    order: 1,
  },
  {
    ...pb("ms_settled"),
    sessionId: "sess_mmt2026",
    name: "Get Settled",
    xPercent: 78,
    yPercent: 30,
    xpThreshold: 100,
    order: 2,
  },
];

// ── Missions ──────────────────────────────────────────────────────────────────
// Mix of all types (text/link/form) and all validationMethods.

export const MOCK_MISSIONS: ReadonlyArray<Mission> = [
  // Orientation (3 missions)
  {
    ...pb("mission_profile"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_orientation",
    title: "Profile Setup",
    body: "Tell us a bit about yourself so your team can get to know you.",
    type: "form",
    difficulty: 2,
    xpValue: 28, // pre-derived for this milestone's 3 missions
    tags: ["mandatory"],
    order: 0,
    isInCurrentMissions: true,
    validationMethod: "selfApprove", // ignored for form type (C-06)
  },
  {
    ...pb("mission_welcome_video"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_orientation",
    title: "Watch the Welcome Video",
    body: "A short introduction to Messe München from the CEO.",
    type: "link",
    externalUrl: "https://www.messe-muenchen.de/",
    difficulty: 1,
    xpValue: 15,
    tags: ["mandatory"],
    order: 1,
    isInCurrentMissions: true,
    validationMethod: "selfApprove",
  },
  {
    ...pb("mission_handbook"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_orientation",
    title: "Read the Company Handbook",
    body: "## Company Handbook\n\nThe handbook covers our values, code of conduct, and key policies. Take your time reading through it — your buddy is here if you have questions.",
    type: "link",
    externalUrl: "https://www.messe-muenchen.de/",
    difficulty: 3,
    xpValue: 57,
    tags: ["mandatory"],
    order: 2,
    isInCurrentMissions: false,
    validationMethod: "gmApprove",
  },

  // Meet Your Team (4 missions)
  {
    ...pb("mission_meet_buddy"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_team",
    title: "Meet Your Buddy",
    body: "## Your First Check-In\n\nSchedule a 30-minute coffee chat with your assigned buddy. This is your chance to ask all the questions you haven't had the nerve to ask yet.\n\nYour buddy will scan a QR code to confirm the meeting happened.",
    type: "text",
    difficulty: 2,
    xpValue: 20,
    tags: ["mandatory"],
    order: 0,
    isInCurrentMissions: true,
    validationMethod: "qr",
  },
  {
    ...pb("mission_team_intro"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_team",
    title: "Team Introduction Round",
    body: "## Say Hello\n\nIntroduce yourself in the team Slack channel using the template pinned to `#introductions`. Include your name, role, and one fun fact.",
    type: "text",
    difficulty: 1,
    xpValue: 10,
    tags: [],
    order: 1,
    isInCurrentMissions: true,
    validationMethod: "gmApprove",
  },
  {
    ...pb("mission_slack_setup"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_team",
    title: "Set Up Slack",
    body: "Download Slack and join the workspace with your company email.",
    type: "link",
    externalUrl: "https://slack.com/downloads",
    difficulty: 1,
    xpValue: 10,
    tags: [],
    order: 2,
    isInCurrentMissions: false,
    validationMethod: "selfApprove",
  },
  {
    ...pb("mission_first_week"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_team",
    title: "First Week Goals",
    body: "Set your goals for the first week with your buddy.",
    type: "form",
    difficulty: 3,
    xpValue: 60,
    tags: ["mandatory"],
    order: 3,
    isInCurrentMissions: false,
    validationMethod: "selfApprove",
  },

  // Get Settled (3 missions)
  {
    ...pb("mission_office_tour"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_settled",
    title: "Office Tour",
    body: "## Find Your Way Around\n\nComplete a self-guided tour of the office. Check off the key locations: your desk, the main kitchen, emergency exits, and the product team area.\n\nYour buddy will confirm completion with a QR scan.",
    type: "text",
    difficulty: 2,
    xpValue: 28,
    tags: [],
    order: 0,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_it_setup"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_settled",
    title: "IT Setup",
    body: "## Get Your Devices Ready\n\nVisit IT support to collect your laptop and set up two-factor authentication on your accounts.",
    type: "text",
    difficulty: 2,
    xpValue: 28,
    tags: ["urgent"],
    order: 1,
    isInCurrentMissions: true,
    validationMethod: "gmApprove",
  },
  {
    ...pb("mission_benefits"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_settled",
    title: "Benefits Enrollment",
    body: "Enroll in your benefits package within your first 30 days.",
    type: "link",
    externalUrl: "https://www.messe-muenchen.de/",
    difficulty: 2,
    xpValue: 44,
    tags: [],
    order: 2,
    isInCurrentMissions: false,
    validationMethod: "selfApprove",
  },
];

// ── Form Schemas ──────────────────────────────────────────────────────────────

export const MOCK_FORM_SCHEMAS: ReadonlyArray<FormSchema> = [
  {
    ...pb("schema_profile"),
    missionId: "mission_profile",
    fields: [
      { id: "name", label: "Full Name", type: "text", required: true, placeholder: "e.g. Alex Müller" },
      { id: "preferredName", label: "Preferred Name", type: "text", required: false, placeholder: "What should we call you?" },
      { id: "pronouns", label: "Pronouns", type: "text", required: false, placeholder: "e.g. she/her, he/him, they/them" },
      { id: "role", label: "Job Title", type: "text", required: true, placeholder: "e.g. Product Designer" },
      { id: "team", label: "Team", type: "select", required: true, options: ["Product", "Engineering", "Design", "Marketing", "Operations", "HR", "Finance", "Legal"] },
      { id: "location", label: "Primary Location", type: "text", required: true, placeholder: "e.g. Munich, Germany" },
      { id: "timezone", label: "Timezone", type: "text", required: true, placeholder: "e.g. Europe/Berlin" },
      { id: "languages", label: "Languages", type: "text", required: false, placeholder: "e.g. German, English, Spanish" },
      { id: "skillsConfident", label: "Skills I'm confident in", type: "textarea", required: false, placeholder: "List skills you'd be happy to share with colleagues" },
      { id: "workStyle", label: "My work style", type: "textarea", required: false, placeholder: "How do you work best? Deep focus? Lots of collaboration?" },
    ],
  },
  {
    ...pb("schema_first_week"),
    missionId: "mission_first_week",
    fields: [
      { id: "goal1", label: "Goal 1", type: "text", required: true, placeholder: "What's the first thing you want to learn?" },
      { id: "goal2", label: "Goal 2", type: "text", required: false, placeholder: "A second goal for the week" },
      { id: "question", label: "Your biggest question right now", type: "textarea", required: false, placeholder: "What do you most need to understand?" },
    ],
  },
];

// ── Players ───────────────────────────────────────────────────────────────────

export const MOCK_PLAYERS: ReadonlyArray<Player> = [
  // Player 1: new hire, tutorial not yet started
  {
    ...pb("player_alex"),
    uid: "uid_alex_001",
    recoveryKey: "ALEX2026",
    sessionId: "sess_mmt2026",
    tutorialComplete: false,
    profileComplete: false,
    name: "",
    role: "",
    team: "",
    startDate: "2026-06-13",
    location: "",
    timezone: "Europe/Berlin",
    skillsConfident: [],
    skillsDevelop: [],
    languages: [],
  },
  // Player 2: tutorial complete, some missions done
  {
    ...pb("player_sofia"),
    uid: "uid_sofia_002",
    recoveryKey: "SOFIA026",
    sessionId: "sess_mmt2026",
    tutorialComplete: true,
    profileComplete: true,
    name: "Sofia Chen",
    preferredName: "Sofia",
    pronouns: "she/her",
    role: "Product Designer",
    team: "Design",
    startDate: "2026-06-01",
    location: "Munich, Germany",
    timezone: "Europe/Berlin",
    skillsConfident: ["User Research", "Figma", "Prototyping"],
    skillsDevelop: ["Front-end development", "Data analysis"],
    languages: ["English", "Mandarin", "German (beginner)"],
    workStyle: "I work best with focused mornings and collaborative afternoons.",
  },
];

// ── Buddy Profiles ────────────────────────────────────────────────────────────

export const MOCK_BUDDY_PROFILES: ReadonlyArray<BuddyProfile> = [
  {
    ...pb("buddy_marcus"),
    sessionId: "sess_mmt2026",
    assignedToPlayerId: "player_alex",
    name: "Marcus Weber",
    role: "Senior Product Manager",
    tenure: "4 years at Messe München",
    contactUrl: "https://slack.com/",
  },
  {
    ...pb("buddy_lena"),
    sessionId: "sess_mmt2026",
    assignedToPlayerId: "player_sofia",
    name: "Lena Hoffmann",
    role: "Lead Designer",
    tenure: "6 years at Messe München",
    contactUrl: "https://slack.com/",
  },
];

// ── Progress Events (for Sofia — tutorial complete, mixed progress) ────────────

export const MOCK_PROGRESS_EVENTS: ReadonlyArray<ProgressEvent> = [
  {
    ...pb("evt_sofia_profile"),
    sessionId: "sess_mmt2026",
    playerId: "player_sofia",
    missionId: "mission_profile",
    status: "autoApproved",
    formResponse: {
      name: "Sofia Chen",
      preferredName: "Sofia",
      pronouns: "she/her",
      role: "Product Designer",
      team: "Design",
      location: "Munich, Germany",
      timezone: "Europe/Berlin",
    },
  },
  {
    ...pb("evt_sofia_video"),
    sessionId: "sess_mmt2026",
    playerId: "player_sofia",
    missionId: "mission_welcome_video",
    status: "autoApproved",
  },
  {
    ...pb("evt_sofia_handbook"),
    sessionId: "sess_mmt2026",
    playerId: "player_sofia",
    missionId: "mission_handbook",
    status: "pendingApproval",
  },
  {
    ...pb("evt_sofia_team_intro"),
    sessionId: "sess_mmt2026",
    playerId: "player_sofia",
    missionId: "mission_team_intro",
    status: "completed",
    validatedBy: "uid_gamemaker_peter",
    validatedAt: "2026-06-10T14:30:00.000Z",
  },
];

// ── Resources ─────────────────────────────────────────────────────────────────

export const MOCK_RESOURCES: ReadonlyArray<Resource> = [
  {
    ...pb("res_handbook"),
    sessionId: "sess_mmt2026",
    title: "Employee Handbook",
    type: "document",
    url: "https://www.messe-muenchen.de/",
    isVisibleToPlayer: true,
  },
  {
    ...pb("res_it_help"),
    sessionId: "sess_mmt2026",
    title: "IT Help Desk",
    type: "link",
    url: "https://www.messe-muenchen.de/",
    isVisibleToPlayer: true,
  },
  {
    ...pb("res_benefits"),
    sessionId: "sess_mmt2026",
    title: "Benefits Guide 2026",
    type: "guide",
    url: "https://www.messe-muenchen.de/",
    isVisibleToPlayer: true,
  },
  {
    ...pb("res_intranet"),
    sessionId: "sess_mmt2026",
    title: "Messe München Intranet",
    type: "link",
    url: "https://www.messe-muenchen.de/",
    isVisibleToPlayer: true,
  },
  {
    ...pb("res_org_chart"),
    sessionId: "sess_mmt2026",
    title: "Organisation Chart (internal)",
    type: "document",
    url: "https://www.messe-muenchen.de/",
    isVisibleToPlayer: false, // GM-only
  },
];
