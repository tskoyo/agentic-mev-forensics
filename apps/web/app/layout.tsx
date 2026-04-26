import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MEV Forensics",
  description: "Autonomous investigator for underperforming MEV trades.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Apply saved theme before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=document.documentElement;if(t==='dark'||(t==null&&window.matchMedia('(prefers-color-scheme:dark)').matches))d.dataset.theme='dark';else d.dataset.theme='light'}catch(e){}})()`
          }}
        />
      </head>
      <body
        className="font-sans bg-canvas text-text-p"
        style={{ fontFamily: "var(--font-inter, Inter, ui-sans-serif, system-ui, sans-serif)" }}
      >
        {children}
      </body>
    </html>
  );
}
