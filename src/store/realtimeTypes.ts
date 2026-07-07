/** PocketBase realtime action names surfaced through the adapter. */
export type RealtimeAction = "create" | "update" | "delete";

export interface RealtimeDep {
  readonly collection: string;
  /** PocketBase filter string; omit to subscribe to the whole collection. */
  readonly filter?: string;
}
