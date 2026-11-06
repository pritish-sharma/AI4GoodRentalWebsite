"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "./client-api";

/** Loads `path` with the user's token. Call `reload()` after changing something. */
export function useApiData<T>(path: string, token: string) {
  const [result, setResult] = useState<{ key: string; data?: T; error?: string } | null>(null);
  const [version, setVersion] = useState(0);
  const key = `${path}#${version}`;

  useEffect(() => {
    let cancelled = false;
    apiRequest<T>(path, token)
      .then((data) => !cancelled && setResult({ key, data }))
      .catch((err: Error) => !cancelled && setResult({ key, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [path, token, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  // Keep showing the previous data while a reload is in flight, so lists don't flash.
  return {
    data: result?.data,
    error: result?.error,
    loading: result === null,
    refreshing: result !== null && result.key !== key,
    reload,
  };
}
