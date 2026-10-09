import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasBackofficeAccess } from "@/lib/backoffice";
import { LogoMark } from "@/components/logo";
import { BackofficeLoginForm } from "./login-form";

export const metadata = { title: "Masuk Back Office", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BackofficeLoginPage() {
  const { profile } = await getSession();
  const signedIn = Boolean(profile);
  if (profile && (await hasBackofficeAccess(profile))) redirect("/backoffice");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <LogoMark className="size-10" />
          <h1 className="text-xl font-semibold">Back Office Markethink</h1>
          <p className="text-sm text-muted-foreground">Khusus tim bisnis: data pelanggan, langganan, dan penjualan.</p>
        </div>
        {signedIn ? (
          <div className="space-y-3 text-center text-sm">
            <p className="rounded-lg bg-muted p-3">
              Akun <b>{profile?.email}</b> belum punya akses back office. Minta admin menambahkan email kamu di menu <b>Tim</b>.
            </p>
            <form action="/auth/signout?next=/backoffice/login" method="post">
              <button className="text-primary underline-offset-4 hover:underline">Masuk dengan akun lain</button>
            </form>
          </div>
        ) : (
          <Suspense>
            <BackofficeLoginForm />
          </Suspense>
        )}
      </div>
    </main>
  );
}
