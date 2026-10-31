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
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
