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

const sourceUrl = (source: EntrySource, origin: string) => {
  const target = new URL("/", origin);
  target.searchParams.set("source", source);
  return target;
};

const normalizeToSource = (source: EntrySource, origin: string) => {
  window.location.replace(sourceUrl(source, origin).toString());
};

export default function LiffEntryGuard({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initialUrl = new URL(window.location.href);
    const initialState = initialUrl.searchParams.get("liff.state");
    const initialSource = getPreferredSource(initialUrl, initialState);
    const initialSources = initialUrl.searchParams.getAll("source");

    // Normalize duplicate source parameters before any page logic reads the first one.
    if (!initialState && initialSource && initialSources.length > 1) {
      normalizeToSource(initialSource, initialUrl.origin);
      return;
    }

    // Normal LINE/poster entries can continue to the existing page flow.
    // Table entries are handled here so the customer goes straight to the
    // digital coloring experience without seeing the coloring-choice screen.
    if (!initialState && initialSource !== "table") {
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
        const restoredSource = getPreferredSource(currentUrl, currentState) || initialSource;

        if (restoredSource === "table") {
          const cleanTableUrl = sourceUrl("table", currentUrl.origin);

          if (!liff.isLoggedIn()) {
            liff.login({ redirectUri: cleanTableUrl.toString() });
            return;
          }

          const idToken = liff.getIDToken();
          if (!idToken) throw new Error("line_id_token_missing");

          const sessionResponse = await fetch("/api/line/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken, action: "opened", source: "table" }),
          });
          const sessionData = await sessionResponse.json();
          if (!sessionResponse.ok || !sessionData.coloringPass) {
            throw new Error(sessionData.error || "table_coloring_pass_failed");
          }

          const entryResponse = await fetch("/api/coloring/entry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idToken,
              mode: "event",
              source: "table",
            }),
          });
          const entryData = await entryResponse.json();
          if (!entryResponse.ok || !entryData.entryUrl) {
            throw new Error(entryData.error || "coloring_entry_failed");
          }

          window.location.assign(entryData.entryUrl);
          return;
        }

        // LINE and poster entries still use the diagnosis page, but normalize them
        // only after LIFF initialization has restored the additional parameters.
        if (restoredSource === "line" || restoredSource === "poster") {
          normalizeToSource(restoredSource, currentUrl.origin);
          return;
        }

        setReady(true);
      } catch {
        // If the direct table handoff fails, fall back to the existing page UI so
        // the customer still gets a visible error/retry path instead of a blank page.
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
