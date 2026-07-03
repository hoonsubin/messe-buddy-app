import mapBackground from "../../assets/map-background.jpg";
import type {
  BuddyProfile,
  FormSchema,
  Milestone,
  Mission,
  Player,
  PreBoardingCheckItem,
  ProgressEvent,
  Resource,
  Session,
} from "../../types/index.ts";

// Seed data — Messe München onboarding journey.
// Milestones and missions match the "New hire onboarding milestone map" spec.
// 6 milestones, 33 missions, 360 XP total.
// IDs are descriptive for readability; real PB IDs are 15-char alphanumeric.

const NOW = new Date().toISOString();
const pb = (id: string) => ({ id, created: NOW, updated: NOW });

// ── Pre-Boarding Checklist Defaults ───────────────────────────────────────────

const MOCK_PRE_BOARDING_CHECKS: ReadonlyArray<PreBoardingCheckItem> = [
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
    label: "First-week schedule shared with new hire",
    checked: false,
  },
  {
    id: "pbc_safety",
    label: "Safety briefing scheduled (Ersthelfer contact shared)",
    checked: false,
  },
];

// ── Session ───────────────────────────────────────────────────────────────────

export const MOCK_SESSION: Session = {
  ...pb("sess_mmt2026"),
  name: "Messe München Onboarding - Summer 2026",
  bgImageUrl: mapBackground,
  mapNodeScale: 0.55,
  gameMakerId: "uid_gamemaker_peter",
  qrSecret: "sess_mmt2026",
  preBoardingChecks: MOCK_PRE_BOARDING_CHECKS,
};

// ── Milestones ────────────────────────────────────────────────────────────────
// 6 milestones in a 4-column grid layout (gridPositions(6, 4)).
// xpThreshold = exact sum of all mission xpValues in that milestone.

export const MOCK_MILESTONES: ReadonlyArray<Milestone> = [
  {
    ...pb("ms_arrive"),
    sessionId: "sess_mmt2026",
    name: "Arrive & Get Set Up",
    xPercent: 13,
    yPercent: 33,
    xpThreshold: 50,
    order: 0,
  },
  {
    ...pb("ms_compliance"),
    sessionId: "sess_mmt2026",
    name: "Rules & Compliance",
    xPercent: 38,
    yPercent: 33,
    xpThreshold: 15,
    order: 1,
  },
  {
    ...pb("ms_connect"),
    sessionId: "sess_mmt2026",
    name: "Meet & Connect",
    xPercent: 63,
    yPercent: 33,
    xpThreshold: 125,
    order: 2,
  },
  {
    ...pb("ms_role"),
    sessionId: "sess_mmt2026",
    name: "Learn the Role",
    xPercent: 88,
    yPercent: 33,
    xpThreshold: 85,
    order: 3,
  },
  {
    ...pb("ms_culture"),
    sessionId: "sess_mmt2026",
    name: "Culture & Benefits",
    xPercent: 13,
    yPercent: 67,
    xpThreshold: 35,
    order: 4,
  },
  {
    ...pb("ms_contribute"),
    sessionId: "sess_mmt2026",
    name: "First Contributions",
    xPercent: 38,
    yPercent: 67,
    xpThreshold: 50,
    order: 5,
  },
];

// ── Missions ──────────────────────────────────────────────────────────────────
// 33 missions matching the milestone map spec exactly.
// XP values per spec: 5 = quick/passive, 10 = standard, 15 = meaningful, 20 = significant.
// Validation: "selfApprove" = self-certified, "qr" = QR shown to assigned person.

export const MOCK_MISSIONS: ReadonlyArray<Mission> = [
  // ── M1: Arrive & Get Set Up  (7 missions, 50 XP) ─────────────────────────

  {
    ...pb("mission_m1_profile"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_arrive",
    title: "Complete Your Profile",
    body:
      "Set your preferred name, role, and department so your team can get to know you.\n\nAnswer a few questions about your skills, interests, and learning goals. Uploading a photo is optional but encouraged. You can also set your communication preferences here.",
    type: "form",
    xpValue: 10,
    tags: ["mandatory"],
    order: 0,
    isInCurrentMissions: true,
    validationMethod: "selfApprove",
  },
  {
    ...pb("mission_m1_ceo_video"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_arrive",
    title: "Watch the CEO Welcome Video",
    body:
      "Open the pre-boarding website and watch the CEO's welcome message. It's a short introduction to who we are and what we stand for.\n\nTick it off when you're done.",
    type: "link",
    externalUrl: "https://www.messe-muenchen.de/en/company/about-us/",
    xpValue: 5,
    tags: ["mandatory"],
    order: 1,
    isInCurrentMissions: true,
    validationMethod: "selfApprove",
  },
  {
    ...pb("mission_m1_laptop"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_arrive",
    title: "Collect Laptop & Equipment",
    body:
      "## Pick Up Your IT Equipment\n\nHead to the IT Service Lounge with your supervisor to collect your laptop and any other IT gadgets assigned to you.\n\nOnce collected, show your supervisor the QR code on your phone — they'll scan it to confirm the handover.\n\n> 📍 **IT Service Lounge, Building A – Ground Floor**\n> Mon–Fri 08:00–18:00",
    type: "text",
    xpValue: 10,
    tags: ["mandatory"],
    order: 2,
    isInCurrentMissions: true,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m1_workstation"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_arrive",
    title: "Get Familiar with Your Workstation",
    body:
      "Set up your desk: screens, keyboard, docking station, and desk phone.\n\nLog in to all your accounts and confirm everything is working — email, WeNet, and any role-specific systems. If anything isn't accessible yet, note it and flag to IT.",
    type: "text",
    xpValue: 5,
    tags: [],
    order: 3,
    isInCurrentMissions: true,
    validationMethod: "selfApprove",
  },
  {
    ...pb("mission_m1_safety"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_arrive",
    title: "Know Your Safety Contacts",
    body:
      "## Safety on Campus\n\nFind out who the **Ersthelfer** (first aider) is in your area. Introduce yourself and show them your QR code — they'll confirm the contact.\n\nAlso take note of:\n- Who the **Betriebsarzt** (company doctor) is and how to reach them\n- How to report a workplace accident (procedure + who to notify)\n\n> The Ersthelfer contact for your department can be found on the notice board near the fire exits.",
    type: "text",
    xpValue: 10,
    tags: ["mandatory"],
    order: 4,
    isInCurrentMissions: true,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m1_access"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_arrive",
    title: "Know the Access Rules",
    body:
      "Find out how building access works outside normal working hours — what's allowed, what requires special permission, and who to contact if you're locked out.\n\nIf your role involves the fairground or garage, ask your supervisor about the entry permit process.",
    type: "text",
    xpValue: 5,
    tags: [],
    order: 5,
    isInCurrentMissions: false,
    validationMethod: "selfApprove",
  },
  {
    ...pb("mission_m1_absences"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_arrive",
    title: "Learn How to Report Absences",
    body:
      "## Absence Procedure\n\nFind out who to notify when you're going to be absent and by what time. Ask your supervisor to confirm the process and show them your QR code so they can validate it.\n\nKnowing this early means you're never caught off-guard.\n\n> **Tip:** Most teams at Messe München ask for notification before 08:00 on the day of absence.",
    type: "text",
    xpValue: 5,
    tags: [],
    order: 6,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },

  // ── M2: Rules & Compliance  (1 mission, 15 XP) ───────────────────────────

  {
    ...pb("mission_m2_safety_briefing"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_compliance",
    title: "Complete Safety Briefing",
    body:
      "## Safety Briefing\n\nAttend the formal safety briefing conducted by your supervisor. This is a mandatory step for all new hires and covers emergency procedures, fire exits, and workplace safety rules specific to your area.\n\nAfter the briefing, show your supervisor the QR code — as the person who conducted it, they'll validate your completion.\n\n> **Note:** This is a legal requirement. Please complete it during your first week.",
    type: "text",
    xpValue: 15,
    tags: ["mandatory"],
    order: 0,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },

  // ── M3: Meet & Connect  (11 missions, 125 XP) ────────────────────────────

  {
    ...pb("mission_m3_org_chart"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_connect",
    title: "Explore the Org Chart",
    body:
      "Open the Messe München org chart and find your team, your supervisor, and key contacts in other departments.\n\nUnderstanding the structure early helps you navigate the organisation and know who to reach out to.",
    type: "link",
    externalUrl: "https://www.messe-muenchen.de/en/company/about-us/",
    xpValue: 5,
    tags: [],
    order: 0,
    isInCurrentMissions: false,
    validationMethod: "selfApprove",
  },
  {
    ...pb("mission_m3_learn_names"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_connect",
    title: "Learn Names & Roles of All Colleagues",
    body:
      "Get the team list from your supervisor. For each person, note their name, role, and main responsibility.\n\nSelf-certify this mission once you feel confident you know your whole team.",
    type: "text",
    xpValue: 10,
    tags: [],
    order: 1,
    isInCurrentMissions: false,
    validationMethod: "selfApprove",
  },
  {
    ...pb("mission_m3_meet_manager"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_connect",
    title: "Meet Your Manager",
    body:
      "## First Meeting with Your Line Manager\n\nGet introduced to your line manager — this is the person who will guide your growth and performance at Messe München.\n\nAfter the introduction, show your manager the QR code on your phone. They'll scan it to confirm the meeting happened.\n\n> **Tip:** Bring one or two questions about your role or the team. It signals engagement and gets the relationship off to a good start.",
    type: "text",
    xpValue: 10,
    tags: ["mandatory"],
    order: 2,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m3_meet_team"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_connect",
    title: "Meet Your Team Colleagues",
    body:
      "## Team Introductions\n\nGet introduced to all your direct team colleagues — ideally in a team meeting or a quick round of desk introductions.\n\nOnce you've met everyone, show your supervisor the QR code so they can validate the introduction round.\n\n> The first impression you make is the one that sticks. A few words about where you're coming from and what you're excited about goes a long way.",
    type: "text",
    xpValue: 15,
    tags: ["mandatory"],
    order: 3,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m3_meet_it"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_connect",
    title: "Meet the IT Systems Specialist",
    body:
      "## Your Anwenderspezialist\n\nGet introduced to the IT systems specialist (Anwenderspezialist) responsible for your team. They're your go-to person for system access, software questions, and IT issues beyond the helpdesk.\n\nShow them your QR code to confirm the introduction.",
    type: "text",
    xpValue: 10,
    tags: [],
    order: 4,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m3_welcome_lunch"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_connect",
    title: "Attend Welcome Lunch",
    body:
      "## Welcome Lunch with Your Team\n\nJoin your supervisor and team for a welcome lunch. This is your chance to connect in a relaxed setting — no agenda, just getting to know each other.\n\nAfter the lunch, show your supervisor or buddy the QR code to validate your attendance.\n\n> 📍 **Canteen, Building A** or a restaurant of the team's choosing.",
    type: "text",
    xpValue: 15,
    tags: [],
    order: 5,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m3_dept_tour"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_connect",
    title: "Department Orientation Tour",
    body:
      "## Tour Your Department Area\n\nJoin the department orientation tour led by your supervisor. You'll get to see key areas of your own department and learn where things are.\n\nAfter the tour, show the QR code to the person who led it so they can confirm.\n\n> The tour typically takes 30–45 minutes and covers desks, meeting rooms, printing, storage, and emergency exits.",
    type: "text",
    xpValue: 10,
    tags: [],
    order: 6,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m3_dept_head"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_connect",
    title: "Meet the Head of Department",
    body:
      "## Your Department Head\n\nGet introduced to the head of your department. This is a brief but important moment — they set the direction for your team and it's good to have a face to the name early on.\n\nShow them your QR code to confirm the introduction.",
    type: "text",
    xpValue: 10,
    tags: [],
    order: 7,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m3_campus_tour"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_connect",
    title: "Campus Orientation Tour",
    body:
      "## Explore the Campus\n\nJoin the campus tour and locate the following:\n\n- **Canteen** (your daily lunch spot)\n- **Printer/copier** nearest to your desk\n- **First aid kit** and emergency exits for your floor\n- **Storage and office supplies** location\n- **Fire extinguisher** positions\n- **Notice board** for your department\n- **Time-stamping terminals** (Stempeluhr)\n\nOnce done, show your QR code to the person who led the tour.\n\n> Estimated time: 30–45 minutes.",
    type: "text",
    xpValue: 10,
    tags: ["mandatory"],
    order: 8,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m3_other_depts"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_connect",
    title: "Understand Working with Other Departments",
    body:
      "## Cross-Department Collaboration\n\nAsk your supervisor how your team typically interacts with other departments at Messe München. Find out:\n\n- Which departments you'll work with most\n- What the typical communication channels are\n- Any informal norms (Betriebliche Umgangsformen) to be aware of\n\nShow your supervisor the QR code once you've had this conversation.",
    type: "text",
    xpValue: 10,
    tags: [],
    order: 9,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m3_meet_3"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_connect",
    title: "Meet 3 Colleagues from Other Departments",
    body:
      "Step outside your immediate team and introduce yourself to at least 3 people from other departments.\n\nThis could happen over coffee, in the canteen, or by just walking over and saying hello. Self-certify when you've made three connections.\n\n> **Challenge:** Try to meet someone from Sales, IT, and one other department of your choice.",
    type: "text",
    xpValue: 20,
    tags: [],
    order: 10,
    isInCurrentMissions: false,
    validationMethod: "selfApprove",
  },

  // ── M4: Learn the Role  (7 missions, 85 XP) ──────────────────────────────

  {
    ...pb("mission_m4_role_desc"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_role",
    title: "Read Role Description & Quality Policy",
    body:
      "## Know Your Role\n\nReview your role description and read the relevant quality policy and quality aspects for your position. Make sure you understand your main tasks and responsibilities.\n\nDiscuss any questions with your supervisor, then show them the QR code to validate.\n\n> Your role description and quality policy documents are available from your supervisor or on WeNet.",
    type: "text",
    xpValue: 15,
    tags: ["mandatory"],
    order: 0,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m4_wenet"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_role",
    title: "Explore Department Info on WeNet",
    body:
      "Open WeNet and find the section for your department. Read through the department-specific information and note any important contacts or resources listed there.\n\nMark this mission complete once you've had a look around.",
    type: "link",
    externalUrl: "https://www.messe-muenchen.de/en/company/about-us/",
    xpValue: 5,
    tags: [],
    order: 1,
    isInCurrentMissions: false,
    validationMethod: "selfApprove",
  },
  {
    ...pb("mission_m4_processes"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_role",
    title: "Understand Key Department & Business Processes",
    body:
      "Review the key department and business processes relevant to your role. Understand the service portfolio and see how your role connects to it.\n\nAfter reviewing, discuss what you've learned with your supervisor — they'll scan your QR code to validate.",
    type: "link",
    externalUrl: "https://www.messe-muenchen.de/en/company/about-us/",
    xpValue: 15,
    tags: ["mandatory"],
    order: 2,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m4_strategy"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_role",
    title: "Learn Company Goals & Strategy",
    body:
      "Read the company goals and strategy overview. The key question to hold in mind: how does your team's work connect to the wider company objectives?\n\nDiscuss with your supervisor and show them the QR code when done.",
    type: "link",
    externalUrl: "https://www.messe-muenchen.de/en/company/strategy/",
    xpValue: 10,
    tags: [],
    order: 3,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m4_dress"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_role",
    title: "Dress Code & Work Materials",
    body:
      "Ask your supervisor about the dress code or any specific work clothing required for your role. Confirm what work materials you'll need and where to get them.\n\nSelf-certify once you've clarified this.",
    type: "text",
    xpValue: 5,
    tags: [],
    order: 4,
    isInCurrentMissions: false,
    validationMethod: "selfApprove",
  },
  {
    ...pb("mission_m4_shadow"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_role",
    title: "Shadow a Colleague for Half a Day",
    body:
      "## Shadowing Session\n\nYour supervisor will arrange a half-day shadowing session with a colleague in your team. Attend, observe, ask questions, and take notes.\n\nAfter the session, show the QR code to the colleague you shadowed — they'll confirm it.\n\n> **Tip:** Prepare 3–5 questions beforehand. What does a typical morning look like? What's the hardest part of this role? What do you wish you'd known earlier?",
    type: "text",
    xpValue: 20,
    tags: [],
    order: 5,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m4_elearning"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_role",
    title: "Complete Core E-Learnings",
    body:
      "Complete the core e-learning modules assigned to your role. These cover the foundational knowledge and compliance topics every Messe München employee needs.\n\nMark complete once you've finished all required modules.",
    type: "link",
    externalUrl: "https://www.messe-muenchen.de/en/company/about-us/",
    xpValue: 15,
    tags: ["mandatory"],
    order: 6,
    isInCurrentMissions: false,
    validationMethod: "selfApprove",
  },

  // ── M5: Culture & Benefits  (3 missions, 35 XP) ───────────────────────────

  {
    ...pb("mission_m5_benefits"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_culture",
    title: "Explore Social Benefits",
    body:
      "Read through the social benefits overview and note 2–3 benefits you want to activate. Messe München offers a range of perks — from transport subsidies to sports facilities.\n\nMark complete once you've reviewed the overview.",
    type: "link",
    externalUrl: "https://www.messe-muenchen.de/en/company/career/benefits/",
    xpValue: 5,
    tags: [],
    order: 0,
    isInCurrentMissions: false,
    validationMethod: "selfApprove",
  },
  {
    ...pb("mission_m5_event"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_culture",
    title: "Attend a Messe Event",
    body:
      "## Experience Messe Culture First-Hand\n\nAttend a Messe München event that interests you — a trade fair, an internal culture event, or a team gathering.\n\nAfter the event, show your QR code to the event organiser or a colleague who was present. They'll confirm your attendance.\n\n> Check the internal events calendar on WeNet for upcoming events in your first month.",
    type: "text",
    xpValue: 15,
    tags: [],
    order: 1,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m5_checkin"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_culture",
    title: "Month Check-In with Supervisor",
    body:
      "## One-Month Check-In\n\nSchedule a meeting with your supervisor to discuss your progress after your first month. Bring your questions, reflect on what you've learned, and agree on goals for the next phase.\n\nShow your supervisor the QR code at the end of the meeting to validate it.\n\n> **Suggested agenda:** What's going well? What's still unclear? What do I need more support with? Goals for months 2–3.",
    type: "text",
    xpValue: 15,
    tags: [],
    order: 2,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },

  // ── M6: First Contributions  (4 missions, 50 XP) ─────────────────────────

  {
    ...pb("mission_m6_first_tasks"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_contribute",
    title: "Learn Your First Tasks",
    body:
      "## Your First Real Work\n\nYour supervisor will define and clarify the specific tasks for your role. This is where onboarding becomes the job.\n\nAfter the briefing, show your supervisor the QR code so they can confirm the handoff.\n\n> The clearer you are on your first tasks, the faster you can contribute. Ask: What does success look like in week 2?",
    type: "text",
    xpValue: 10,
    tags: ["mandatory"],
    order: 0,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m6_meeting"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_contribute",
    title: "Attend a Client or Cross-Team Meeting",
    body:
      "## Your First Real Meeting\n\nYour supervisor will add you to a relevant client meeting or cross-team session. Attend, observe, and contribute where appropriate.\n\nAfterwards, show the QR code to the meeting organiser or your supervisor to validate.\n\n> Don't worry about having all the answers — listening and understanding context is the goal at this stage.",
    type: "text",
    xpValue: 15,
    tags: [],
    order: 1,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m6_day1_review"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_contribute",
    title: "Day 1 Progress Conversation",
    body:
      "## End of Day 1 Debrief\n\nSit down with your supervisor after your first day and talk through how the onboarding is going. What worked? What felt confusing? What would help?\n\nShow your supervisor the QR code to validate the conversation happened.\n\n> This is a two-way check-in — your supervisor benefits from hearing your fresh perspective too.",
    type: "text",
    xpValue: 10,
    tags: [],
    order: 2,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
  {
    ...pb("mission_m6_30day"),
    sessionId: "sess_mmt2026",
    milestoneId: "ms_contribute",
    title: "30-Day Progress Conversation",
    body:
      "## 30-Day Review\n\nReview your onboarding progress together with your supervisor at the 30-day mark. Reflect on what you've accomplished, what you're still learning, and agree on goals for months 2–3.\n\nShow your supervisor the QR code to confirm the conversation.\n\n> **Good questions to bring:** What should I prioritise next? Am I meeting expectations so far? What would make me more effective?",
    type: "text",
    xpValue: 15,
    tags: [],
    order: 3,
    isInCurrentMissions: false,
    validationMethod: "qr",
  },
];

// ── Form Schemas ──────────────────────────────────────────────────────────────
// Only the profile mission has a form.

export const MOCK_FORM_SCHEMAS: ReadonlyArray<FormSchema> = [
  {
    ...pb("schema_profile"),
    missionId: "mission_m1_profile",
    fields: [
      {
        id: "preferredName",
        label: "Preferred Name",
        type: "text",
        required: true,
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
        placeholder: "e.g. Product Manager",
      },
      {
        id: "department",
        label: "Department",
        type: "select",
        required: true,
        options: [
          "Exhibition Services",
          "Marketing",
          "IT & Digitalisation",
          "Finance",
          "HR & Organisation",
          "Event Management",
          "Sales",
          "Legal",
          "Facility Management",
          "Communications",
        ],
      },
      {
        id: "startDate",
        label: "Start Date",
        type: "text",
        required: true,
        placeholder: "e.g. 2026-06-16",
      },
      {
        id: "location",
        label: "Primary Work Location",
        type: "text",
        required: false,
        placeholder: "e.g. Building A, Floor 2",
      },
      {
        id: "languages",
        label: "Languages",
        type: "text",
        required: false,
        placeholder: "e.g. German, English",
      },
      {
        id: "skillsConfident",
        label: "Skills I'm confident in",
        type: "textarea",
        required: false,
        placeholder: "Skills you'd be happy to share with colleagues",
      },
      {
        id: "learningGoals",
        label: "Learning goals for my first 3 months",
        type: "textarea",
        required: false,
        placeholder: "What do you most want to learn or develop?",
      },
      {
        id: "workArrangement",
        label: "Work arrangement",
        type: "multiSelect",
        required: false,
        options: ["Mostly in the office", "Mostly remote", "Hybrid"],
      },
      {
        id: "interests",
        label: "Interests & hobbies",
        type: "text",
        required: false,
        placeholder: "Anything you'd like colleagues to know about you",
      },
    ],
  },
];

// ── Players ───────────────────────────────────────────────────────────────────

export const MOCK_PLAYERS: ReadonlyArray<Player> = [
  {
    ...pb("player_alex"),
    uid: "uid_alex_001",
    recoveryKey: "ALEX2026",
    sessionId: "sess_mmt2026",
    tutorialComplete: false,
    profileComplete: false,
    name: "Alex Johnson",
    preferredName: "Alex",
    pronouns: "they/them",
    role: "Digital Content Manager",
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
  },
  // Demo player — first week in, M1 partially done
  {
    ...pb("player_sofia"),
    uid: "uid_sofia_002",
    recoveryKey: "SOFIA026",
    sessionId: "sess_mmt2026",
    tutorialComplete: false,
    profileComplete: false,
    name: "Sofia Chen",
    preferredName: undefined,
    pronouns: undefined,
    role: "Junior Engineer",
    team: "Platform",
    startDate: "2026-05-01",
    location: "Munich",
    timezone: "Europe/Berlin",
    skillsConfident: [],
    skillsDevelop: [],
    languages: [],
    workStyle: undefined,
  },
];

// ── Buddy Profiles ────────────────────────────────────────────────────────────

export const MOCK_BUDDY_PROFILES: ReadonlyArray<BuddyProfile> = [
  {
    ...pb("buddy_marcus"),
    sessionId: "sess_mmt2026",
    assignedToPlayerId: "player_alex",
    name: "Marcus Weber",
    role: "Senior Event Manager",
    tenure: "5 years at Messe München",
    contactUrl: "https://teams.microsoft.com/",
    quote: "Don't hesitate to ask — there are no stupid questions on day one.",
  },
  {
    ...pb("buddy_lena"),
    sessionId: "sess_mmt2026",
    assignedToPlayerId: "player_sofia",
    name: "Lena Hoffmann",
    role: "Lead Event Coordinator",
    tenure: "6 years at Messe München",
    contactUrl: "https://teams.microsoft.com/",
    quote:
      "The best onboarding is the one that makes you feel like you already belong.",
    email: "lena.hoffmann@messe-muenchen.de",
    phone: "+49 89 949-21345",
  },
];

// ── Progress Events ───────────────────────────────────────────────────────────
// Sofia starts fresh (no progress events) to simulate a completely new user.

export const MOCK_PROGRESS_EVENTS: ReadonlyArray<ProgressEvent> = [];

// ── Second session (stub — kept for adapter compatibility) ────────────────────

export const MOCK_SESSION_2: Session = {
  ...pb("sess_eng_2026"),
  name: "Engineering Onboarding - June 2026",
  bgImageUrl: "",
  mapNodeScale: 0.33,
  gameMakerId: "uid_gamemaker_peter",
  qrSecret: "sess_eng_2026",
  preBoardingChecks: [],
};

export const MOCK_MILESTONES_2: ReadonlyArray<Milestone> = [];
export const MOCK_MISSIONS_2: ReadonlyArray<Mission> = [];
export const MOCK_PROGRESS_EVENTS_2: ReadonlyArray<ProgressEvent> = [];

// ── Resources ─────────────────────────────────────────────────────────────────

export const MOCK_RESOURCES: ReadonlyArray<Resource> = [
  {
    ...pb("res_campus_map"),
    sessionId: "sess_mmt2026",
    title: "Campus Map",
    description: "Find your way around the Messe München grounds",
    type: "guide",
    url: "https://www.messe-muenchen.de/en/trade-fair-venue/fair-grounds/",
    isVisibleToPlayer: true,
  },
  {
    ...pb("res_wenet"),
    sessionId: "sess_mmt2026",
    title: "WeNet (Intranet)",
    description: "Policies, news, and department-specific info",
    type: "link",
    url: "https://www.messe-muenchen.de/en/company/about-us/",
    isVisibleToPlayer: true,
  },
  {
    ...pb("res_benefits"),
    sessionId: "sess_mmt2026",
    title: "Employee Benefits Overview",
    description: "Transport, sports, canteen, and social perks",
    type: "document",
    url: "https://www.messe-muenchen.de/en/company/career/benefits/",
    isVisibleToPlayer: true,
  },
  {
    ...pb("res_it_help"),
    sessionId: "sess_mmt2026",
    title: "IT Help Desk",
    description: "Technical support — Building A, Ground Floor, 08:00–18:00",
    type: "link",
    url: "https://www.messe-muenchen.de/en/company/about-us/",
    isVisibleToPlayer: true,
  },
  {
    ...pb("res_welcome_video"),
    sessionId: "sess_mmt2026",
    title: "CEO Welcome Video",
    description: "A message from the management board",
    type: "video",
    url: "https://www.messe-muenchen.de/en/company/about-us/",
    isVisibleToPlayer: true,
  },
  {
    ...pb("res_absence"),
    sessionId: "sess_mmt2026",
    title: "Absence & Time-Off Policy",
    description: "How to report absences and request leave",
    type: "document",
    url: "https://www.messe-muenchen.de/en/company/about-us/",
    isVisibleToPlayer: true,
  },
  {
    ...pb("res_org_chart"),
    sessionId: "sess_mmt2026",
    title: "Organisation Chart",
    description: "Full org structure and reporting lines (GM only)",
    type: "document",
    url: "https://www.messe-muenchen.de/en/company/about-us/",
    isVisibleToPlayer: false,
  },
];
