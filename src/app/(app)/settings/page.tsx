import { requireUser } from "@/lib/auth";
import { getCreditStatus } from "@/lib/credits";
import { formatBytes, getStorageStatus } from "@/lib/storage-quota";
import { ProfileForm } from "./profile-form";
import { MemoryList } from "./memory-list";
import { DangerZone } from "./danger-zone";
import { ThemePicker } from "./theme-picker";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const { supabase, user, profile } = await requireUser();
  const [{ data: memories }, credits, { data: usage }, { data: plan }, storage] = await Promise.all([
    supabase
      .from("memories")
      .select("id, content, source, created_at, workspace:workspaces(name)")
      .order("created_at", { ascending: false }),
    getCreditStatus(user.id),
    supabase.from("usage_logs").select("credits").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
    supabase.from("plans").select("name").eq("id", profile.plan_id).maybeSingle(),
    getStorageStatus(supabase, profile),
  ]);
  const storagePct = storage.limitBytes ? Math.min(100, (storage.usedBytes / storage.limitBytes) * 100) : 0;
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
              <p className="font-semibold">{plan?.name ?? profile.plan_id}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Sisa kredit bulan ini</p>
              <p className="font-semibold">
                {credits.monthLimit >= 1_000_000
                  ? "Tanpa batas"
                  : `${credits.remaining.toLocaleString("id-ID")}/${credits.monthLimit.toLocaleString("id-ID")}`}
              </p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Dipakai 30 hari</p>
              <p className="font-semibold">{used30}</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Penyimpanan file</h2>
          <div className="rounded-xl border p-4">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span>
                <b>{formatBytes(storage.usedBytes)}</b>
                <span className="text-muted-foreground"> terpakai{storage.limitBytes ? ` dari ${formatBytes(storage.limitBytes)}` : " · tanpa batas"}</span>
              </span>
              {storage.limitBytes && <span className="text-xs text-muted-foreground">{Math.round(storagePct)}%</span>}
            </div>
            {storage.limitBytes && (
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${storagePct >= 90 ? "bg-red-500" : storagePct >= 70 ? "bg-amber-500" : "bg-primary"}`}
                  style={{ width: `${Math.max(2, storagePct)}%` }}
                />
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Dihitung dari file yang kamu upload di chat & dokumen project (maks {Math.round(storage.fileMaxBytes / 1024 / 1024)} MB per file). File hasil
              buatan Markethink (PPT, Excel, gambar) tidak dihitung. Foto besar otomatis dikompres saat upload.
            </p>
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
          <MemoryList
            memories={(memories ?? []).map((m) => ({
              id: m.id as string,
              content: m.content as string,
              source: m.source as string,
              project: (m.workspace as unknown as { name?: string } | null)?.name ?? null,
            }))}
          />
        </section>

        <DangerZone />
      </div>
    </div>
  );
}
