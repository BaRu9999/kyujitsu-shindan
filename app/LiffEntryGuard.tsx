"use client";

import { useEffect, useState, type ReactNode } from "react";

const recoverSourceFromLiffState = (rawState: string | null) => {
  if (!rawState) return null;

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
      const source = stateUrl.searchParams.get("source");
      if (source === "table" || source === "line" || source === "poster") return source;
    } catch {
      // Try the next representation.
    }
  }

  const match = rawState.match(/(?:^|[?&])source(?:%3D|=)(table|line|poster)(?:&|$)/i);
  return match?.[1]?.toLowerCase() || null;
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
        if (!liffId) {
          if (!cancelled) setReady(true);
          return;
        }

        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });

        if (cancelled) return;

        const currentUrl = new URL(window.location.href);
        const restoredSource = currentUrl.searchParams.get("source") || recoverSourceFromLiffState(initialState);

        // The table QR must never render the diagnosis page on the primary LIFF redirect.
        // After liff.init() resolves, force a clean secondary-style URL and let the app
        // boot from scratch as a table entry.
        if (restoredSource === "table") {
          const target = new URL("/", currentUrl.origin);
          target.searchParams.set("source", "table");
          window.location.replace(target.toString());
          return;
        }

        // For the other LIFF entry sources, normalize them after LIFF initialization too.
        if (restoredSource === "line" || restoredSource === "poster") {
          const target = new URL("/", currentUrl.origin);
          target.searchParams.set("source", restoredSource);
          window.location.replace(target.toString());
          return;
        }

        setReady(true);
      } catch {
        // The page's existing LINE handling will show any LIFF error.
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
