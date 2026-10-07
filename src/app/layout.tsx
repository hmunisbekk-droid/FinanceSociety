import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "WIUT Finance Society",
    template: "%s · WIUT Finance Society",
  },
  description:
    "Level-based study materials, quizzes with worked solutions and events for WIUT finance students.",
};

export const viewport: Viewport = {
  themeColor: "#0b1f3a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-dvh flex-col font-sans">{children}</body>
    </html>
  );
}
