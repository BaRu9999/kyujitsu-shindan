"use client";

import { useEffect, useState, type ReactNode } from "react";

const recoverTableSource = (rawState: string | null) => {
  if (!rawState) return false;

  const candidates = [rawState];
  try {
    const decoded = decodeURIComponent(rawState);
    if (decoded !== rawState) candidates.push(decoded);
  } catch {
    // Keep the original state when it is not URI encoded.
  }

  for (const candidate of candidates) {
    try {
      const stateUrl = candidate.startsWith("http")
        ? new URL(candidate)
        : new URL(candidate.startsWith("/") ? candidate : `/${candidate}`, window.location.origin);
      if (stateUrl.searchParams.get("source") === "table") return true;
    } catch {
      // Try the next representation.
    }
  }

  return /(?:^|[?&])source(?:%3D|=)table(?:&|$)/i.test(rawState);
};

export default function LiffEntryGuard({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initialUrl = new URL(window.location.href);
    const initialState = initialUrl.searchParams.get("liff.state");

    if (!initialState) {
      setReady(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) return;

        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });

        const currentUrl = new URL(window.location.href);
        const currentState = currentUrl.searchParams.get("liff.state") || initialState;
        const isTable = currentUrl.searchParams.get("source") === "table" || recoverTableSource(currentState);

        if (isTable) {
          currentUrl.searchParams.set("source", "table");
          window.history.replaceState(null, "", currentUrl.toString());
        }
      } catch {
        // The page's existing LINE handling will show any LIFF error.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return children;
}
