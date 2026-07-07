import type { AppAdapter } from "../adapters/interface.ts";
import { devBackendTrace } from "./devBackendTrace.ts";
import {
  type RealtimeHandlerContext,
  resolveRealtimeHandler,
} from "./realtimeDeps.ts";
import type { RealtimeAction, RealtimeDep } from "./realtimeTypes.ts";
import type { QueryClient } from "./queryClient.ts";

const topicKey = (collection: string, filter?: string): string =>
  `${collection}\0${filter ?? ""}`;

interface TopicState {
  refCount: number;
  readonly queryKeyRefCounts: Map<string, number>;
  unsubscribePb: (() => void) | null;
}

export interface SubscriptionBookkeeper {
  readonly register: (
    adapter: AppAdapter,
    client: QueryClient,
    queryKey: string,
    dep: RealtimeDep,
  ) => () => void;
}

export const createSubscriptionBookkeeper = (): SubscriptionBookkeeper => {
  const topics = new Map<string, TopicState>();

  const dispatch = (
    adapter: AppAdapter,
    client: QueryClient,
    tKey: string,
    collection: string,
    action: RealtimeAction,
    record: unknown,
  ): void => {
    const topic = topics.get(tKey);
    if (!topic) return;

    devBackendTrace.sseEvent(collection, action);

    for (const queryKey of topic.queryKeyRefCounts.keys()) {
      const handler = resolveRealtimeHandler(queryKey);
      const ctx: RealtimeHandlerContext = {
        queryKey,
        collection,
        action,
        record,
        client,
        adapter,
      };

      if (handler) {
        void handler(ctx);
      } else {
        client.invalidateQuery(queryKey);
      }
    }
  };

  const register = (
    adapter: AppAdapter,
    client: QueryClient,
    queryKey: string,
    dep: RealtimeDep,
  ): () => void => {
    const tKey = topicKey(dep.collection, dep.filter);
    let topic = topics.get(tKey);

    if (!topic) {
      topic = {
        refCount: 0,
        queryKeyRefCounts: new Map(),
        unsubscribePb: null,
      };
      topics.set(tKey, topic);
    }

    topic.refCount += 1;
    topic.queryKeyRefCounts.set(
      queryKey,
      (topic.queryKeyRefCounts.get(queryKey) ?? 0) + 1,
    );

    if (topic.refCount === 1) {
      devBackendTrace.sseSubscribe(dep.collection, dep.filter ?? "*");
      topic.unsubscribePb = adapter.subscribeCollection(
        dep.collection,
        dep.filter,
        (action, record) => {
          dispatch(adapter, client, tKey, dep.collection, action, record);
        },
      );
    }

    return () => {
      const current = topics.get(tKey);
      if (!current) return;

      const keyCount = current.queryKeyRefCounts.get(queryKey) ?? 0;
      if (keyCount <= 1) current.queryKeyRefCounts.delete(queryKey);
      else current.queryKeyRefCounts.set(queryKey, keyCount - 1);

      current.refCount -= 1;
      if (current.refCount <= 0) {
        current.unsubscribePb?.();
        topics.delete(tKey);
      }
    };
  };

  return { register };
};

/** App-wide ref-counted PocketBase subscription registry. */
export const subscriptionBookkeeper = createSubscriptionBookkeeper();
