"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Copy,
  Download,
  ImagePlus,
  Images,
  Package,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Settings2,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { autopilotText, type AutopilotText } from "@/lib/i18n/autopilot";
import type { Slide } from "@/lib/autopilot/slides";
import { EditPostDialog } from "./edit-post-dialog";
import { PerformancePanel } from "./performance-panel";
import { IdeasSection, type IdeaItem } from "./ideas-section";
import { StyleSection, type BrandStyleRow } from "./style-section";
import { ProductsSection, type ProductItem } from "./products-section";
import type { MediaStat } from "@/lib/autopilot/performance";

export interface ApWorkspace {
  id: string;
  name: string;
  color: string | null;
  logoId: string | null;
  handle: string | null;
}

export interface ApSettings {
  workspaceId: string | null;
  enabled: boolean;
  cadence: "weekly" | "monthly";
  postsPerWeek: number;
  slotTimes: string[];
  focus: string;
  autoPublish: boolean;
  goal: "balanced" | "awareness" | "engagement" | "sales" | "custom";
  pillarMix: { edukasi: number; relatable: number; insight: number; produk: number } | null;
  reviewIdeas: boolean;
  design: "auto" | "glossy" | "bold" | "photo" | "classic";
  configured: boolean;
}

export interface ApPost {
  id: string;
  post_date: string;
  post_time: string;
  kind: "carousel" | "image" | "reel";
  design: "glossy" | "bold" | "photo" | "classic";
  product_id?: string | null;
  image_regens: number;
  title: string;
  pillar: string | null;
  funnel: string | null;
  slides: Slide[];
  caption: string;
  alt_text: string | null;
  script: string | null;
  note: string | null;
  lint: { fails: string[]; warns: string[] } | null;
  team_review?: { score?: number; issues?: string[]; fixed?: boolean; skipped?: boolean } | null;
  created_at?: string;
  status: "draft" | "approved" | "script_ok" | "rejected" | "posted" | "failed" | "manual";
  media: string[] | null;
  permalink?: string | null;
  error?: string | null;
  updated_at: string;
}

export interface IgStatus {
  enabled: boolean;
  connected: boolean;
  username: string | null;
  picture: string | null;
  status: "active" | "expired" | "revoked" | null;
  canPublish: boolean;
}

type Tab = "pending" | "scheduled" | "video" | "rejected";
type Action = "approve" | "reject" | "restore" | "posted" | "regen_image" | "publish_now" | "retry";
const TAB_STATUS: Record<Tab, ApPost["status"][]> = {
  pending: ["draft"],
  scheduled: ["approved", "posted", "manual", "failed"],
  video: ["script_ok"],
  rejected: ["rejected"],
};

async function call<T = unknown>(url: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: String((data as { error?: string }).error ?? "generic") };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "generic" };
  }
}

const errText = (t: AutopilotText, e: string) => (t.errors as Record<string, string>)[e] ?? t.errors.generic;

function dateLabel(t: AutopilotText, date: string, today: string) {
  const d = new Date(`${date}T00:00:00Z`);
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const base = `${t.days[d.getUTCDay()]}, ${d.getUTCDate()} ${t.months[d.getUTCMonth()]}`;
  return date === today ? `${t.today} · ${base}` : date === tomorrow ? `${t.tomorrow} · ${base}` : base;
}

export function AutopilotView(props: {
  lang: "id" | "en";
  today: string;
  initialSettings: ApSettings;
  initialPosts: ApPost[];
  workspaces: ApWorkspace[];
  allowance: { postsPerWeek: number; postsPerMonth: number };
  usedThisMonth: number;
  instagram: IgStatus;
  stats: MediaStat[];
  ideas: IdeaItem[];
  products: ProductItem[];
  styleState: { industry: string | null; presetId: string | null; styleId: string | null; styles: BrandStyleRow[]; samples: { ready: number; total: number } | null };
}) {
  const t = autopilotText(props.lang);
  const router = useRouter();
  const [posts, setPosts] = useState(props.initialPosts);
  useEffect(() => setPosts(props.initialPosts), [props.initialPosts]);
  // Tim senior & visual bekerja di latar belakang → segarkan halaman tiap 15 detik selama masih ada yang diproses (maks 15 menit).
  const processing = props.initialPosts.some(
    (p) =>
      p.status === "draft" &&
      p.created_at &&
      Date.now() - Date.parse(p.created_at) < 15 * 60_000 &&
      (!p.team_review || (p.design !== "classic" && p.kind !== "reel" && !p.slides[0]?.image && (p.slides[0]?.visual || p.product_id))),
  );
  useEffect(() => {
    if (!processing) return;
    const id = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(id);
  }, [processing, router]);
  const [tab, setTab] = useState<Tab>("pending");
  const [gen, setGen] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);
  const [setupOpen, setSetupOpen] = useState(!props.initialSettings.configured);
  const [confirm, confirmDialog] = useConfirm();

  const counts = useMemo(() => {
    const c = { pending: 0, scheduled: 0, video: 0, rejected: 0 } as Record<Tab, number>;
    for (const p of posts) for (const k of Object.keys(TAB_STATUS) as Tab[]) if (TAB_STATUS[k].includes(p.status)) c[k]++;
    return c;
  }, [posts]);
  const visible = posts.filter((p) => TAB_STATUS[tab].includes(p.status) && (tab !== "scheduled" || p.status !== "posted" || p.post_date >= props.today));
  const groups = useMemo(() => {
    const m = new Map<string, ApPost[]>();
    for (const p of visible) m.set(p.post_date, [...(m.get(p.post_date) ?? []), p]);
    return [...m.entries()];
  }, [visible]);
  const readyToApprove = posts.filter((p) => p.status === "draft" && !(p.lint?.fails?.length));

  const replace = (p: ApPost) => setPosts((list) => list.map((x) => (x.id === p.id ? { ...p, post_time: String(p.post_time).slice(0, 5) } : x)));

  async function act(post: ApPost, action: Action, quiet = false) {
    if (action === "reject" && !(await confirm({ title: t.rejectConfirm, description: t.rejectDesc, confirmLabel: t.reject, destructive: true }))) return false;
    const r = await call<{ post: ApPost }>(`/api/autopilot/posts/${post.id}`, { action });
    if (!r.ok) {
      toast.error(errText(t, r.error));
      if (action === "publish_now") router.refresh();
      return false;
    }
    replace(r.data.post);
    if (!quiet && action === "approve") toast.success(t.approvedToast);
    if (action === "regen_image") toast.success(t.regenDone);
    if (action === "publish_now") toast.success(t.ig.published);
    return true;
  }

  async function approveAll() {
    setBulk(true);
    let ok = 0;
    for (const p of readyToApprove) if (await act(p, "approve", true)) ok++;
    setBulk(false);
    if (ok) toast.success(`${ok} × ${t.approvedToast.toLowerCase()}`);
  }

  async function generate(weeks: number) {
    let total = 0;
    for (let k = 1; k <= weeks; k++) {
      setGen(weeks > 1 ? t.generatingWeek(k, weeks) : t.generating);
      const r = await call<{ created: number; ideas: number; stage: "ideas" | "posts" }>("/api/autopilot/generate");
      if (!r.ok) {
        if (!total || r.error !== "quota") toast.error(errText(t, r.error));
        break;
      }
      if (r.data.stage === "ideas") {
        toast.success(t.ideasReady(r.data.ideas));
        router.refresh();
        continue;
      }
      total += r.data.created;
    }
    setGen(null);
    if (total) {
      toast.success(t.generated(total));
      setTab("pending");
      router.refresh();
    }
  }

  const quotaLeft = Math.max(0, props.allowance.postsPerMonth - props.usedThisMonth);
  const ws = props.workspaces.find((w) => w.id === props.initialSettings.workspaceId) ?? null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:pt-10">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0A0F23] p-6 text-white shadow-[0_20px_60px_-30px_rgba(10,61,255,0.6)] sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-32 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(10,132,255,0.55),rgba(10,61,255,0.18)_45%,transparent_70%)]" />
          <div className="pointer-events-none absolute -bottom-40 -left-20 size-[360px] rounded-full bg-[radial-gradient(circle,rgba(0,229,255,0.22),transparent_65%)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                <Sparkles className="size-3.5" /> {t.badge}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t.title.split(" ")[0]}{" "}
                <span className="bg-gradient-to-r from-[#3D7BFF] via-[#0A84FF] to-[#00E5FF] bg-clip-text text-transparent">{t.title.split(" ").slice(1).join(" ")}</span>
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{t.sub}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={() => generate(1)} disabled={!!gen} className="h-10 rounded-full px-5">
                  {gen ? <Loader2 className="animate-spin" /> : <Sparkles />} {t.generateWeek}
                </Button>
                {props.initialSettings.cadence === "monthly" && (
                  <Button onClick={() => generate(4)} disabled={!!gen} variant="outline" className="h-10 rounded-full border-white/20 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white">
                    <CalendarClock /> {t.generateMonth}
                  </Button>
                )}
                <Button onClick={() => setSetupOpen((v) => !v)} variant="ghost" className="h-10 rounded-full px-4 text-white/80 hover:bg-white/10 hover:text-white">
                  <Settings2 /> {t.setupTitle}
                </Button>
              </div>
              {gen && (
                <p className="mt-3 flex items-center gap-2 text-xs text-cyan-200">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-300 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-cyan-300" />
                  </span>
                  {gen}
                </p>
              )}
            </div>
            <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-[360px]">
              <Stat label={t.statPending} value={counts.pending} accent />
              <Stat label={t.statScheduled} value={posts.filter((p) => p.status === "approved").length} />
              <Stat label={t.statQuota} value={`${props.usedThisMonth}/${props.allowance.postsPerMonth}`} hint={`${quotaLeft} ${t.posts}`} />
            </div>
          </div>
          {ws && (
            <p className="relative mt-5 flex items-center gap-2 text-xs text-white/55">
              <span className="size-2.5 rounded-full" style={{ background: ws.color ?? "#0A3DFF" }} />
              {ws.name}
              {ws.handle ? ` · ${ws.handle}` : ""} · {props.initialSettings.cadence === "monthly" ? t.monthly : t.weekly}
              {props.initialSettings.enabled ? " · Auto" : ""}
            </p>
          )}
        </section>

        {setupOpen && (
          <SetupPanel
            t={t}
            workspaces={props.workspaces}
            initial={props.initialSettings}
            maxPerWeek={props.allowance.postsPerWeek}
            onSaved={() => {
              setSetupOpen(false);
              router.refresh();
            }}
          />
        )}
        {setupOpen && (
          <StyleSection
            lang={props.lang}
            workspaceId={props.initialSettings.workspaceId}
            industry={props.styleState.industry}
            presetId={props.styleState.presetId}
            styleId={props.styleState.styleId}
            styles={props.styleState.styles}
            samples={props.styleState.samples}
          />
        )}

        {props.instagram.enabled ? (
          <InstagramCard t={t} ig={props.instagram} settings={props.initialSettings} onChanged={() => router.refresh()} confirm={confirm} />
        ) : (
          <div className="mt-4 flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
            <Send className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium">{t.publishTitle}</p>
              <p className="mt-0.5 text-muted-foreground">{t.publishBody}</p>
            </div>
          </div>
        )}

        <IdeasSection t={t} ideas={props.ideas} dateLabel={(d) => dateLabel(t, d, props.today)} />

        <ProductsSection lang={props.lang} workspaceId={props.initialSettings.workspaceId} products={props.products} />

        <PerformancePanel rows={props.stats} lang={props.lang} />

        {/* Tabs */}
        <div className="sticky top-0 z-10 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-3 bg-background/85 px-4 py-3 backdrop-blur">
          <div className="flex gap-1 overflow-x-auto rounded-full border bg-muted/40 p-1">
            {(Object.keys(TAB_STATUS) as Tab[]).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition",
                  tab === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.tabs[k]}
                {counts[k] > 0 && (
                  <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", tab === k && k === "pending" ? "bg-primary text-primary-foreground" : "bg-muted")}>{counts[k]}</span>
                )}
              </button>
            ))}
          </div>
          {tab === "pending" && readyToApprove.length > 1 && (
            <Button size="sm" onClick={approveAll} disabled={bulk} className="rounded-full">
              {bulk ? <Loader2 className="animate-spin" /> : <CheckCheck />} {bulk ? t.approving : t.approveAll(readyToApprove.length)}
            </Button>
          )}
        </div>

        {groups.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed p-12 text-center">
            <Images className="mx-auto size-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium">{tab === "pending" ? t.emptyPending : t.emptyOther}</p>
            {tab === "pending" && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{t.emptyPendingCta}</p>}
          </div>
        ) : (
          <div className="mt-2 space-y-8">
            {groups.map(([date, list]) => (
              <section key={date}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <span className={cn("size-1.5 rounded-full", date === props.today ? "bg-primary" : "bg-muted-foreground/40")} />
                  {dateLabel(t, date, props.today)}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {list.map((p) => (
                    <PostCard key={p.id} t={t} post={p} today={props.today} igReady={props.instagram.connected && props.instagram.status === "active" && props.instagram.canPublish} productName={p.product_id ? props.products.find((x) => x.id === p.product_id)?.name : undefined} onAct={(a) => act(p, a)} onSaved={replace} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      {confirmDialog}
    </div>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: number | string; hint?: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-white/10 bg-white/[0.04] p-3", accent && "border-cyan-300/30 bg-cyan-300/[0.07]")}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-white/45">{hint}</p>}
    </div>
  );
}

function SetupPanel({ t, workspaces, initial, maxPerWeek, onSaved }: { t: AutopilotText; workspaces: ApWorkspace[]; initial: ApSettings; maxPerWeek: number; onSaved: () => void }) {
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ApSettings>(k: K, v: ApSettings[K]) => setS((x) => ({ ...x, [k]: v }));
  async function save() {
    setSaving(true);
    const r = await call("/api/autopilot/settings", {
      workspaceId: s.workspaceId,
      enabled: s.enabled,
      cadence: s.cadence,
      postsPerWeek: s.postsPerWeek,
      slotTimes: s.slotTimes,
      focus: s.focus.trim() || null,
      design: s.design,
      autoPublish: s.autoPublish,
      goal: s.goal,
      pillarMix: s.goal === "custom" ? s.pillarMix : null,
      reviewIdeas: s.reviewIdeas,
    });
    setSaving(false);
    if (!r.ok) return void toast.error(errText(t, r.error));
    toast.success(t.saved);
    onSaved();
  }
  return (
    <section className="mt-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold">{t.setupTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.setupSub}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t.brand} hint={t.brandHint}>
          <div className="flex gap-2">
            <select value={s.workspaceId ?? ""} onChange={(e) => set("workspaceId", e.target.value || null)} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
              <option value="">{t.noBrand}</option>
            </select>
            {s.workspaceId && (
              <Button asChild variant="outline" className="shrink-0">
                <Link href={`/workspaces/${s.workspaceId}`}>{t.editBrand}</Link>
              </Button>
            )}
          </div>
        </Field>
        <Field label={t.cadence} hint={s.cadence === "monthly" ? t.monthlyHint : t.weeklyHint}>
          <div className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-1">
            {(["weekly", "monthly"] as const).map((c) => (
              <button key={c} onClick={() => set("cadence", c)} className={cn("h-8 rounded-md text-sm font-medium transition", s.cadence === c ? "bg-background shadow-sm" : "text-muted-foreground")}>
                {c === "weekly" ? t.weekly : t.monthly}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t.perWeek}>
          <div className="flex items-center gap-3">
            <input type="range" min={3} max={maxPerWeek} value={s.postsPerWeek} onChange={(e) => set("postsPerWeek", Number(e.target.value))} className="w-full accent-[var(--primary)]" />
            <span className="w-8 text-right text-lg font-semibold tabular-nums">{s.postsPerWeek}</span>
          </div>
        </Field>
        <Field label={t.times}>
          <div className="flex flex-wrap items-center gap-2">
            {s.slotTimes.map((tm, i) => (
              <div key={i} className="flex items-center rounded-lg border bg-background pl-2">
                <input type="time" value={tm} onChange={(e) => set("slotTimes", s.slotTimes.map((x, k) => (k === i ? e.target.value : x)))} className="h-9 bg-transparent text-sm outline-none" />
                {s.slotTimes.length > 1 && (
                  <button onClick={() => set("slotTimes", s.slotTimes.filter((_, k) => k !== i))} className="p-2 text-muted-foreground hover:text-foreground" aria-label="hapus">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
            {s.slotTimes.length < 3 && (
              <Button variant="ghost" size="sm" onClick={() => set("slotTimes", [...s.slotTimes, "09:00"])}>
                <Plus /> {t.addTime}
              </Button>
            )}
          </div>
        </Field>
        <div className="md:col-span-2">
          <Field label={t.goal} hint={t.goalHints[s.goal]}>
            <div className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-1 sm:grid-cols-5">
              {(["balanced", "awareness", "engagement", "sales", "custom"] as const).map((g) => (
                <button key={g} onClick={() => set("goal", g)} className={cn("h-8 rounded-md text-sm font-medium transition", s.goal === g ? "bg-background shadow-sm" : "text-muted-foreground")}>
                  {t.goals[g]}
                </button>
              ))}
            </div>
            {s.goal === "custom" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(["edukasi", "relatable", "insight", "produk"] as const).map((k) => {
                  const mix = s.pillarMix ?? { edukasi: 40, relatable: 30, insight: 10, produk: 20 };
                  const total = mix.edukasi + mix.relatable + mix.insight + mix.produk || 1;
                  return (
                    <label key={k} className="text-xs text-muted-foreground">
                      <span className="flex justify-between">
                        <span>{t.pillars[k]}</span>
                        <span className="font-semibold tabular-nums text-foreground">{Math.round((mix[k] / total) * 100)}%</span>
                      </span>
                      <input type="range" min={0} max={100} step={5} value={mix[k]} onChange={(e) => set("pillarMix", { ...mix, [k]: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
                    </label>
                  );
                })}
              </div>
            )}
          </Field>
        </div>
        <div className="md:col-span-2">
          <label className="flex items-start gap-3">
            <Switch checked={s.reviewIdeas} onCheckedChange={(v) => set("reviewIdeas", v)} />
            <span>
              <span className="block text-sm font-medium">{t.reviewIdeas}</span>
              <span className="block text-xs text-muted-foreground">{t.reviewIdeasHint}</span>
            </span>
          </label>
        </div>
        <div className="md:col-span-2">
          <Field label={t.design} hint={t.designHint}>
            <div className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-1 sm:grid-cols-5">
              {(["auto", "glossy", "bold", "photo", "classic"] as const).map((d) => (
                <button key={d} onClick={() => set("design", d)} className={cn("h-8 rounded-md text-sm font-medium transition", s.design === d ? "bg-background shadow-sm" : "text-muted-foreground")}>
                  {t.designs[d]}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label={t.focus}>
            <textarea value={s.focus} onChange={(e) => set("focus", e.target.value.slice(0, 600))} placeholder={t.focusPh} rows={2} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </Field>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <label className="flex items-center gap-3">
          <Switch checked={s.enabled} onCheckedChange={(v) => set("enabled", v)} />
          <span>
            <span className="block text-sm font-medium">{t.auto}</span>
            <span className="block text-xs text-muted-foreground">{t.autoHint}</span>
          </span>
        </label>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Check />} {t.save}
        </Button>
      </div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

function PostCard({ t, post, today, igReady, productName, onAct, onSaved }: { t: AutopilotText; post: ApPost; today: string; igReady: boolean; productName?: string; onAct: (a: Action) => Promise<boolean>; onSaved: (p: ApPost) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const fails = post.lint?.fails ?? [];
  const warns = post.lint?.warns ?? [];
  const run = async (a: Action) => {
    setBusy(a);
    await onAct(a);
    setBusy(null);
  };
  const copy = async () => {
    await navigator.clipboard.writeText(post.caption);
    toast.success(t.copied);
  };
  const canRegen = post.kind !== "reel" && post.design !== "classic" && post.status !== "posted" && (post.image_regens ?? 0) < 3 && !!post.slides[0]?.visual;
  const KindIcon = post.kind === "reel" ? Clapperboard : post.kind === "carousel" ? Images : Square;
  const status =
    post.status === "posted" ? t.posted : post.status === "approved" ? t.approvedBadge : post.status === "script_ok" ? t.scriptOk : post.status === "rejected" ? t.tabs.rejected : null;

  return (
    <article className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="rounded-md bg-foreground px-1.5 py-0.5 font-semibold tabular-nums text-background">{post.post_time}</span>
          <span className="inline-flex items-center gap-1 font-medium">
            <KindIcon className="size-3.5 text-primary" /> {t.kind[post.kind]}
            {post.kind === "carousel" && <span className="text-muted-foreground">· {t.slides(post.slides.length)}</span>}
          </span>
          {post.kind !== "reel" && post.design !== "classic" && <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-primary sm:inline">{t.designs[post.design]}</span>}
          {post.pillar && <span className="truncate rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{post.pillar}</span>}
        </div>
        {status && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              post.status === "rejected" ? "bg-destructive/10 text-destructive" : post.status === "posted" ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            )}
          >
            {status}
          </span>
        )}
      </div>

      {post.kind === "reel" ? (
        <ReelScript t={t} script={post.script} />
      ) : (
        <div className="relative">
          <SlideStrip post={post} />
          {busy === "regen_image" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-medium text-white backdrop-blur-sm">
              <Loader2 className="mr-2 size-4 animate-spin" /> {t.regening}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 p-4">
        <h3 className="text-sm font-semibold leading-snug">{post.title}</h3>
        {productName && (
          <p className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            <Package className="size-3" /> {productName}
          </p>
        )}
        <div>
          <p className={cn("whitespace-pre-line text-sm leading-relaxed text-muted-foreground", !open && "line-clamp-4")}>{post.caption}</p>
          <button onClick={() => setOpen((v) => !v)} className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-primary">
            {open ? t.less : t.more} <ChevronDown className={cn("size-3 transition", open && "rotate-180")} />
          </button>
        </div>
        {open && post.note && <p className="whitespace-pre-line rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground"><b>{t.note}:</b> {post.note}</p>}

        <div className="flex flex-wrap gap-1.5">
          {fails.map((f) => (
            <span key={f} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
              <AlertTriangle className="size-3" /> {f}
            </span>
          ))}
          {(open ? warns : warns.slice(0, 2)).map((w) => (
            <span key={w} className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-400">
              {w}
            </span>
          ))}
          {!open && warns.length > 2 && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">+{warns.length - 2}</span>}
          {!fails.length && !warns.length && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
              <Check className="size-3" /> {t.lintOk}
            </span>
          )}
        </div>
        {post.kind === "reel" && post.status !== "posted" && <p className="text-xs text-muted-foreground">{t.reelHint}</p>}
        {post.team_review && typeof post.team_review.score === "number" ? (
          <details className="rounded-lg bg-emerald-500/5 p-2 text-xs">
            <summary className="cursor-pointer font-medium text-emerald-700 dark:text-emerald-400">
              ✓ {t.team.score(Math.round(post.team_review.score))}
              {post.team_review.fixed ? ` · ${t.team.fixed}` : ""}
            </summary>
            {!!post.team_review.issues?.length && (
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                {post.team_review.issues.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
          </details>
        ) : (
          !post.team_review && post.status === "draft" && post.created_at && Date.now() - Date.parse(post.created_at) < 15 * 60_000 && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> {t.team.checking}
            </p>
          )
        )}
        {post.error && (post.status === "failed" || post.status === "approved") && (
          <p className={cn("rounded-lg p-2.5 text-xs", post.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700 dark:text-amber-400")}>
            {post.status === "approved" ? `${t.ig.willRetry} ` : ""}
            {post.error.replace(/\s*\[.*\]\s*$/, "")}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 border-t pt-3">
          {post.status === "draft" && (
            <>
              <Button size="sm" onClick={() => run("approve")} disabled={!!busy || fails.length > 0} className="rounded-full">
                {busy === "approve" ? <Loader2 className="animate-spin" /> : <Check />} {busy === "approve" && post.kind !== "reel" ? t.approving : t.approve}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => run("reject")} disabled={!!busy} className="rounded-full text-muted-foreground">
                <X /> {t.reject}
              </Button>
            </>
          )}
          {post.status === "approved" && igReady && post.kind !== "reel" && (
            <Button size="sm" onClick={() => run("publish_now")} disabled={!!busy} className="rounded-full">
              {busy === "publish_now" ? <Loader2 className="animate-spin" /> : <Send />} {busy === "publish_now" ? t.ig.publishing : t.ig.publishNow}
            </Button>
          )}
          {post.status === "failed" && (
            <Button size="sm" variant="outline" onClick={() => run("retry")} disabled={!!busy} className="rounded-full">
              {busy === "retry" ? <Loader2 className="animate-spin" /> : <RotateCcw />} {t.ig.retry}
            </Button>
          )}
          {post.status === "posted" && post.permalink && (
            <Button size="sm" variant="outline" asChild className="rounded-full">
              <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                <Send /> {t.ig.view}
              </a>
            </Button>
          )}
          {(post.status === "approved" || post.status === "script_ok" || post.status === "failed") && post.post_date <= today && !(igReady && post.status === "approved" && post.kind !== "reel") && (
            <Button size="sm" onClick={() => run("posted")} disabled={!!busy} className="rounded-full">
              {busy === "posted" ? <Loader2 className="animate-spin" /> : <Send />} {t.markPosted}
            </Button>
          )}
          {["approved", "script_ok", "rejected"].includes(post.status) && (
            <Button size="sm" variant="ghost" onClick={() => run("restore")} disabled={!!busy} className="rounded-full text-muted-foreground">
              {busy === "restore" ? <Loader2 className="animate-spin" /> : <RotateCcw />} {t.restore}
            </Button>
          )}
          <div className="ml-auto flex items-center gap-0.5">
            {canRegen && (
              <IconBtn label={`${t.regen} · ${t.regenLeft(Math.max(0, 3 - (post.image_regens ?? 0)))}`} onClick={() => run("regen_image")}>
                {busy === "regen_image" ? <Loader2 className="animate-spin" /> : <ImagePlus />}
              </IconBtn>
            )}
            {post.status !== "posted" && (
              <IconBtn label={t.edit} onClick={() => setEditing(true)}>
                <Pencil />
              </IconBtn>
            )}
            <IconBtn label={t.copyCaption} onClick={copy}>
              <Copy />
            </IconBtn>
            <IconBtn label={t.download} href={`/api/autopilot/posts/${post.id}/download`}>
              <Download />
            </IconBtn>
          </div>
        </div>
      </div>
      {editing && <EditPostDialog t={t} post={post} today={today} onClose={() => setEditing(false)} onSaved={(p) => { onSaved(p); setEditing(false); }} />}
    </article>
  );
}

function IconBtn({ label, onClick, href, children }: { label: string; onClick?: () => void; href?: string; children: React.ReactNode }) {
  const cls = "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground [&_svg]:size-4";
  return href ? (
    <a href={href} className={cls} title={label} aria-label={label}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls} title={label} aria-label={label}>
      {children}
    </button>
  );
}

function SlideStrip({ post }: { post: ApPost }) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const n = post.slides.length;
  const v = encodeURIComponent(post.updated_at);
  const go = (d: number) => {
    const el = ref.current;
    if (!el) return;
    const next = Math.max(0, Math.min(n - 1, idx + d));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };
  return (
    <div className="relative bg-[#0A0F23]">
      <div
        ref={ref}
        onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {post.slides.map((_, i) => (
          <div key={i} className="aspect-[4/5] w-full shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/autopilot/posts/${post.id}/slide/${i + 1}?w=720&v=${v}`} alt={`Slide ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} className="size-full object-cover" />
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <button onClick={() => go(-1)} disabled={idx === 0} className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 disabled:!opacity-0" aria-label="prev">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => go(1)} disabled={idx === n - 1} className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 disabled:!opacity-0" aria-label="next">
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/35 px-2 py-1 backdrop-blur">
            {post.slides.map((_, i) => (
              <span key={i} className={cn("h-1.5 rounded-full transition-all", i === idx ? "w-4 bg-white" : "w-1.5 bg-white/45")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReelScript({ t, script }: { t: AutopilotText; script: string | null }) {
  return (
    <div className="relative overflow-hidden bg-[#0A0F23] p-5 text-white">
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[radial-gradient(circle,rgba(10,132,255,0.45),transparent_70%)]" />
      <p className="relative mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
        <Clapperboard className="size-3.5" /> {t.script}
      </p>
      <pre className="relative max-h-80 overflow-y-auto whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-white/85">{script || "—"}</pre>
    </div>
  );
}

function InstagramCard({
  t,
  ig,
  settings,
  onChanged,
  confirm,
}: {
  t: AutopilotText;
  ig: IgStatus;
  settings: ApSettings;
  onChanged: () => void;
  confirm: (o: { title: string; description?: string; confirmLabel?: string; destructive?: boolean }) => Promise<boolean>;
}) {
  const [auto, setAuto] = useState(settings.autoPublish);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    // Hasil kembali dari halaman izin Instagram (?ig=connected / denied / error / personal).
    const q = new URLSearchParams(window.location.search).get("ig");
    if (!q) return;
    const msg = t.ig.toasts[q];
    if (msg) (q === "connected" ? toast.success : toast.error)(msg);
    window.history.replaceState(null, "", window.location.pathname);
  }, [t]);
  const ok = ig.connected && ig.status === "active" && ig.canPublish;

  async function toggle(v: boolean) {
    setAuto(v);
    const r = await call("/api/autopilot/settings", {
      workspaceId: settings.workspaceId,
      enabled: settings.enabled,
      cadence: settings.cadence,
      postsPerWeek: settings.postsPerWeek,
      slotTimes: settings.slotTimes,
      focus: settings.focus.trim() || null,
      design: settings.design,
      autoPublish: v,
      goal: settings.goal,
      pillarMix: settings.goal === "custom" ? settings.pillarMix : null,
      reviewIdeas: settings.reviewIdeas,
    });
    if (!r.ok) {
      setAuto(!v);
      toast.error(errText(t, r.error));
    } else onChanged();
  }
  async function disconnect() {
    if (!(await confirm({ title: t.ig.disconnectConfirm, description: t.ig.disconnectDesc, confirmLabel: t.ig.disconnect, destructive: true }))) return;
    setBusy(true);
    await call("/api/instagram/disconnect");
    setBusy(false);
    onChanged();
  }

  return (
    <section className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#515BD4] text-white">
        {ig.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ig.picture} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <Send className="size-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{ig.connected && ig.username ? t.ig.connectedAs(ig.username) : t.ig.title}</p>
        <p className="text-xs text-muted-foreground">
          {!ig.connected ? t.ig.connectSub : !ig.canPublish ? t.ig.personal : ig.status !== "active" ? t.ig.expired : t.ig.autoPublishHint}
        </p>
      </div>
      {ok && (
        <label className="flex items-center gap-2 text-sm font-medium">
          <Switch checked={auto} onCheckedChange={toggle} /> {t.ig.autoPublish}
        </label>
      )}
      {!ig.connected || !ok ? (
        <Button asChild className="rounded-full">
          <a href="/api/instagram/start">
            <Send /> {ig.connected ? t.ig.reconnect : t.ig.connect}
          </a>
        </Button>
      ) : null}
      {ig.connected && (
        <Button variant="ghost" size="sm" onClick={disconnect} disabled={busy} className="text-muted-foreground">
          {busy ? <Loader2 className="animate-spin" /> : <X />} {t.ig.disconnect}
        </Button>
      )}
    </section>
  );
}
