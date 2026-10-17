import Link from "next/link";
import { ArrowLeft, ArrowRight, FolderOpen, Palette } from "lucide-react";
import { getSession, requireUser } from "@/lib/auth";
import { getCreditStatus } from "@/lib/credits";
import { getDailyLimits, countToday, LIMIT_LABEL, type DailyLimitKind } from "@/lib/limits";
import { UNLIMITED_CREDITS, quotaLeftPct } from "@/lib/addons/format";
import { formatBytes, getStorageStatus } from "@/lib/storage-quota";
import { Button } from "@/components/ui/button";
import { settingsText, type SettingsText } from "@/lib/i18n/settings";
import { ProfileForm } from "./profile-form";
import { MemoryList } from "./memory-list";
import { DangerZone } from "./danger-zone";
import { GeneralPrefs } from "./general-prefs";
import { PersonalizationForm } from "./personalization-form";
import { PasswordForm, SignOutEverywhere } from "./security-form";
import { SharedLinks, type SharedItem } from "./shared-links";
import { SETTINGS_TABS, SettingRow, SettingsNav, settingsTabOf } from "./settings-nav";

export async function generateMetadata() {
  const { profile } = await getSession();
  return { title: settingsText(profile?.language).metaTitle };
}

type Supa = Awaited<ReturnType<typeof requireUser>>["supabase"];
type Prof = Awaited<ReturnType<typeof requireUser>>["profile"];
type User = Awaited<ReturnType<typeof requireUser>>["user"];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = settingsTabOf((await searchParams).tab);
  const ctx = await requireUser();
  const t = settingsText(ctx.profile.language);
  const meta = SETTINGS_TABS.find((x) => x.id === tab)!;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
        <Link href="/chat" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {t.backToChat}
        </Link>
        <div className="flex flex-col gap-6 md:flex-row md:gap-10">
          <aside className="md:sticky md:top-6 md:w-56 md:shrink-0 md:self-start">
            <h1 className="mb-3 text-2xl font-bold md:px-3">{t.title}</h1>
            <SettingsNav active={tab} lang={ctx.profile.language} />
          </aside>
          <main className="min-w-0 flex-1 md:pt-1">
            <h2 className="mb-1 text-lg font-semibold">{t.tabs[meta.id]}</h2>
            <Section tab={tab} t={t} {...ctx} />
          </main>
        </div>
      </div>
    </div>
  );
}

async function Section({ tab, t, supabase, user, profile }: { tab: string; t: SettingsText; supabase: Supa; user: User; profile: Prof }) {
  switch (tab) {
    case "profil":
      return (
        <>
          <Desc>{t.descProfile}</Desc>
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
          <Desc>{t.descPersonalization}</Desc>
          <PersonalizationForm style={profile.response_style ?? "seimbang"} instructions={profile.custom_instructions ?? ""} />
        </>
      );
    case "memori":
      return <MemorySection t={t} supabase={supabase} />;
    case "project":
      return <ProjectSection t={t} supabase={supabase} />;
    case "paket":
      return <UsageSection t={t} supabase={supabase} user={user} profile={profile} />;
    case "penyimpanan":
      return <StorageSection t={t} supabase={supabase} profile={profile} />;
    case "link":
      return <LinksSection t={t} supabase={supabase} />;
    case "akun":
      return <AccountSection t={t} user={user} profile={profile} />;
    default:
      return (
        <>
          <Desc>{t.descGeneral}</Desc>
          <GeneralPrefs language={profile.language} />
        </>
      );
  }
}

function Desc({ children }: { children: React.ReactNode }) {
  return <p className="mb-5 text-sm text-muted-foreground">{children}</p>;
}

async function MemorySection({ t, supabase }: { t: SettingsText; supabase: Supa }) {
  const { data: memories } = await supabase
    .from("memories")
    .select("id, content, source, created_at, workspace:workspaces(name)")
    .order("created_at", { ascending: false });
  return (
    <>
      <Desc>{t.descMemory}</Desc>
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

async function ProjectSection({ t, supabase }: { t: SettingsText; supabase: Supa }) {
  const { data } = await supabase.from("workspaces").select("id, name, brand_kit").order("created_at", { ascending: true });
  const projects = (data ?? []).map((w) => {
    const kit = (w.brand_kit ?? {}) as Record<string, unknown>;
    const colors = [kit.color_primary, kit.color_secondary].filter((c): c is string => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c));
    const filled = Object.values(kit).filter((v) => typeof v === "string" && v.trim()).length;
    return { id: w.id as string, name: w.name as string, colors, filled, logo: typeof kit.logo_id === "string" ? kit.logo_id : null };
  });
  return (
    <>
      <Desc>{t.descProject}</Desc>
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
                    {p.filled ? t.brandKitFilledCols(p.filled) : t.brandKitEmpty}
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
          {t.noProjectsSettings}
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

const USAGE_GROUPS: { id: keyof SettingsText["usageGroups"]; tiers?: string[]; like?: string; not?: string }[] = [
  { id: "chat", tiers: ["junior", "senior", "associate", "director"] },
  { id: "image", tiers: ["image"] },
  { id: "pptx", tiers: ["pptx"] },
  { id: "carousel", tiers: ["carousel"] },
  { id: "tools", like: "tool:%", not: "tool:agent" },
  { id: "agent", tiers: ["tool:agent"] },
];

async function UsageSection({ t, supabase, user, profile }: { t: SettingsText; supabase: Supa; user: User; profile: Prof }) {
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
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toLocaleDateString(t.locale, { day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <div className="space-y-8">
      <div className="rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{t.activePlan}</p>
            <p className="text-lg font-semibold">{plan?.name ?? profile.plan_id}</p>
          </div>
          <Button asChild size="sm">
            <Link href="/pricing">{t.viewUpgradePlan}</Link>
          </Button>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span>{t.monthQuota}</span>
            <span className="font-semibold">{unlimited ? t.unlimited : t.pctLeft(leftPct)}</span>
          </div>
          {!unlimited && (
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div
                className={`h-2 rounded-full ${leftPct <= 10 ? "bg-red-500" : leftPct <= 30 ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${Math.max(2, leftPct)}%` }}
              />
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{t.quotaResetOn(reset)}</p>
        </div>
      </div>

      {daily.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">{t.dailyLimits}</h3>
          <div>
            {daily.map((d) => (
              <SettingRow
                key={d.kind}
                title={t.limitTitles[d.kind] ?? `${LIMIT_LABEL[d.kind].charAt(0).toUpperCase()}${LIMIT_LABEL[d.kind].slice(1)}`}
                desc={t.dailyReset}
              >
                <span className="text-sm font-medium">{t.usedToday(Math.min(d.used, d.limit), d.limit)}</span>
              </SettingRow>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">{t.monthUsage}</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {USAGE_GROUPS.map((g, i) => (
            <div key={g.id} className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">{t.usageGroups[g.id]}</p>
              <p className="text-xl font-semibold">{counts[i].toLocaleString(t.locale)}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t.monthUsageNote}</p>
      </div>
    </div>
  );
}

async function StorageSection({ t, supabase, profile }: { t: SettingsText; supabase: Supa; profile: Prof }) {
  const storage = await getStorageStatus(supabase, profile);
  const pct = storage.limitBytes ? Math.min(100, (storage.usedBytes / storage.limitBytes) * 100) : 0;
  return (
    <>
      <Desc>{t.descStorage}</Desc>
      <div className="rounded-xl border p-4">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span>
            <b>{formatBytes(storage.usedBytes)}</b>
            <span className="text-muted-foreground">{t.storageUsed(storage.limitBytes ? formatBytes(storage.limitBytes) : null)}</span>
          </span>
          {storage.limitBytes && <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>}
        </div>
        {storage.limitBytes && (
          <div className="mt-2 h-2 rounded-full bg-muted">
            <div className={`h-2 rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.max(2, pct)}%` }} />
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{t.storageNote(Math.round(storage.fileMaxBytes / 1024 / 1024))}</p>
      </div>
    </>
  );
}

async function LinksSection({ t, supabase }: { t: SettingsText; supabase: Supa }) {
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
      <Desc>{t.descLinks}</Desc>
      <SharedLinks items={items} />
    </>
  );
}

function AccountSection({ t, user, profile }: { t: SettingsText; user: User; profile: Prof }) {
  const providers = ((user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider as string]).filter(Boolean);
  const label = (p: string) => (p === "email" ? t.emailPassword : p === "google" ? "Google" : p);
  return (
    <div className="space-y-8">
      <div>
        <SettingRow title={t.email} desc={t.emailDesc}>
          <span className="text-sm">{profile.email ?? user.email}</span>
        </SettingRow>
        <SettingRow title={t.signInMethod}>
          <span className="text-sm">{providers.map(label).join(" · ") || "-"}</span>
        </SettingRow>
        <SettingRow title={t.joinedSince}>
          <span className="text-sm">{new Date(profile.created_at).toLocaleDateString(t.locale, { day: "numeric", month: "long", year: "numeric" })}</span>
        </SettingRow>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">{t.password}</h3>
        <PasswordForm hasPassword={providers.includes("email")} />
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">{t.loginSessions}</h3>
        <SettingRow title={t.signOutEverywhere} desc={t.signOutEverywhereDesc}>
          <SignOutEverywhere />
        </SettingRow>
      </div>

      <DangerZone />
    </div>
  );
}
