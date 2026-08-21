import type { Metadata } from "next";
import LiffEntryGuard from "./LiffEntryGuard";
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <LiffEntryGuard>{children}</LiffEntryGuard>
      </body>
    </html>
  );
}
