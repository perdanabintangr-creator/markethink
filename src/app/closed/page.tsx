import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getSession, hasAppAccess } from "@/lib/auth";

export const metadata = { title: "Beta tertutup" };
export const dynamic = "force-dynamic";

export default async function ClosedBetaPage() {
  // Akses sudah dibuka (mode publik / diberi akses) → langsung masuk aplikasi.
  const { user, profile } = await getSession();
  if (!user) redirect("/login");
  if (profile && (await hasAppAccess(profile))) redirect(profile.onboarded ? "/chat" : "/onboarding");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo />
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold">Markethink masih dalam uji coba tertutup 🔒</h1>
        <p className="text-sm text-muted-foreground">
          Akun kamu sudah terdaftar. Kami akan mengabari lewat email begitu akses beta dibuka untukmu.
        </p>
      </div>
      <form action="/auth/signout" method="post">
        <Button variant="outline">Keluar</Button>
      </form>
    </div>
  );
}
