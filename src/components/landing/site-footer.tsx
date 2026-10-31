import Link from "next/link";
import { Logo } from "@/components/logo";
import { BRAND } from "@/lib/brand";

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
        </div>
      </div>
    </footer>
  );
}
