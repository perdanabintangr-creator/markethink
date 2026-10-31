import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { CHAT_PREFS_SCRIPT } from "@/lib/chat-prefs";
import { BRAND } from "@/lib/brand";
import { resolveAppUrl } from "@/lib/env";
import { FONT_SCRIPT } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${BRAND}: Otak Marketing Berbasis AI`, template: `%s · ${BRAND}` },
  description:
    "Partner AI untuk marketing: riset ber-sitasi, strategi, konten, kalender, sampai KPI. Dibuat untuk marketer, UMKM, mahasiswa, dan freelancer Indonesia.",
  metadataBase: new URL(resolveAppUrl()),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: CHAT_PREFS_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: FONT_SCRIPT }} />
        {/* Font brand (logo & judul landing): Montserrat tebal, mirip huruf logo MARQTHINK. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&display=swap" />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
