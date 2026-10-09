import Link from "next/link";
import { requireBackoffice } from "@/lib/backoffice";
import { LogoMark } from "@/components/logo";
import { BackofficeNav } from "./nav";

export const metadata = {
  title: { default: "Back Office", template: "%s · Back Office Markethink" },
  robots: { index: false, follow: false },
};

/** Back office tim bisnis — terpisah dari aplikasi AI user (tanpa sidebar chat). */
export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin } = await requireBackoffice();
  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-3">
          <Link href="/backoffice" className="flex items-center gap-2 font-semibold">
            <LogoMark className="size-7" />
            <span>Markethink</span>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">Back Office</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{profile.email}</span>
            <form action="/auth/signout?next=/backoffice/login" method="post">
              <button className="text-muted-foreground hover:text-foreground">Keluar</button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4">
          <BackofficeNav isAdmin={isAdmin} />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
