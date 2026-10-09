import { redirect } from "next/navigation";
import { hasActiveOwner, setupCodeConfigured } from "@/lib/backoffice";
import { LogoMark } from "@/components/logo";
import { SetupForm } from "./setup-form";

export const metadata = { title: "Buat akun owner" };
export const dynamic = "force-dynamic";

/**
 * Sekali saja: membuat akun owner pertama. Wajib memasukkan kode setup (env BACKOFFICE_SETUP_CODE di Vercel,
 * diisi founder sendiri). Setelah ada owner aktif, halaman ini tertutup.
 */
export default async function SetupPage() {
  if (await hasActiveOwner()) redirect("/login");
  const configured = setupCodeConfigured();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <LogoMark className="size-10" />
          <h1 className="text-xl font-semibold">Buat akun owner</h1>
          <p className="text-sm text-muted-foreground">Sekali saja. Setelah ini, akun tim dibuat dari menu Tim &amp; akun.</p>
        </div>
        {configured ? (
          <SetupForm />
        ) : (
          <p className="rounded-lg bg-muted p-3 text-center text-sm">
            Kode setup belum diatur. Tambahkan environment variable <b>BACKOFFICE_SETUP_CODE</b> (minimal 8 karakter) di project Vercel back office, lalu Redeploy.
          </p>
        )}
      </div>
    </main>
  );
}
