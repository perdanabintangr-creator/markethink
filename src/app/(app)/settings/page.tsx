import Link from "next/link";
import { ArrowLeft, ArrowRight, FolderOpen, Palette } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCreditStatus } from "@/lib/credits";
import { getDailyLimits, countToday, LIMIT_LABEL, type DailyLimitKind } from "@/lib/limits";
import { UNLIMITED_CREDITS, quotaLeftPct } from "@/lib/addons/format";
import { formatBytes, getStorageStatus } from "@/lib/storage-quota";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "./profile-form";
import { MemoryList } from "./memory-list";
import { DangerZone } from "./danger-zone";
import { GeneralPrefs } from "./general-prefs";
import { PersonalizationForm } from "./personalization-form";
import { PasswordForm, SignOutEverywhere } from "./security-form";
import { SharedLinks, type SharedItem } from "./shared-links";
import { SETTINGS_TABS, SettingRow, SettingsNav, settingsTabOf } from "./settings-nav";

export const metadata = { title: "Pengaturan" };

type Supa = Awaited<ReturnType<typeof requireUser>>["supabase"];
type Prof = Awaited<ReturnType<typeof requireUser>>["profile"];
type User = Awaited<ReturnType<typeof requireUser>>["user"];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = settingsTabOf((await searchParams).tab);
  const ctx = await requireUser();
  const meta = SETTINGS_TABS.find((t) => t.id === tab)!;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
        <Link href="/chat" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Kembali ke chat
        </Link>
        <div className="flex flex-col gap-6 md:flex-row md:gap-10">
          <aside className="md:sticky md:top-6 md:w-56 md:shrink-0 md:self-start">
            <h1 className="mb-3 text-2xl font-bold md:px-3">Pengaturan</h1>
            <SettingsNav active={tab} />
          </aside>
          <main className="min-w-0 flex-1 md:pt-1">
            <h2 className="mb-1 text-lg font-semibold">{meta.label}</h2>
            <Section tab={tab} {...ctx} />
          </main>
        </div>
      </div>
    </div>
  );
}

async function Section({ tab, supabase, user, profile }: { tab: string; supabase: Supa; user: User; profile: Prof }) {
  switch (tab) {
    case "profil":
      return (
        <>
          <Desc>Markethink menyesuaikan contoh, istilah, dan saran dengan peran & industrimu.</Desc>
          <ProfileForm
            profile={{
              full_name: profile.full_name ?? "",
              email: profile.email ?? "",
              persona_role: profile.persona_role ?? "",
              industry: profile.industry ?? "",
              experience: profile.experience ?? "",
              goal: profile.goal ?? "",
            }}
          />
        </>
      );
    case "personalisasi":
      return (
        <>
          <Desc>Atur cara Markethink menjawab di semua chat — seperti punya asisten yang sudah hafal kebiasaanmu.</Desc>
          <PersonalizationForm style={profile.response_style ?? "seimbang"} instructions={profile.custom_instructions ?? ""} />
        </>
      );
    case "memori":
      return <MemorySection supabase={supabase} />;
    case "project":
      return <ProjectSection supabase={supabase} />;
    case "paket":
      return <UsageSection supabase={supabase} user={user} profile={profile} />;
    case "penyimpanan":
      return <StorageSection supabase={supabase} profile={profile} />;
    case "link":
      return <LinksSection supabase={supabase} />;
    case "akun":
      return <AccountSection user={user} profile={profile} />;
    default:
      return (
        <>
          <Desc>Tampilan & bahasa aplikasi.</Desc>
          <GeneralPrefs language={profile.language} />
        </>
      );
  }
}

function Desc({ children }: { children: React.ReactNode }) {
  return <p className="mb-5 text-sm text-muted-foreground">{children}</p>;
}

async function MemorySection({ supabase }: { supabase: Supa }) {
  const { data: memories } = await supabase
    .from("memories")
    .select("id, content, source, created_at, workspace:workspaces(name)")
    .order("created_at", { ascending: false });
  return (
    <>
      <Desc>Hal yang diingat Markethink tentang kamu (gaya bahasa, industri, brand). Dipakai untuk personalisasi semua chat.</Desc>
      <MemoryList
        memories={(memories ?? []).map((m) => ({
          id: m.id as string,
          content: m.content as string,
          source: m.source as string,
          project: (m.workspace as unknown as { name?: string } | null)?.name ?? null,
        }))}
      />
    </>
  );
}

async function ProjectSection({ supabase }: { supabase: Supa }) {
  const { data } = await supabase.from("workspaces").select("id, name, brand_kit").order("created_at", { ascending: true });
  const projects = (data ?? []).map((w) => {
    const kit = (w.brand_kit ?? {}) as Record<string, unknown>;
    const colors = [kit.color_primary, kit.color_secondary].filter((c): c is string => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c));
    const filled = Object.values(kit).filter((v) => typeof v === "string" && v.trim()).length;
    return { id: w.id as string, name: w.name as string, colors, filled, logo: typeof kit.logo_id === "string" ? kit.logo_id : null };
  });
  return (
    <>
      <Desc>
        Tiap project punya Brand Kit sendiri (logo, warna, gaya desain, tone, target audience). Semua chat, PPT, carousel & foto produk di project itu otomatis
        mengikuti Brand Kit-nya.
      </Desc>
      {projects.length ? (
        <ul className="divide-y rounded-xl border">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={`/workspaces/${p.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent">
                <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-primary/10 text-primary">
                  {p.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- file pribadi via /api/attachments
                    <img src={`/api/attachments/${p.logo}`} alt="" className="max-h-full max-w-full object-contain p-0.5" />
                  ) : (
                    <FolderOpen className="size-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Palette className="size-3" />
                    {p.filled ? `Brand Kit terisi (${p.filled} kolom)` : "Brand Kit belum diisi"}
                    {p.colors.map((c) => (
                      <span key={c} className="inline-block size-2.5 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                    ))}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Belum ada project. Buat project dari menu samping (ikon folder +) untuk tiap brand/klien.
        </p>
      )}
    </>
  );
}

/** Awal bulan ini (WIB), sama dengan reset kredit bulanan. */
function wibMonthStart(now = Date.now()) {
  const wib = new Date(now + 7 * 3600_000);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), 1) - 7 * 3600_000);
}

const USAGE_GROUPS: { label: string; tiers?: string[]; like?: string; not?: string }[] = [
  { label: "Chat", tiers: ["junior", "senior", "associate", "director"] },
  { label: "Gambar & foto produk", tiers: ["image"] },
  { label: "PPT", tiers: ["pptx"] },
  { label: "Carousel & poster", tiers: ["carousel"] },
  { label: "Tools Pro", like: "tool:%", not: "tool:agent" },
  { label: "Agent", tiers: ["tool:agent"] },
];

async function UsageSection({ supabase, user, profile }: { supabase: Supa; user: User; profile: Prof }) {
  const since = wibMonthStart().toISOString();
  const [credits, { data: plan }, limits, counts] = await Promise.all([
    getCreditStatus(user.id),
    supabase.from("plans").select("name").eq("id", profile.plan_id).maybeSingle(),
    getDailyLimits(supabase, profile),
    Promise.all(
      USAGE_GROUPS.map(async (g) => {
        let q = supabase.from("usage_logs").select("id", { count: "exact", head: true }).eq("status", "ok").gte("created_at", since);
        if (g.tiers) q = q.in("tier", g.tiers);
        if (g.like) q = q.like("tier", g.like);
        if (g.not) q = q.neq("tier", g.not);
        const { count } = await q;
        return count ?? 0;
      }),
    ),
  ]);
  const daily = await Promise.all(
    (Object.entries(limits) as [DailyLimitKind, number][]).filter(([, n]) => n > 0).map(async ([kind, limit]) => ({ kind, limit, used: await countToday(user.id, kind) })),
  );
  const unlimited = credits.monthLimit >= UNLIMITED_CREDITS;
  const leftPct = unlimited ? 100 : quotaLeftPct(credits.remaining, credits.monthLimit);
  const now = new Date(Date.now() + 7 * 3600_000);
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toLocaleDateString("id-ID", { day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <div className="space-y-8">
      <div className="rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Paket aktif</p>
            <p className="text-lg font-semibold">{plan?.name ?? profile.plan_id}</p>
          </div>
          <Button asChild size="sm">
            <Link href="/pricing">Lihat / upgrade paket</Link>
          </Button>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span>Kuota bulan ini</span>
            <span className="font-semibold">{unlimited ? "Tanpa batas" : `${leftPct}% tersisa`}</span>
          </div>
          {!unlimited && (
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div
                className={`h-2 rounded-full ${leftPct <= 10 ? "bg-red-500" : leftPct <= 30 ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${Math.max(2, leftPct)}%` }}
              />
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Kuota terisi ulang tanggal {reset}, pukul 00.00 WIB.</p>
        </div>
      </div>

      {daily.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">Batas harian</h3>
          <div>
            {daily.map((d) => (
              <SettingRow key={d.kind} title={`${LIMIT_LABEL[d.kind].charAt(0).toUpperCase()}${LIMIT_LABEL[d.kind].slice(1)}`} desc="Reset setiap pukul 00.00 WIB.">
                <span className="text-sm font-medium">
                  {Math.min(d.used, d.limit)} / {d.limit} hari ini
                </span>
              </SettingRow>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Pemakaian bulan ini</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {USAGE_GROUPS.map((g, i) => (
            <div key={g.label} className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">{g.label}</p>
              <p className="text-xl font-semibold">{counts[i].toLocaleString("id-ID")}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Jumlah permintaan yang berhasil sejak tanggal 1 bulan ini.</p>
      </div>
    </div>
  );
}

async function StorageSection({ supabase, profile }: { supabase: Supa; profile: Prof }) {
  const storage = await getStorageStatus(supabase, profile);
  const pct = storage.limitBytes ? Math.min(100, (storage.usedBytes / storage.limitBytes) * 100) : 0;
  return (
    <>
      <Desc>Ruang untuk file yang kamu upload di chat & dokumen project.</Desc>
      <div className="rounded-xl border p-4">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span>
            <b>{formatBytes(storage.usedBytes)}</b>
            <span className="text-muted-foreground"> terpakai{storage.limitBytes ? ` dari ${formatBytes(storage.limitBytes)}` : " · tanpa batas"}</span>
          </span>
          {storage.limitBytes && <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>}
        </div>
        {storage.limitBytes && (
          <div className="mt-2 h-2 rounded-full bg-muted">
            <div className={`h-2 rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.max(2, pct)}%` }} />
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Maks {Math.round(storage.fileMaxBytes / 1024 / 1024)} MB per file. File hasil buatan Markethink (PPT, Excel, gambar) tidak dihitung. Foto besar otomatis
          dikompres saat upload. Untuk mengosongkan ruang, hapus chat atau file di project yang tidak dipakai lagi.
        </p>
      </div>
    </>
  );
}

async function LinksSection({ supabase }: { supabase: Supa }) {
  const [{ data: chats }, { data: canvases }] = await Promise.all([
    supabase.from("chats").select("id, title, share_token, updated_at").not("share_token", "is", null).order("updated_at", { ascending: false }).limit(100),
    supabase.from("canvases").select("id, title, share_token, updated_at").not("share_token", "is", null).order("updated_at", { ascending: false }).limit(100),
  ]);
  const items: SharedItem[] = [
    ...(chats ?? []).map((c) => ({ kind: "chat" as const, id: c.id as string, title: c.title as string, token: c.share_token as string, updated_at: c.updated_at as string })),
    ...(canvases ?? []).map((c) => ({ kind: "canvas" as const, id: c.id as string, title: c.title as string, token: c.share_token as string, updated_at: c.updated_at as string })),
  ].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return (
    <>
      <Desc>Chat & dokumen yang bisa dibuka siapa saja lewat link. Matikan link yang sudah tidak perlu supaya data klien tetap aman.</Desc>
      <SharedLinks items={items} />
    </>
  );
}

function AccountSection({ user, profile }: { user: User; profile: Prof }) {
  const providers = ((user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider as string]).filter(Boolean);
  const label = (p: string) => (p === "email" ? "Email & password" : p === "google" ? "Google" : p);
  return (
    <div className="space-y-8">
      <div>
        <SettingRow title="Email" desc="Dipakai untuk masuk & pemberitahuan penting.">
          <span className="text-sm">{profile.email ?? user.email}</span>
        </SettingRow>
        <SettingRow title="Metode masuk">
          <span className="text-sm">{providers.map(label).join(" · ") || "-"}</span>
        </SettingRow>
        <SettingRow title="Bergabung sejak">
          <span className="text-sm">{new Date(profile.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
        </SettingRow>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Password</h3>
        <PasswordForm hasPassword={providers.includes("email")} />
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">Sesi login</h3>
        <SettingRow title="Keluar dari semua perangkat" desc="Pakai ini bila akunmu pernah dibuka di HP/laptop orang lain. Kamu perlu masuk lagi.">
          <SignOutEverywhere />
        </SettingRow>
      </div>

      <DangerZone />
    </div>
  );
}
