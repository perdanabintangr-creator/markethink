import Link from "next/link";
import { redirect } from "next/navigation";
import { getBackofficeUser, hasActiveOwner } from "@/lib/backoffice";
import { LogoMark } from "@/components/logo";
import { BackofficeLoginForm } from "./login-form";

export const metadata = { title: "Masuk Back Office", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BackofficeLoginPage() {
  if (await getBackofficeUser()) redirect("/backoffice");
  const hasOwner = await hasActiveOwner();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <LogoMark className="size-10" />
          <h1 className="text-xl font-semibold">Back Office Markethink</h1>
          <p className="text-sm text-muted-foreground">Masuk dengan username & password tim.</p>
        </div>
        {!hasOwner && (
          <div className="space-y-2 rounded-lg bg-muted p-3 text-center text-sm">
            <p>Belum ada akun owner back office.</p>
            <Link href="/backoffice/setup" className="font-medium text-primary hover:underline">Buat akun owner pertama →</Link>
          </div>
        )}
        <BackofficeLoginForm />
      </div>
    </main>
  );
}
