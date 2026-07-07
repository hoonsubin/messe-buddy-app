import { assertEquals } from "jsr:@std/assert@1";
import { isProgressValidated } from "../store/progressEvents.ts";
import { PROGRESS_STATUS } from "../types/index.ts";

Deno.test("isProgressValidated — completed and autoApproved", () => {
  assertEquals(isProgressValidated(PROGRESS_STATUS.COMPLETED), true);
  assertEquals(isProgressValidated(PROGRESS_STATUS.AUTO_APPROVED), true);
});

Deno.test("isProgressValidated — pending states", () => {
  assertEquals(isProgressValidated(PROGRESS_STATUS.PENDING), false);
  assertEquals(isProgressValidated(PROGRESS_STATUS.PENDING_APPROVAL), false);
});
