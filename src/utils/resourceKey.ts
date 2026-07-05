/** Slugify a title into a stable library resource key (max 40 chars). */
export const generateResourceKey = (title: string): string =>
  title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
    .slice(0, 40) || "resource";

/** Append _2, _3, … until key is not in existingKeys. */
export const ensureUniqueResourceKey = (
  base: string,
  existingKeys: ReadonlySet<string> | ReadonlyArray<string>,
): string => {
  const taken = existingKeys instanceof Set
    ? existingKeys
    : new Set(existingKeys);
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const suffix = `_${n}`;
    const candidate = `${base.slice(0, 40 - suffix.length)}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base.slice(0, 32)}_${crypto.randomUUID().slice(0, 7)}`;
};
