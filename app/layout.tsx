import type { Metadata } from "next";
import "./globals.css";
import "./trial-preview-overrides.css";

export const metadata: Metadata = {
  title: "休日診断",
  description: "4つのことばから、今日の休日の過ごし方をご案内します。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

const eventEntryFallbackScript = `
(() => {
  const EVENT_START = "2026-08-22";

  const japanDayKey = () => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const recoverSourceFromLiffState = () => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("source") === "table") return true;

      const rawState = url.searchParams.get("liff.state");
      if (!rawState) return false;

      const candidates = [rawState];
      try {
        const decoded = decodeURIComponent(rawState);
        if (decoded !== rawState) candidates.push(decoded);
      } catch {}

      for (const candidate of candidates) {
        let stateUrl;
        try {
          if (/^https?:\\/\\//i.test(candidate)) {
            stateUrl = new URL(candidate);
          } else if (candidate.startsWith("?")) {
            stateUrl = new URL("/" + candidate, window.location.origin);
          } else {
            stateUrl = new URL(candidate.startsWith("/") ? candidate : "/" + candidate, window.location.origin);
          }
        } catch {
          continue;
        }

        const recovered = stateUrl.searchParams.get("source");
        if (recovered === "table") {
          url.searchParams.set("source", "table");
          window.history.replaceState(null, "", url.toString());
          return true;
        }
      }
    } catch {}
    return false;
  };

  // LIFFの一次リダイレクトでは追加クエリが liff.state に入ることがある。
  // Reactが起動する前に source=table を復元して、卓上QRとして判定させる。
  recoverSourceFromLiffState();

  const shouldPromoteToTableEntry = () => {
    try {
      if (japanDayKey() < EVENT_START) return false;
      const url = new URL(window.location.href);
      const source = url.searchParams.get("source") || "direct";
      if (source === "table") return false;

      // LIFF stateに卓上QR情報が残っていれば、通常の診断結果には戻さない。
      const rawState = url.searchParams.get("liff.state") || "";
      if (/source(?:%3D|=)table/i.test(rawState)) return Boolean(document.querySelector(".result-card"));

      // 直接URLで開かれ、診断済み結果へ戻ったケースも卓上参加として救済する。
      if (source !== "direct") return false;
      return Boolean(document.querySelector(".result-card"));
    } catch {
      return false;
    }
  };

  const promote = () => {
    recoverSourceFromLiffState();
    if (!shouldPromoteToTableEntry()) return false;
    const url = new URL(window.location.href);
    url.searchParams.set("source", "table");
    window.location.replace(url.toString());
    return true;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", promote, { once: true });
  } else {
    promote();
  }

  const observer = new MutationObserver(() => {
    if (promote()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <script dangerouslySetInnerHTML={{ __html: eventEntryFallbackScript }} />
        {children}
      </body>
    </html>
  );
}
