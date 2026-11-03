import Link from "next/link";
import { Logo } from "@/components/logo";
import { BRAND, BRAND_SOCIALS } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <Logo />
          <span className="text-xs">
            © {new Date().getFullYear()} {BRAND} · Think like a brand.
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-5">
          <Link href="/harga" className="hover:text-foreground">Harga</Link>
          <Link href="/terms" className="hover:text-foreground">Syarat Layanan</Link>
          <Link href="/privacy" className="hover:text-foreground">Kebijakan Privasi</Link>
          <Link href="/refund" className="hover:text-foreground">Kebijakan Refund</Link>
          <Link href="/kontak" className="hover:text-foreground">Kontak</Link>
          <a
            href={BRAND_SOCIALS.instagram.url}
            target="_blank"
            rel="noopener noreferrer me"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
            aria-label={`Instagram ${BRAND}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
            </svg>
            @{BRAND_SOCIALS.instagram.handle}
          </a>
        </div>
      </div>
    </footer>
  );
}
