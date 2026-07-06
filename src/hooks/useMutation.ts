import { useCallback, useEffect, useRef, useState } from "react";
import { devBackendTrace } from "../store/devBackendTrace.ts";
import { useQueryClient } from "../store/useQueryClient.ts";

export interface UseMutationOptions<TArgs, TResult> {
  readonly mutationFn: (args: TArgs) => Promise<TResult>;
  readonly invalidateKeys?: (
    args: TArgs,
    result: TResult,
  ) => ReadonlyArray<string>;
  readonly label?: string;
}

export interface UseMutationResult<TArgs, TResult> {
  readonly mutate: (args: TArgs) => Promise<TResult>;
  readonly isPending: boolean;
  readonly error: Error | null;
}

export const useMutation = <TArgs, TResult>(
  options: UseMutationOptions<TArgs, TResult>,
): UseMutationResult<TArgs, TResult> => {
  const client = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  const mutate = useCallback(
    async (args: TArgs): Promise<TResult> => {
      const { mutationFn, invalidateKeys, label = "mutation" } =
        optionsRef.current;
      devBackendTrace.mutationStart(label);
      setIsPending(true);
      setError(null);
      try {
        const result = await mutationFn(args);
        const keys = invalidateKeys?.(args, result) ?? [];
        if (keys.length > 0) client.invalidateQuery(keys);
        devBackendTrace.mutationDone(label, keys);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        devBackendTrace.mutationError(label, err.message);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [client],
  );

  return { mutate, isPending, error };
};
