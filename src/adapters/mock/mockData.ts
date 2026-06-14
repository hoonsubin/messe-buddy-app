import mapBackground from "../../assets/map-background.jpg";
import type {
  BuddyProfile,
  FormSchema,
  Milestone,
  Mission,
  Player,
  ProgressEvent,
  Resource,
  Session,
} from "../../types/index.ts";

// Seed data for local development. Represents a Messe München onboarding session.
// IDs are descriptive for readability; real PB IDs are 15-char alphanumeric.

const NOW = "2026-06-13T08:00:00.000Z";
const pb = (id: string) => ({ id, created: NOW, updated: NOW });

// ── Session ──────────────────────────────────────────────────────────────────

export const MOCK_SESSION: Session = {
  ...pb("sess_mmt2026"),
  name: "Messe München Onboarding — Summer 2026",
  bgImageUrl: mapBackground,
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
    xpValue: 33, // deriveXP(weights=[2,1,3], total=6): floor(100*2/6)=33
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
    xpValue: 16, // floor(100*1/6)=16
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
    body:
      "## Company Handbook\n\nThe handbook covers our values, code of conduct, and key policies. Take your time reading through it — your buddy is here if you have questions.",
    type: "link",
    externalUrl: "https://www.messe-muenchen.de/",
    difficulty: 3,
    xpValue: 51, // floor(100*3/6)=50, +1 remainder (highest weight) → 51
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
    body:
      "## Your First Check-In\n\nSchedule a 30-minute coffee chat with your assigned buddy. This is your chance to ask all the questions you haven't had the nerve to ask yet.\n\nAt the end of your chat, your buddy will **scan the QR code** on your phone to confirm the meeting.\n\n> 📍 **Buddy Lounge, Building C — Floor 2**\n> Drop-in hours Mon–Fri, 09:00–17:00\n>\n> Or schedule via Slack — your buddy will suggest a time.",
    type: "text",
    difficulty: 2,
    xpValue: 29, // deriveXP(weights=[2,1,1,3], total=7): floor(100*2/7)=28, +1 remainder → 29
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
    body:
      "## Say Hello\n\nIntroduce yourself in the team Slack channel using the template pinned to `#introductions`. Include your name, role, and one fun fact.",
    type: "text",
    difficulty: 1,
    xpValue: 14, // floor(100*1/7)=14
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
    xpValue: 14, // floor(100*1/7)=14
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
    xpValue: 43, // floor(100*3/7)=42, +1 remainder (highest weight) → 43
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
    body:
      "## Find Your Way Around\n\nComplete a self-guided tour and locate the following stops:\n\n- Your assigned desk\n- Main kitchen (Building A, Floor 1)\n- Nearest emergency exits\n- Product & Design team area (Building B, Floor 3)\n- IT Help Desk (Building A, Floor 0)\n\nWhen you're done, find your buddy — they'll **scan your QR code** to confirm.\n\n> 📍 **Start at Reception, Building A**\n> The front desk team can point you in the right direction.\n>\n> Estimated time: 20–30 minutes",
    type: "text",
    difficulty: 2,
    xpValue: 34, // deriveXP(weights=[2,2,2], total=6): floor(100*2/6)=33, +1 remainder (order 0) → 34
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
    body:
      "## Get Your Devices Ready\n\nVisit the IT Help Desk to collect your **laptop** and set up **two-factor authentication** on your accounts. Bring your employee badge — they'll need to verify your identity.\n\nOnce complete, your Game Master will mark this mission as approved.\n\n> 📍 **IT Help Desk — Building A, Ground Floor**\n> Open Monday–Friday, 08:00–18:00\n>\n> Walk-ins welcome. Average wait: 10–15 minutes.",
    type: "text",
    difficulty: 2,
    xpValue: 33, // floor(100*2/6)=33
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
    xpValue: 33, // floor(100*2/6)=33
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
      {
        id: "name",
        label: "Full Name",
        type: "text",
        required: true,
        placeholder: "e.g. Alex Müller",
      },
      {
        id: "preferredName",
        label: "Preferred Name",
        type: "text",
        required: false,
        placeholder: "What should we call you?",
      },
      {
        id: "pronouns",
        label: "Pronouns",
        type: "text",
        required: false,
        placeholder: "e.g. she/her, he/him, they/them",
      },
      {
        id: "role",
        label: "Job Title",
        type: "text",
        required: true,
        placeholder: "e.g. Product Designer",
      },
      {
        id: "team",
        label: "Team",
        type: "select",
        required: true,
        options: [
          "Product",
          "Engineering",
          "Design",
          "Marketing",
          "Operations",
          "HR",
          "Finance",
          "Legal",
        ],
      },
      {
        id: "location",
        label: "Primary Location",
        type: "text",
        required: true,
        placeholder: "e.g. Munich, Germany",
      },
      {
        id: "timezone",
        label: "Timezone",
        type: "text",
        required: true,
        placeholder: "e.g. Europe/Berlin",
      },
      {
        id: "languages",
        label: "Languages",
        type: "text",
        required: false,
        placeholder: "e.g. German, English, Spanish",
      },
      {
        id: "skillsConfident",
        label: "Skills I'm confident in",
        type: "textarea",
        required: false,
        placeholder: "List skills you'd be happy to share with colleagues",
      },
      {
        id: "workArrangement",
        label: "Work arrangement",
        type: "multiSelect",
        required: false,
        options: ["Mostly in the office", "Mostly remote", "Hybrid"],
      },
      {
        id: "mentorValues",
        label: "What I most value in a mentor",
        type: "multiSelect",
        required: false,
        options: [
          "Technical depth in my field",
          "Leadership & career navigation",
          "Similar career transition",
          "Cross-cultural experience",
          "A different perspective",
          "Someone a few steps ahead",
          "Emotional support",
          "Social guidance",
        ],
      },
      {
        id: "mentorStyle",
        label: "Preferred mentor interaction style",
        type: "multiSelect",
        required: false,
        options: [
          "Scheduled regular sessions",
          "Informal, when needed",
          "Peer group mentoring",
        ],
      },
      {
        id: "catchUpAreas",
        label: "What do you feel you need to catch up on?",
        type: "textarea",
        required: false,
        placeholder:
          "Areas, background knowledge, context you'd like to get up to speed on…",
      },
    ],
  },
  {
    ...pb("schema_first_week"),
    missionId: "mission_first_week",
    fields: [
      {
        id: "goal1",
        label: "Goal 1",
        type: "text",
        required: true,
        placeholder: "What's the first thing you want to learn?",
      },
      {
        id: "goal2",
        label: "Goal 2",
        type: "text",
        required: false,
        placeholder: "A second goal for the week",
      },
      {
        id: "question",
        label: "Your biggest question right now",
        type: "textarea",
        required: false,
        placeholder: "What do you most need to understand?",
      },
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
    workStyle:
      "I work best with focused mornings and collaborative afternoons.",
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
    quote:
      "The best onboarding is the one that makes you feel like you already belong.",
    email: "lena.hoffmann@messe-muenchen.de",
    phone: "+49 89 949-21345",
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
    description: "Policies, benefits, and company info",
    type: "document",
    url: "https://www.messe-muenchen.de/",
    isVisibleToPlayer: true,
  },
  {
    ...pb("res_campus_map"),
    sessionId: "sess_mmt2026",
    title: "Campus Map",
    description: "Find your way around the grounds",
    type: "guide",
    url: "https://www.messe-muenchen.de/",
    isVisibleToPlayer: true,
  },
  {
    ...pb("res_culture"),
    sessionId: "sess_mmt2026",
    title: "Culture Manual",
    description: "Our values and ways of working",
    type: "guide",
    url: "https://www.messe-muenchen.de/",
    isVisibleToPlayer: true,
  },
  {
    ...pb("res_it_help"),
    sessionId: "sess_mmt2026",
    title: "IT Help Desk",
    description: "Technical support and access requests",
    type: "link",
    url: "https://www.messe-muenchen.de/",
    isVisibleToPlayer: true,
  },
  {
    ...pb("res_welcome_video"),
    sessionId: "sess_mmt2026",
    title: "Welcome Video",
    description: "A message from our CEO",
    type: "video",
    url: "https://www.messe-muenchen.de/",
    isVisibleToPlayer: true,
  },
  {
    ...pb("res_social_events"),
    sessionId: "sess_mmt2026",
    title: "Social Events",
    description: "Team lunches, meetups and events",
    type: "link",
    url: "https://www.messe-muenchen.de/",
    isVisibleToPlayer: true,
  },
  {
    ...pb("res_org_chart"),
    sessionId: "sess_mmt2026",
    title: "Organisation Chart (internal)",
    description: "Full org structure and reporting lines",
    type: "document",
    url: "https://www.messe-muenchen.de/",
    isVisibleToPlayer: false, // GM-only
  },
];
