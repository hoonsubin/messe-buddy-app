// Polls LiteLLM's /health/readiness (proxied same-origin at /llm in the
// container, see docker/nginx.conf) to decide whether the live AI assistant
// is reachable right now. This is the single source of truth `useChat` uses
// to pick live vs. mock - there is no build-time mock/live flag anymore, so
// the same static bundle (including a no-backend GitHub Pages demo build)
// behaves correctly: reachable → live, unreachable → mock.
//
// Defaults to unavailable until the first check resolves - a brief false
// negative is harmless since the assistant card starts collapsed.
//
// Pass `enabled: false` on non-assistant routes to avoid /llm health polls
// (and console 502 noise) when LiteLLM is not running locally.

import { useEffect, useState } from "react";
import { LLM_BASE_URL } from "../config/llm.ts";

const CHECK_TIMEOUT_MS = 4000;
const RECHECK_INTERVAL_MS = 45_000;

async function checkReadiness(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(`${LLM_BASE_URL}/health/readiness`, {
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const body = await res.json().catch(() => null);
    return body?.status === "healthy";
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function useAssistantAvailability(enabled = true): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    // Keep polling on the fixed interval for as long as this hook is
    // mounted - a transient blip (e.g. an nginx reload from
    // reload-llm-key.sh, or a slow cold start) must not permanently pin the
    // session to mock mode. An earlier version stopped polling after two
    // consecutive failures, which meant a couple of bad checks near session
    // start silently locked the assistant into mock for the rest of the
    // visit, with no way to recover short of a full page reload - the app
    // looked like it "wasn't communicating with the LLM endpoint" even once
    // the backend was healthy again. Polling forever costs one small fetch
    // every RECHECK_INTERVAL_MS; that's cheap compared to a self-healing
    // assistant.
    const run = () => {
      void checkReadiness().then((ok) => {
        if (cancelled) return;
        setAvailable(ok);
      });
    };

    run();
    const interval = setInterval(run, RECHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled]);

  return enabled ? available : false;
}
