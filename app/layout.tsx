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

  const shouldPromoteToTableEntry = () => {
    try {
      if (japanDayKey() < EVENT_START) return false;
      const url = new URL(window.location.href);
      const source = url.searchParams.get("source") || "direct";
      if (source !== "direct") return false;
      return Boolean(document.querySelector(".result-card"));
    } catch {
      return false;
    }
  };

  const promote = () => {
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
