import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Kenalan dulu" };

export default async function OnboardingPage() {
  const { profile } = await requireUser({ allowNotOnboarded: true });
  if (profile.onboarded) redirect("/chat");
  return (
    <div className="min-h-dvh bg-gradient-to-b from-accent/40 to-background px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold sm:text-3xl">
          Halo{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}! Kenalan dulu yuk 👋
        </h1>
        <p className="mt-2 text-muted-foreground">
          Biar jawaban Markethink pas dengan kebutuhanmu. Cuma 30 detik, bisa diubah nanti di Pengaturan.
        </p>
        <OnboardingForm needsConsent={!profile.consent_at} />
      </div>
    </div>
  );
}
