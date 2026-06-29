/** Joins class name segments, skipping falsy values. */
export function cn(
  ...parts: ReadonlyArray<string | false | undefined | null>
): string {
  return parts.filter(Boolean).join(" ");
}
