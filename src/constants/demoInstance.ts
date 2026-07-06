import type { CachedIdentity, PreBoardingCheckItem } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";

/**
 * Single declared source for the "Sofia Chen / Peter Tubak" demo instance.
 * Session id, GM identity, and persona override state all live here —
 * `seedDemoInstance` reads this file and materializes it through real
 * `AppAdapter` calls; `useLandingFlow.ts` reads the same `DEMO_PROFILES`
 * export instead of keeping its own copy of these ids.
 */

// ── Session ───────────────────────────────────────────────────────────────

export const DEMO_SESSION_ID = "sess_mmt2026";
export const DEMO_SESSION_NAME = "Messe München Onboarding - Summer 2026";

export const DEMO_GM_UID = "uid_gamemaker_peter";
export const DEMO_GM_RECOVERY_KEY = "DEMO1234";
export const DEMO_GM_NAME = "Peter Tubak";

// Session-wide pre-boarding checklist (not per-player).
export const DEMO_PRE_BOARDING_CHECKS: ReadonlyArray<PreBoardingCheckItem> = [
  {
    id: "pbc_workspace",
    label: "Workspace prepared (desk, badge, parking)",
    checked: true,
  },
  { id: "pbc_laptop", label: "Laptop ordered and configured", checked: true },
  {
    id: "pbc_system",
    label: "System access requested (email, WeNet, HR tools)",
    checked: false,
  },
  {
    id: "pbc_intro",
    label: "Team intro email drafted (buddy + manager)",
    checked: false,
  },
  { id: "pbc_buddy", label: "Buddy assigned and briefed", checked: true },
  {
    id: "pbc_schedule",
    label: "First-week schedule shared with player",
    checked: false,
  },
  {
    id: "pbc_safety",
    label: "Safety briefing scheduled (Ersthelfer contact shared)",
    checked: false,
  },
];

// ── Buddy assignments ─────────────────────────────────────────────────────

export interface DemoBuddy {
  readonly name: string;
  readonly role: string;
  readonly tenure?: string;
  readonly contactUrl?: string;
  readonly quote?: string;
  readonly email?: string;
  readonly phone?: string;
}

// ── Player personas ───────────────────────────────────────────────────────
// `completedMissionTitles` names missions by their `DEFAULT_ONBOARDING_TEMPLATE`
// title (not by id — imported missions get fresh generated ids on every
// seed run) so `seedDemoInstance` can look them up after import and mark
// the matching progress events completed.

export interface DemoPersona {
  readonly playerId: string;
  readonly uid?: string;
  readonly recoveryKey?: string;
  readonly claimStatus: "invited" | "claimed";
  readonly name: string;
  readonly preferredName?: string;
  readonly pronouns?: string;
  readonly jobTitle: string;
  readonly team: string;
  readonly startDate: string;
  readonly location: string;
  readonly timezone: string;
  readonly skillsConfident: ReadonlyArray<string>;
  readonly skillsDevelop: ReadonlyArray<string>;
  readonly languages: ReadonlyArray<string>;
  readonly workStyle?: string;
  readonly completedMissionTitles: ReadonlyArray<string>;
  readonly buddy?: DemoBuddy;
}

// Alex — kept as an unclaimed invite: exercises the "not yet claimed" player
// state in the picker/roster. No progress, no uid/recoveryKey yet.
const ALEX: DemoPersona = {
  playerId: "player_alex",
  claimStatus: "invited",
  name: "Alex Johnson",
  preferredName: "Alex",
  pronouns: "they/them",
  jobTitle: "Digital Content Manager",
  team: "Marketing & Communications",
  startDate: "2026-06-16",
  location: "Building A, Floor 2",
  timezone: "Europe/Berlin",
  skillsConfident: [
    "Content strategy",
    "Video production",
    "Social media management",
  ],
  skillsDevelop: [
    "German business communication",
    "Trade fair operations",
    "SAP",
  ],
  languages: ["English", "German (A2)"],
  workStyle:
    "I thrive in creative, fast-paced environments with clear deadlines.",
  completedMissionTitles: [],
  buddy: {
    name: "Marcus Weber",
    role: "Senior Event Manager",
    tenure: "5 years at Messe München",
    email: "marcus.weber@messe-muenchen.de",
    phone: "+49 89 949-21340",
    contactUrl: "https://teams.microsoft.com/",
    quote: "Don't hesitate to ask — there are no stupid questions on day one.",
  },
};

// Sofia — claimed, one week in. Milestone-1 missions covering the
// profile/CEO-video/laptop-collection flow are pre-completed to match that
// narrative (previously the mock data left her at zero despite the comment
// implying otherwise — confirmed with Hoon on 2026-07-06 that this was a gap
// to fix, not the intended state).
const SOFIA: DemoPersona = {
  playerId: "player_sofia",
  uid: "uid_sofia_002",
  recoveryKey: "SOFIA026",
  claimStatus: "claimed",
  name: "Sofia Chen",
  jobTitle: "Junior Engineer",
  team: "Platform",
  startDate: "2026-05-01",
  location: "Munich",
  timezone: "Europe/Berlin",
  skillsConfident: [],
  skillsDevelop: [],
  languages: [],
  completedMissionTitles: [
    "Complete Your Profile",
    "Watch the CEO Welcome Video",
    "Collect Laptop & Equipment",
  ],
  buddy: {
    name: "Lena Hoffmann",
    role: "Lead Event Coordinator",
    tenure: "6 years at Messe München",
    contactUrl: "https://teams.microsoft.com/",
    quote:
      "The best onboarding is the one that makes you feel like you already belong.",
    email: "lena.hoffmann@messe-muenchen.de",
    phone: "+49 89 949-21345",
  },
};

export const DEMO_PERSONAS: ReadonlyArray<DemoPersona> = [ALEX, SOFIA];

// ── Landing-page profile picker ──────────────────────────────────────────
// Only claimed personas (with a real uid) plus the GM show up here — Alex
// stays backend-only until claimed via a real invite flow.

export const DEMO_PROFILES: ReadonlyArray<CachedIdentity> = [
  {
    uid: SOFIA.uid!,
    recoveryKey: SOFIA.recoveryKey!,
    sessionId: DEMO_SESSION_ID,
    role: USER_ROLE.PLAYER,
    name: SOFIA.name,
    isDemo: true,
  },
  {
    uid: DEMO_GM_UID,
    recoveryKey: DEMO_GM_RECOVERY_KEY,
    sessionId: DEMO_SESSION_ID,
    role: USER_ROLE.GAMEMAKER,
    name: DEMO_GM_NAME,
    isDemo: true,
  },
] as const;
