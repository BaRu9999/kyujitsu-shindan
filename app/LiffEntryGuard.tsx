"use client";

import { useEffect, useState, type ReactNode } from "react";

type EntrySource = "table" | "poster" | "line";

const SOURCE_PRIORITY: EntrySource[] = ["table", "poster", "line"];

const pickPreferredSource = (sources: Array<string | null | undefined>): EntrySource | null => {
  const normalized = new Set(
    sources
      .filter((source): source is string => Boolean(source))
      .map((source) => source.toLowerCase()),
  );

  return SOURCE_PRIORITY.find((source) => normalized.has(source)) || null;
};

const recoverSourcesFromLiffState = (rawState: string | null) => {
  if (!rawState) return [] as string[];

  const recovered: string[] = [];
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
      recovered.push(...stateUrl.searchParams.getAll("source"));
    } catch {
      // Try the next representation.
    }
  }

  for (const match of rawState.matchAll(/(?:^|[?&])source(?:%3D|=)(table|line|poster)(?=&|$)/gi)) {
    recovered.push(match[1]);
  }

  return recovered;
};

const getPreferredSource = (url: URL, rawState: string | null) => pickPreferredSource([
  ...url.searchParams.getAll("source"),
  ...recoverSourcesFromLiffState(rawState),
]);

const normalizeToSource = (source: EntrySource, origin: string) => {
  const target = new URL("/", origin);
  target.searchParams.set("source", source);
  window.location.replace(target.toString());
};

export default function LiffEntryGuard({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initialUrl = new URL(window.location.href);
    const initialState = initialUrl.searchParams.get("liff.state");
    const initialSource = getPreferredSource(initialUrl, initialState);
    const initialSources = initialUrl.searchParams.getAll("source");

    // If the LIFF secondary redirect has already completed and both endpoint and
    // additional source parameters are present, normalize before the app reads the
    // first source value. Table always wins over poster, and poster over line.
    if (!initialState) {
      if (initialSource && (initialSources.length > 1 || initialSources[0] !== initialSource)) {
        normalizeToSource(initialSource, initialUrl.origin);
        return;
      }
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
        const currentState = currentUrl.searchParams.get("liff.state") || initialState;
        const restoredSource = getPreferredSource(currentUrl, currentState);

        // The endpoint may contribute source=line while the QR contributes
        // source=table. Never let the endpoint value hide the QR source.
        if (restoredSource) {
          normalizeToSource(restoredSource, currentUrl.origin);
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
