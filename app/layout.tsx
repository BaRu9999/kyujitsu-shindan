import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
