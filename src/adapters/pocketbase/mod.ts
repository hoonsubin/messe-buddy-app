import PocketBase from "pocketbase";
import { createPBAdapter } from "./pbAdapter.ts";

const PB_URL = (() => {
  if (typeof window !== "undefined" && window.__MB_CONFIG__?.pbUrl) {
    return window.__MB_CONFIG__.pbUrl;
  }
  return import.meta.env.VITE_PB_URL ?? "/";
})();

export const pb = new PocketBase(PB_URL);

pb.autoCancellation(false);

export const pbAdapter = createPBAdapter(pb);
