import type { FieldSchema } from "../types/index.ts";

/** Merge player/schema defaults with empty strings for every form field. */
export const buildFormDefaultValues = (
  initialValues: Record<string, string>,
  fields: ReadonlyArray<FieldSchema>,
): Record<string, string> => {
  const defaults: Record<string, string> = { ...initialValues };
  for (const field of fields) {
    if (!(field.id in defaults)) defaults[field.id] = "";
  }
  return defaults;
};

/** Stable key so form state initializes once per mission + schema + prefill. */
export const formInitKey = (
  missionId: string,
  fields: ReadonlyArray<FieldSchema>,
  initialValues: Record<string, string>,
): string =>
  `${missionId}:${fields.map((f) => f.id).join("|")}:${
    JSON.stringify(initialValues)
  }`;
