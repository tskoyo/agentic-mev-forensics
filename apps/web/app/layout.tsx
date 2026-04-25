import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MEV Forensics — Observability",
  description: "Autonomous investigator for underperforming MEV trades.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-canvas text-text-p">{children}</body>
    </html>
  );
}
