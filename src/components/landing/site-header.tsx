import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";

/** Header halaman publik (landing & harga): gelap, menempel di atas. */
export function SiteHeader({ loggedIn }: { loggedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050b1f]/95 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="size-8" />
          <Wordmark className="text-lg text-white" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
          <Link href="/#kenapa" className="transition-colors hover:text-white">Kenapa Marqthink</Link>
          <Link href="/#cara-kerja" className="transition-colors hover:text-white">Cara kerja</Link>
          <Link href="/#fitur" className="transition-colors hover:text-white">Fitur</Link>
          <Link href="/harga" className="transition-colors hover:text-white">Harga</Link>
        </nav>
        <div className="flex items-center gap-2">
          {loggedIn ? (
            <Button asChild size="sm" className="rounded-full bg-white text-[#050b1f] hover:bg-white/90">
              <Link href="/dashboard">Buka App</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                <Link href="/login">Masuk</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full bg-gradient-to-r from-[#0a6cff] to-[#12d0f5] text-white shadow-lg shadow-cyan-500/20 hover:opacity-90">
                <Link href="/register">Coba Gratis</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
