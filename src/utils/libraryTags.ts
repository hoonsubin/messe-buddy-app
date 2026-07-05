import type { LibraryResource } from "../types/index.ts";

/** Normalize a single tag for storage and comparison. */
export const normalizeTag = (input: string): string =>
  input.trim().toLowerCase().replace(/\s+/g, "-").replace(/,/g, "");

/** Parse comma-separated tags from PB text field. */
export const parseLibraryTags = (raw?: string): ReadonlyArray<string> => {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw.split(",").map((t) => normalizeTag(t)).filter(Boolean),
    ),
  ];
};

/** Serialize tags for PB storage (comma-separated). */
export const serializeLibraryTags = (
  tags: ReadonlyArray<string>,
): string | undefined => {
  const normalized = [...new Set(tags.map(normalizeTag).filter(Boolean))];
  return normalized.length > 0 ? normalized.join(",") : undefined;
};

/** Distinct tags across the catalog — drives suggestion chips. */
export const collectTagSuggestions = (
  resources: ReadonlyArray<LibraryResource>,
): ReadonlyArray<string> => {
  const all = resources.flatMap((r) => parseLibraryTags(r.tags));
  return [...new Set(all)].sort((a, b) => a.localeCompare(b));
};
