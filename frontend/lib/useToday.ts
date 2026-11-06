"use client";

import { useSyncExternalStore } from "react";

function localToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const noSubscribe = () => () => {};

/** Today's date in the viewer's time zone ("YYYY-MM-DD"); undefined during server rendering. */
export function useToday(): string | undefined {
  return useSyncExternalStore(noSubscribe, localToday, () => undefined);
}
