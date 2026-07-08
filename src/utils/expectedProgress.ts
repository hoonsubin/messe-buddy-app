// Expected onboarding progress plan, used by the analytics dashboard to compare
// a player's actual completion against where they "should" be by now.
//
// Targets: 20% by week 1, 40% by week 2, 50% by week 3, 70% by week 4,
// 80% by week 5, 100% by week 12. Interpolated linearly between the points.

/** Headline onboarding window shown as "Day X of N". */
export const TOTAL_ONBOARDING_DAYS = 90;

/** [dayOffset, expectedPercent] checkpoints (week N = day 7·N). */
export const EXPECTED_SCHEDULE: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [7, 20],
  [14, 40],
  [21, 50],
  [28, 70],
  [35, 80],
  [84, 100],
];

const DAY_MS = 86_400_000;

/**
 * Number of full days since onboarding started.
 *
 * Uses {@link startDateISO} (player's `startDate` field) when available and
 * valid. Falls back to the earliest progress-event timestamp if the explicit
 * start date is missing or unparseable. Returns 0 as a last resort (day 0 means
 * "started today", which means no expected progress).
 */
export const onboardingDays = (
  startDateISO?: string,
  events?: ReadonlyArray<{ readonly updated: string }>,
): number => {
  let startMs = NaN;

  // Primary: parse the explicit start date
  if (startDateISO) {
    const t = new Date(startDateISO).getTime();
    if (!Number.isNaN(t)) startMs = t;
  }

  // Fallback 1: earliest progress event timestamp
  if (Number.isNaN(startMs) && events?.length) {
    startMs = Math.min(...events.map((e) => new Date(e.updated).getTime()));
  }

  // Fallback 2: assume onboarding started now (day 0)
  if (Number.isNaN(startMs)) return 0;

  return Math.max(0, Math.floor((Date.now() - startMs) / DAY_MS));
};

/** Expected % complete at a given day since onboarding started (0–100). */
export const expectedProgressPct = (days: number): number => {
  if (days <= 0) return 0;
  const last = EXPECTED_SCHEDULE[EXPECTED_SCHEDULE.length - 1]!;
  if (days >= last[0]) return 100;
  for (let i = 1; i < EXPECTED_SCHEDULE.length; i++) {
    const [d1, p1] = EXPECTED_SCHEDULE[i]!;
    if (days <= d1) {
      const [d0, p0] = EXPECTED_SCHEDULE[i - 1]!;
      return p0 + ((days - d0) / (d1 - d0)) * (p1 - p0);
    }
  }
  return 100;
};
