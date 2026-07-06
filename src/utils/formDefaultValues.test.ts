import assert from "node:assert/strict";
import type { FieldSchema } from "../types/index.ts";
import {
  buildFormDefaultValues,
  formInitKey,
} from "./formDefaultValues.ts";

const fields = [
  { id: "preferredName", label: "Preferred Name", type: "text", required: true },
  { id: "role", label: "Job Title", type: "text", required: true },
] satisfies ReadonlyArray<FieldSchema>;

Deno.test("buildFormDefaultValues fills missing fields with empty strings", () => {
  const result = buildFormDefaultValues({ preferredName: "PB" }, fields);
  assert.equal(result.preferredName, "PB");
  assert.equal(result.role, "");
});

Deno.test("formInitKey changes when initialValues change", () => {
  const a = formInitKey("m1", fields, { preferredName: "" });
  const b = formInitKey("m1", fields, { preferredName: "PB" });
  assert.notEqual(a, b);
});

Deno.test("formInitKey is stable for identical inputs", () => {
  const values = { preferredName: "PB", role: "QA" };
  assert.equal(
    formInitKey("m1", fields, values),
    formInitKey("m1", fields, values),
  );
});
