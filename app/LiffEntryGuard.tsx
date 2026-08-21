"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type EntrySource = "table" | "poster" | "line";
type FriendGateState = "idle" | "checking" | "required" | "requesting" | "error";

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
  const [friendGate, setFriendGate] = useState<FriendGateState>("idle");
  const [friendMessage, setFriendMessage] = useState("");
  const [friendCanReauth, setFriendCanReauth] = useState(false);
  const requestFriendshipRef = useRef<null | (() => Promise<void>)>(null);
  const verifyFriendshipRef = useRef<null | (() => Promise<void>)>(null);
  const reauthRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    const initialUrl = new URL(window.location.href);
    const initialState = initialUrl.searchParams.get("liff.state");
    const initialSource = getPreferredSource(initialUrl, initialState);
    const initialSources = initialUrl.searchParams.getAll("source");

    if (!initialState && initialSource && initialSources.length > 1) {
      normalizeToSource(initialSource, initialUrl.origin);
      return;
    }

    if (!initialState && initialSource !== "table") {
      setReady(true);
      return;
    }

    let cancelled = false;
    let activeSource = initialSource;

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
        activeSource = restoredSource;

        if (restoredSource === "table") {
          const cleanTableUrl = sourceUrl("table", currentUrl.origin);

          if (!liff.isLoggedIn()) {
            liff.login({ redirectUri: cleanTableUrl.toString() });
            return;
          }

          reauthRef.current = () => {
            try {
              liff.logout();
            } finally {
              liff.login({ redirectUri: cleanTableUrl.toString() });
            }
          };

          const openColoring = async () => {
            if (cancelled) return;
            setFriendGate("checking");
            setFriendMessage("");
            setFriendCanReauth(false);

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
          };

          const showFriendshipError = async (error: unknown) => {
            if (cancelled) return;
            setFriendGate("error");
            setFriendCanReauth(false);

            const permission = await liff.permission.query("profile").catch(() => null);
            if (cancelled) return;

            if (permission?.state === "unavailable") {
              setFriendMessage("LINE側で友だち確認に必要なプロフィール権限が設定されていません。店舗スタッフへお声がけください。");
              return;
            }

            if (permission?.state === "prompt") {
              setFriendCanReauth(true);
              setFriendMessage("LINEのプロフィール権限がまだ許可されていません。「LINE認証をやり直す」を押してください。");
              return;
            }

            const detail = error instanceof Error ? error.message : String(error || "");
            if (/no login bot linked|bot not found|no bot could be resolved/i.test(detail)) {
              setFriendMessage("LINE Loginと公式LINEの連携設定を確認できません。店舗スタッフへお声がけください。");
              return;
            }

            setFriendMessage("友だち状態の確認でLINE側のエラーが発生しました。もう一度確認してください。");
          };

          const verifyFriendship = async () => {
            if (cancelled) return;
            setFriendGate("checking");
            setFriendMessage("");
            setFriendCanReauth(false);

            try {
              const friendship = await liff.getFriendship();
              if (friendship.friendFlag) {
                await openColoring();
                return;
              }

              setFriendGate("required");
              setFriendMessage("まだ友だち追加を確認できませんでした。友だち追加後に、もう一度確認してください。");
            } catch (error) {
              await showFriendshipError(error);
            }
          };

          requestFriendshipRef.current = async () => {
            if (cancelled) return;
            setFriendGate("requesting");
            setFriendMessage("");
            setFriendCanReauth(false);

            try {
              await liff.requestFriendship();
              await verifyFriendship();
            } catch (error) {
              const detail = error instanceof Error ? error.message : String(error || "");
              if (/no bot could be resolved|subwindowOpen is not allowed/i.test(detail)) {
                await showFriendshipError(error);
                return;
              }
              setFriendGate("required");
              setFriendMessage("友だち追加画面を開けませんでした。公式LINEを友だち追加してから「追加済みか確認する」を押してください。");
            }
          };
          verifyFriendshipRef.current = verifyFriendship;

          await verifyFriendship();
          return;
        }

        if (restoredSource === "line" || restoredSource === "poster") {
          normalizeToSource(restoredSource, currentUrl.origin);
          return;
        }

        setReady(true);
      } catch {
        if (cancelled) return;
        if (activeSource === "table") {
          setFriendGate("error");
          setFriendCanReauth(false);
          setFriendMessage("LINE参加情報を確認できませんでした。卓上QRからもう一度開いてください。");
          return;
        }
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      requestFriendshipRef.current = null;
      verifyFriendshipRef.current = null;
      reauthRef.current = null;
    };
  }, []);

  if (friendGate !== "idle" && !ready) {
    const isBusy = friendGate === "checking" || friendGate === "requesting";
    return (
      <main className="paper-shell">
        <header className="site-header">
          <div>
            <p className="brand">祇園茶寮 × タニタカフェ 柏の葉</p>
            <p className="sub-brand">夏休み限定 デジタルぬりえ</p>
          </div>
          <span className="source-chip">店内・卓上から参加</span>
        </header>
        <section className="center-panel line-status-panel" role="status">
          {isBusy ? <span className="line-loader" aria-hidden="true" /> : <div className="stamp stamp-blue">LINE</div>}
          <p className="section-kicker">公式LINEの友だち確認</p>
          <h1>{friendGate === "required" ? <>友だち追加して<br />ぬりえを始めよう</> : friendGate === "error" ? <>友だち状態を<br />確認できませんでした</> : <>友だち状態を<br />確認しています</>}</h1>
          <p className="lead">作品提出後の特典をLINEで受け取るため、公式LINEの友だち追加が必要です。</p>
          {friendMessage && <p className="form-error" role="alert">{friendMessage}</p>}
          {friendGate === "required" && (
            <>
              <button className="primary-button" onClick={() => void requestFriendshipRef.current?.()}>友だち追加する</button>
              <button className="text-button" onClick={() => void verifyFriendshipRef.current?.()}>追加済みか確認する</button>
            </>
          )}
          {friendGate === "error" && friendCanReauth && (
            <button className="primary-button" onClick={() => reauthRef.current?.()}>LINE認証をやり直す</button>
          )}
          {friendGate === "error" && !friendCanReauth && (
            <button className="primary-button" onClick={() => void verifyFriendshipRef.current?.()}>もう一度確認する</button>
          )}
        </section>
      </main>
    );
  }

  if (!ready) return null;
  return children;
}
