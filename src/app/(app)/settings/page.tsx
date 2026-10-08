import { requireUser } from "@/lib/auth";
import { getCreditStatus } from "@/lib/credits";
import { ProfileForm } from "./profile-form";
import { MemoryList } from "./memory-list";
import { DangerZone } from "./danger-zone";
import { ThemePicker } from "./theme-picker";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const { supabase, user, profile } = await requireUser();
  const [{ data: memories }, credits, { data: usage }] = await Promise.all([
    supabase.from("memories").select("id, content, source, created_at").order("created_at", { ascending: false }),
    getCreditStatus(user.id),
    supabase.from("usage_logs").select("credits").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
  ]);
  const used30 = (usage ?? []).reduce((a, r) => a + ((r.credits as number) ?? 0), 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-10 px-4 py-8">
        <h1 className="text-2xl font-bold">Pengaturan</h1>

        <section className="space-y-3">
          <h2 className="font-semibold">Paket & kredit</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Paket</p>
              <p className="font-semibold">Beta Gratis</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Sisa hari ini</p>
              <p className="font-semibold">
                {credits.remaining}/{credits.dailyLimit}
              </p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Dipakai 30 hari</p>
              <p className="font-semibold">{used30}</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Profil & personalisasi</h2>
          <ProfileForm
            profile={{
              full_name: profile.full_name ?? "",
              email: profile.email ?? "",
              language: profile.language,
              persona_role: profile.persona_role ?? "",
              industry: profile.industry ?? "",
              experience: profile.experience ?? "",
              goal: profile.goal ?? "",
            }}
          />
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Tema</h2>
          <ThemePicker />
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">Memory</h2>
            <p className="text-sm text-muted-foreground">
              Hal yang diingat Markethink tentang kamu (gaya bahasa, industri, brand). Dipakai untuk personalisasi semua chat.
            </p>
          </div>
          <MemoryList memories={memories ?? []} />
        </section>

        <DangerZone />
      </div>
    </div>
  );
}
