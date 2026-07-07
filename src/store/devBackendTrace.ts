/** Dev-only, session-scoped backend interaction trace for this browser tab. */

export type DevTraceKind =
  | "query:fetch"
  | "query:coalesce"
  | "query:hit"
  | "query:invalidate"
  | "query:patch"
  | "mutation:start"
  | "mutation:done"
  | "mutation:error"
  | "adapter:call"
  | "sse:subscribe"
  | "sse:event";

export interface DevTraceEvent {
  readonly ts: number;
  readonly sessionId: string;
  readonly kind: DevTraceKind;
  readonly detail: Readonly<Record<string, unknown>>;
}

export interface DevBackendTraceApi {
  readonly getLog: (sessionId?: string) => ReadonlyArray<DevTraceEvent>;
  readonly clear: (sessionId?: string) => void;
  readonly setEnabled: (enabled: boolean) => void;
  readonly isEnabled: () => boolean;
  readonly setActiveScope: (sessionId: string) => void;
}

const RING_MAX = 200;
const PUBLIC_SCOPE = "_public";
const GLOBAL_SCOPE = "_global";

const buffers = new Map<string, DevTraceEvent[]>();
let enabledOverride: boolean | null = null;
let activeScope = PUBLIC_SCOPE;

const isDevRuntime = (): boolean => {
  try {
    return import.meta.env.DEV === true;
  } catch {
    return false;
  }
};

const isTraceEnabled = (): boolean => {
  if (!isDevRuntime()) return false;
  if (enabledOverride !== null) return enabledOverride;
  try {
    return localStorage.getItem("mb_dev_trace") !== "0";
  } catch {
    return true;
  }
};

/** Derive a session scope from a query key when no active route scope is set. */
export const sessionIdFromQueryKey = (key: string): string => {
  if (key.startsWith("sessionMeta:")) {
    return key.slice("sessionMeta:".length);
  }
  if (key.startsWith("journey:")) {
    return key.split(":")[1] ?? GLOBAL_SCOPE;
  }
  if (key.startsWith("resources:")) {
    return key.split(":")[1] ?? GLOBAL_SCOPE;
  }
  if (key.startsWith("gmRoster:")) {
    return key.slice("gmRoster:".length);
  }
  if (key.startsWith("buddyPicker:")) {
    return key.slice("buddyPicker:".length);
  }
  return activeScope;
};

const pushEvent = (event: DevTraceEvent): void => {
  if (!isTraceEnabled()) return;

  const bucket = buffers.get(event.sessionId) ?? [];
  bucket.push(event);
  if (bucket.length > RING_MAX) bucket.shift();
  buffers.set(event.sessionId, bucket);

  const detail = Object.entries(event.detail)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(" ");
  const message = `[mb:trace:${event.sessionId}] ${event.kind}${
    detail ? ` ${detail}` : ""
  }`;
  if (event.kind === "query:fetch" || event.kind === "mutation:done") {
    console.info(message);
  } else {
    console.debug(message);
  }
};

const emit = (
  kind: DevTraceKind,
  detail: Readonly<Record<string, unknown>>,
  sessionId?: string,
): void => {
  const scope = sessionId ?? activeScope;
  pushEvent({ ts: Date.now(), sessionId: scope, kind, detail });
};

export const devBackendTrace = {
  setActiveScope(sessionId: string): void {
    activeScope = sessionId || PUBLIC_SCOPE;
  },

  queryFetch(key: string): void {
    emit("query:fetch", { key, deduped: false }, sessionIdFromQueryKey(key));
  },

  queryCoalesce(key: string): void {
    emit("query:coalesce", { key }, sessionIdFromQueryKey(key));
  },

  queryHit(key: string, ageMs: number): void {
    emit("query:hit", { key, ageMs }, sessionIdFromQueryKey(key));
  },

  queryInvalidate(keys: ReadonlyArray<string>): void {
    for (const key of keys) {
      emit("query:invalidate", { key }, sessionIdFromQueryKey(key));
    }
  },

  queryPatch(key: string): void {
    emit("query:patch", { key }, sessionIdFromQueryKey(key));
  },

  mutationStart(label: string, invalidates: ReadonlyArray<string> = []): void {
    emit("mutation:start", { label, invalidates });
  },

  mutationDone(label: string, invalidates: ReadonlyArray<string> = []): void {
    emit("mutation:done", { label, invalidates });
  },

  mutationError(label: string, message: string): void {
    emit("mutation:error", { label, message });
  },

  adapterCall(method: string, args: Readonly<Record<string, unknown>>): void {
    emit("adapter:call", { method, args });
  },

  sseSubscribe(playerId: string, missionId: string): void {
    emit("sse:subscribe", { playerId, missionId });
  },

  sseEvent(playerId: string, missionId: string): void {
    emit("sse:event", { playerId, missionId });
  },
};

const api: DevBackendTraceApi = {
  getLog(sessionId?: string) {
    if (sessionId === undefined) {
      return [...buffers.values()].flat();
    }
    return [...(buffers.get(sessionId) ?? [])];
  },
  clear(sessionId?: string) {
    if (sessionId === undefined) buffers.clear();
    else buffers.delete(sessionId);
  },
  setEnabled(enabled: boolean) {
    enabledOverride = enabled;
    try {
      localStorage.setItem("mb_dev_trace", enabled ? "1" : "0");
    } catch {
      /* ignore */
    }
  },
  isEnabled: isTraceEnabled,
  setActiveScope(sessionId: string) {
    devBackendTrace.setActiveScope(sessionId);
  },
};

declare global {
  interface Window {
    __MB_DEV_TRACE__?: DevBackendTraceApi;
  }
}

if (isDevRuntime() && typeof globalThis.window !== "undefined") {
  globalThis.window.__MB_DEV_TRACE__ = api;
}
