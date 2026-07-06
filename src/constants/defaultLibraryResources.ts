import type { LibraryResource, PBRecord } from "../types/index.ts";

/**
 * The shared-library resources referenced by `DEFAULT_ONBOARDING_TEMPLATE`'s
 * milestone `resources` bindings (`resourceKey`s: campus_map, wenet, it_help,
 * welcome_video, absence, org_chart, benefits). This is the single declared
 * source for these 7 resources — no ids or timestamps here; those are
 * assigned by `adapter.createLibraryResource` when `seedLibraryResources`
 * writes them into a mock or PocketBase instance.
 */
export const DEFAULT_LIBRARY_RESOURCES: ReadonlyArray<
  Omit<LibraryResource, keyof PBRecord>
> = [
  {
    resourceKey: "campus_map",
    title: "Campus Map",
    description: "Find your way around the Messe München grounds",
    type: "guide",
    url: "https://www.messe-muenchen.de/en/trade-fair-venue/fair-grounds/",
    tags: "facilities,onboarding",
  },
  {
    resourceKey: "wenet",
    title: "WeNet (Intranet)",
    description: "Policies, news, and department-specific info",
    type: "link",
    url: "https://www.messe-muenchen.de/en/company/about-us/",
    tags: "intranet,it",
  },
  {
    resourceKey: "it_help",
    title: "IT Help Desk",
    description: "Technical support — Building A, Ground Floor, 08:00–18:00",
    type: "link",
    url: "https://www.messe-muenchen.de/en/company/about-us/",
    tags: "it",
  },
  {
    resourceKey: "welcome_video",
    title: "CEO Welcome Video",
    description: "A message from the management board",
    type: "video",
    url: "https://www.messe-muenchen.de/en/company/about-us/",
    tags: "video,pre-boarding",
  },
  {
    resourceKey: "absence",
    title: "Absence & Time-Off Policy",
    description: "How to report absences and request leave",
    type: "document",
    url: "https://www.messe-muenchen.de/en/company/about-us/",
    tags: "hr",
  },
  {
    resourceKey: "org_chart",
    title: "Organisation Chart",
    description: "Full org structure and reporting lines (GM only)",
    type: "document",
    url: "https://www.messe-muenchen.de/en/company/about-us/",
    tags: "onboarding",
  },
  {
    resourceKey: "benefits",
    title: "Employee Benefits Overview",
    description: "Transport, sports, canteen, and social perks",
    type: "document",
    url: "https://www.messe-muenchen.de/en/company/career/benefits/",
    tags: "hr,onboarding",
  },
];
