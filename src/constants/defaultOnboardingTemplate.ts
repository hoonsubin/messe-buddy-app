import type { TemplateExport } from "../types/index.ts";
import { MISSION_TAG, MISSION_TYPE, VALIDATION_METHOD } from "../types/unions.ts";
import { PROFILE_FORM_FIELDS } from "./profileFormFields.ts";

/**
 * Bundled journey applied when a GM onboards a player without selecting a
 * template. Sourced from "New hire onboarding milestone map.md" — 6
 * milestones, 33 missions, 360 XP total.
 *
 * Each milestone owns its missions directly; each form mission owns its
 * fields directly. Position in the array is the order — there is nothing
 * else to keep in sync when editing this by hand.
 */
export const DEFAULT_ONBOARDING_TEMPLATE: TemplateExport = {
  exportType: "template",
  exportedAt: "2026-07-06T00:00:00.000Z",
  name: "Default Onboarding",
  milestones: [
    {
      name: "Arrive & Get Set Up",
      xPercent: 13,
      yPercent: 33,
      xpThreshold: 50,
      resources: ["campus_map", "wenet", "it_help", "welcome_video", "absence"],
      missions: [
        {
          title: "Complete Your Profile",
          body:
            "Set your preferred name, role, and department so your team can get to know you.\n\nAnswer a few questions about your skills, interests, and learning goals. Uploading a photo is optional but encouraged. You can also set your communication preferences here.",
          type: MISSION_TYPE.FORM,
          xpValue: 10,
          tags: [MISSION_TAG.MANDATORY, MISSION_TAG.ONBOARDING_PROFILE],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.SELF_APPROVE,
          formFields: PROFILE_FORM_FIELDS,
        },
        {
          title: "Watch the CEO Welcome Video",
          body:
            "Open the pre-boarding website and watch the CEO's welcome message. It's a short introduction to who we are and what we stand for.\n\nTick it off when you're done.",
          type: MISSION_TYPE.LINK,
          externalUrl: "https://www.messe-muenchen.de/en/company/about-us/",
          xpValue: 5,
          tags: [MISSION_TAG.MANDATORY],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.SELF_APPROVE,
        },
        {
          title: "Collect Laptop & Equipment",
          body:
            "## Pick Up Your IT Equipment\n\nHead to the IT Service Lounge with your supervisor to collect your laptop and any other IT gadgets assigned to you.\n\nOnce collected, show your supervisor the QR code on your phone — they'll scan it to confirm the handover.\n\n> 📍 **IT Service Lounge, Building A – Ground Floor**\n> Mon–Fri 08:00–18:00",
          type: MISSION_TYPE.TEXT,
          xpValue: 10,
          tags: [MISSION_TAG.MANDATORY],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Get Familiar with Your Workstation",
          body:
            "Set up your desk: screens, keyboard, docking station, and desk phone.\n\nLog in to all your accounts and confirm everything is working — email, WeNet, and any role-specific systems. If anything isn't accessible yet, note it and flag to IT.",
          type: MISSION_TYPE.TEXT,
          xpValue: 5,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.SELF_APPROVE,
        },
        {
          title: "Know Your Safety Contacts",
          body:
            "## Safety on Campus\n\nFind out who the **Ersthelfer** (first aider) is in your area. Introduce yourself and show them your QR code — they'll confirm the contact.\n\nAlso take note of:\n- Who the **Betriebsarzt** (company doctor) is and how to reach them\n- How to report a workplace accident (procedure + who to notify)\n\n> The Ersthelfer contact for your department can be found on the notice board near the fire exits.",
          type: MISSION_TYPE.TEXT,
          xpValue: 10,
          tags: [MISSION_TAG.MANDATORY],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Know the Access Rules",
          body:
            "Find out how building access works outside normal working hours — what's allowed, what requires special permission, and who to contact if you're locked out.\n\nIf your role involves the fairground or garage, ask your supervisor about the entry permit process.",
          type: MISSION_TYPE.TEXT,
          xpValue: 5,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.SELF_APPROVE,
        },
        {
          title: "Learn How to Report Absences",
          body:
            "## Absence Procedure\n\nFind out who to notify when you're going to be absent and by what time. Ask your supervisor to confirm the process and show them your QR code so they can validate it.\n\nKnowing this early means you're never caught off-guard.\n\n> **Tip:** Most teams at Messe München ask for notification before 08:00 on the day of absence.",
          type: MISSION_TYPE.TEXT,
          xpValue: 5,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
      ],
    },
    {
      name: "Rules & Compliance",
      xPercent: 38,
      yPercent: 33,
      xpThreshold: 15,
      missions: [
        {
          title: "Complete Safety Briefing",
          body:
            "## Safety Briefing\n\nAttend the formal safety briefing conducted by your supervisor. This is a mandatory step for all players and covers emergency procedures, fire exits, and workplace safety rules specific to your area.\n\nAfter the briefing, show your supervisor the QR code — as the person who conducted it, they'll validate your completion.\n\n> **Note:** This is a legal requirement. Please complete it during your first week.",
          type: MISSION_TYPE.TEXT,
          xpValue: 15,
          tags: [MISSION_TAG.MANDATORY],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
      ],
    },
    {
      name: "Meet & Connect",
      xPercent: 63,
      yPercent: 33,
      xpThreshold: 125,
      resources: ["org_chart"],
      missions: [
        {
          title: "Explore the Org Chart",
          body:
            "Open the Messe München org chart and find your team, your supervisor, and key contacts in other departments.\n\nUnderstanding the structure early helps you navigate the organisation and know who to reach out to.",
          type: MISSION_TYPE.LINK,
          externalUrl: "https://www.messe-muenchen.de/en/company/about-us/",
          xpValue: 5,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.SELF_APPROVE,
        },
        {
          title: "Learn Names & Roles of All Colleagues",
          body:
            "Get the team list from your supervisor. For each person, note their name, role, and main responsibility.\n\nSelf-certify this mission once you feel confident you know your whole team.",
          type: MISSION_TYPE.TEXT,
          xpValue: 10,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.SELF_APPROVE,
        },
        {
          title: "Meet Your Manager",
          body:
            "## First Meeting with Your Line Manager\n\nGet introduced to your line manager — this is the person who will guide your growth and performance at Messe München.\n\nAfter the introduction, show your manager the QR code on your phone. They'll scan it to confirm the meeting happened.\n\n> **Tip:** Bring one or two questions about your role or the team. It signals engagement and gets the relationship off to a good start.",
          type: MISSION_TYPE.TEXT,
          xpValue: 10,
          tags: [MISSION_TAG.MANDATORY],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Meet Your Team Colleagues",
          body:
            "## Team Introductions\n\nGet introduced to all your direct team colleagues — ideally in a team meeting or a quick round of desk introductions.\n\nOnce you've met everyone, show your supervisor the QR code so they can validate the introduction round.\n\n> The first impression you make is the one that sticks. A few words about where you're coming from and what you're excited about goes a long way.",
          type: MISSION_TYPE.TEXT,
          xpValue: 15,
          tags: [MISSION_TAG.MANDATORY],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Meet the IT Systems Specialist",
          body:
            "## Your Anwenderspezialist\n\nGet introduced to the IT systems specialist (Anwenderspezialist) responsible for your team. They're your go-to person for system access, software questions, and IT issues beyond the helpdesk.\n\nShow them your QR code to confirm the introduction.",
          type: MISSION_TYPE.TEXT,
          xpValue: 10,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Attend Welcome Lunch",
          body:
            "## Welcome Lunch with Your Team\n\nJoin your supervisor and team for a welcome lunch. This is your chance to connect in a relaxed setting — no agenda, just getting to know each other.\n\nAfter the lunch, show your supervisor or buddy the QR code to validate your attendance.\n\n> 📍 **Canteen, Building A** or a restaurant of the team's choosing.",
          type: MISSION_TYPE.TEXT,
          xpValue: 15,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Department Orientation Tour",
          body:
            "## Tour Your Department Area\n\nJoin the department orientation tour led by your supervisor. You'll get to see key areas of your own department and learn where things are.\n\nAfter the tour, show the QR code to the person who led it so they can confirm.\n\n> The tour typically takes 30–45 minutes and covers desks, meeting rooms, printing, storage, and emergency exits.",
          type: MISSION_TYPE.TEXT,
          xpValue: 10,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Meet the Head of Department",
          body:
            "## Your Department Head\n\nGet introduced to the head of your department. This is a brief but important moment — they set the direction for your team and it's good to have a face to the name early on.\n\nShow them your QR code to confirm the introduction.",
          type: MISSION_TYPE.TEXT,
          xpValue: 10,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Campus Orientation Tour",
          body:
            "## Explore the Campus\n\nJoin the campus tour and locate the following:\n\n- **Canteen** (your daily lunch spot)\n- **Printer/copier** nearest to your desk\n- **First aid kit** and emergency exits for your floor\n- **Storage and office supplies** location\n- **Fire extinguisher** positions\n- **Notice board** for your department\n- **Time-stamping terminals** (Stempeluhr)\n\nOnce done, show your QR code to the person who led the tour.\n\n> Estimated time: 30–45 minutes.",
          type: MISSION_TYPE.TEXT,
          xpValue: 10,
          tags: [MISSION_TAG.MANDATORY],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Understand Working with Other Departments",
          body:
            "## Cross-Department Collaboration\n\nAsk your supervisor how your team typically interacts with other departments at Messe München. Find out:\n\n- Which departments you'll work with most\n- What the typical communication channels are\n- Any informal norms (Betriebliche Umgangsformen) to be aware of\n\nShow your supervisor the QR code once you've had this conversation.",
          type: MISSION_TYPE.TEXT,
          xpValue: 10,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Meet 3 Colleagues from Other Departments",
          body:
            "Step outside your immediate team and introduce yourself to at least 3 people from other departments.\n\nThis could happen over coffee, in the canteen, or by just walking over and saying hello. Self-certify when you've made three connections.\n\n> **Challenge:** Try to meet someone from Sales, IT, and one other department of your choice.",
          type: MISSION_TYPE.TEXT,
          xpValue: 20,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.SELF_APPROVE,
        },
      ],
    },
    {
      name: "Learn the Role",
      xPercent: 88,
      yPercent: 33,
      xpThreshold: 85,
      resources: ["wenet"],
      missions: [
        {
          title: "Read Role Description & Quality Policy",
          body:
            "## Know Your Role\n\nReview your role description and read the relevant quality policy and quality aspects for your position. Make sure you understand your main tasks and responsibilities.\n\nDiscuss any questions with your supervisor, then show them the QR code to validate.\n\n> Your role description and quality policy documents are available from your supervisor or on WeNet.",
          type: MISSION_TYPE.TEXT,
          xpValue: 15,
          tags: [MISSION_TAG.MANDATORY],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Explore Department Info on WeNet",
          body:
            "Open WeNet and find the section for your department. Read through the department-specific information and note any important contacts or resources listed there.\n\nMark this mission complete once you've had a look around.",
          type: MISSION_TYPE.LINK,
          externalUrl: "https://www.messe-muenchen.de/en/company/about-us/",
          xpValue: 5,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.SELF_APPROVE,
        },
        {
          title: "Understand Key Department & Business Processes",
          body:
            "Review the key department and business processes relevant to your role. Understand the service portfolio and see how your role connects to it.\n\nAfter reviewing, discuss what you've learned with your supervisor — they'll scan your QR code to validate.",
          type: MISSION_TYPE.LINK,
          externalUrl: "https://www.messe-muenchen.de/en/company/about-us/",
          xpValue: 15,
          tags: [MISSION_TAG.MANDATORY],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Learn Company Goals & Strategy",
          body:
            "Read the company goals and strategy overview. The key question to hold in mind: how does your team's work connect to the wider company objectives?\n\nDiscuss with your supervisor and show them the QR code when done.",
          type: MISSION_TYPE.LINK,
          externalUrl: "https://www.messe-muenchen.de/en/company/strategy/",
          xpValue: 10,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Dress Code & Work Materials",
          body:
            "Ask your supervisor about the dress code or any specific work clothing required for your role. Confirm what work materials you'll need and where to get them.\n\nSelf-certify once you've clarified this.",
          type: MISSION_TYPE.TEXT,
          xpValue: 5,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.SELF_APPROVE,
        },
        {
          title: "Shadow a Colleague for Half a Day",
          body:
            "## Shadowing Session\n\nYour supervisor will arrange a half-day shadowing session with a colleague in your team. Attend, observe, ask questions, and take notes.\n\nAfter the session, show the QR code to the colleague you shadowed — they'll confirm it.\n\n> **Tip:** Prepare 3–5 questions beforehand. What does a typical morning look like? What's the hardest part of this role? What do you wish you'd known earlier?",
          type: MISSION_TYPE.TEXT,
          xpValue: 20,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Complete Core E-Learnings",
          body:
            "Complete the core e-learning modules assigned to your role. These cover the foundational knowledge and compliance topics every Messe München employee needs.\n\nMark complete once you've finished all required modules.",
          type: MISSION_TYPE.LINK,
          externalUrl: "https://www.messe-muenchen.de/en/company/about-us/",
          xpValue: 15,
          tags: [MISSION_TAG.MANDATORY],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.SELF_APPROVE,
        },
      ],
    },
    {
      name: "Culture & Benefits",
      xPercent: 13,
      yPercent: 67,
      xpThreshold: 35,
      resources: ["benefits"],
      missions: [
        {
          title: "Explore Social Benefits",
          body:
            "Read through the social benefits overview and note 2–3 benefits you want to activate. Messe München offers a range of perks — from transport subsidies to sports facilities.\n\nMark complete once you've reviewed the overview.",
          type: MISSION_TYPE.LINK,
          externalUrl:
            "https://www.messe-muenchen.de/en/company/career/benefits/",
          xpValue: 5,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.SELF_APPROVE,
        },
        {
          title: "Attend a Messe Event",
          body:
            "## Experience Messe Culture First-Hand\n\nAttend a Messe München event that interests you — a trade fair, an internal culture event, or a team gathering.\n\nAfter the event, show your QR code to the event organiser or a colleague who was present. They'll confirm your attendance.\n\n> Check the internal events calendar on WeNet for upcoming events in your first month.",
          type: MISSION_TYPE.TEXT,
          xpValue: 15,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Month Check-In with Supervisor",
          body:
            "## One-Month Check-In\n\nSchedule a meeting with your supervisor to discuss your progress after your first month. Bring your questions, reflect on what you've learned, and agree on goals for the next phase.\n\nShow your supervisor the QR code at the end of the meeting to validate it.\n\n> **Suggested agenda:** What's going well? What's still unclear? What do I need more support with? Goals for months 2–3.",
          type: MISSION_TYPE.TEXT,
          xpValue: 15,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
      ],
    },
    {
      name: "First Contributions",
      xPercent: 38,
      yPercent: 67,
      xpThreshold: 50,
      missions: [
        {
          title: "Learn Your First Tasks",
          body:
            "## Your First Real Work\n\nYour supervisor will define and clarify the specific tasks for your role. This is where onboarding becomes the job.\n\nAfter the briefing, show your supervisor the QR code so they can confirm the handoff.\n\n> The clearer you are on your first tasks, the faster you can contribute. Ask: What does success look like in week 2?",
          type: MISSION_TYPE.TEXT,
          xpValue: 10,
          tags: [MISSION_TAG.MANDATORY],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Attend a Client or Cross-Team Meeting",
          body:
            "## Your First Real Meeting\n\nYour supervisor will add you to a relevant client meeting or cross-team session. Attend, observe, and contribute where appropriate.\n\nAfterwards, show the QR code to the meeting organiser or your supervisor to validate.\n\n> Don't worry about having all the answers — listening and understanding context is the goal at this stage.",
          type: MISSION_TYPE.TEXT,
          xpValue: 15,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "Day 1 Progress Conversation",
          body:
            "## End of Day 1 Debrief\n\nSit down with your supervisor after your first day and talk through how the onboarding is going. What worked? What felt confusing? What would help?\n\nShow your supervisor the QR code to validate the conversation happened.\n\n> This is a two-way check-in — your supervisor benefits from hearing your fresh perspective too.",
          type: MISSION_TYPE.TEXT,
          xpValue: 10,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
        {
          title: "30-Day Progress Conversation",
          body:
            "## 30-Day Review\n\nReview your onboarding progress together with your supervisor at the 30-day mark. Reflect on what you've accomplished, what you're still learning, and agree on goals for months 2–3.\n\nShow your supervisor the QR code to confirm the conversation.\n\n> **Good questions to bring:** What should I prioritise next? Am I meeting expectations so far? What would make me more effective?",
          type: MISSION_TYPE.TEXT,
          xpValue: 15,
          tags: [],
          isInCurrentMissions: true,
          validationMethod: VALIDATION_METHOD.QR,
        },
      ],
    },
  ],
};
