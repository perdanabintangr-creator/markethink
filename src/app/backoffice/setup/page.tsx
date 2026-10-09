import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasActiveOwner } from "@/lib/backoffice";
import { LogoMark } from "@/components/logo";
import { SetupForm } from "./setup-form";

export const metadata = { title: "Buat akun owner", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Sekali saja: membuat akun owner back office pertama.
 * Demi keamanan wajib sedang login di aplikasi sebagai admin; setelah ada akun, halaman ini tertutup.
 */
export default async function SetupPage() {
  if (await hasActiveOwner()) redirect("/backoffice/login");
  const { profile } = await getSession();
  const isAppAdmin = profile?.role === "admin";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <LogoMark className="size-10" />
          <h1 className="text-xl font-semibold">Buat akun owner back office</h1>
          <p className="text-sm text-muted-foreground">Username & password ini khusus back office, terpisah dari akun aplikasi.</p>
        </div>
        {isAppAdmin ? (
          <SetupForm />
        ) : (
          <div className="space-y-3 text-center text-sm">
            <p className="rounded-lg bg-muted p-3">
              Untuk keamanan, akun pertama hanya bisa dibuat oleh admin aplikasi. Masuk dulu ke aplikasi Markethink dengan akun admin, lalu buka halaman ini lagi.
            </p>
            <Link href="/login?next=/backoffice/setup" className="font-medium text-primary hover:underline">Masuk ke aplikasi →</Link>
          </div>
        )}
      </div>
    </main>
  );
}
