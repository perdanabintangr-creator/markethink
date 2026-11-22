"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, ImagePlus, Loader2, Lock, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { uploadFile, UPLOAD_ERRORS } from "@/lib/upload-client";
import { CONTENT_GOALS, CTA_TYPES, MAX_REAL_PHOTOS, MAX_SCREENSHOTS, MIN_REAL_PHOTOS, type AssetKind } from "@/lib/brand/onboarding";
import { DnaEditor } from "./dna-editor";
import type { BrandDna } from "@/lib/brand/dna";

export interface ObAsset {
  id: string;
  kind: AssetKind;
}
export interface ObVersion {
  version: number;
  status: "draft" | "approved" | "superseded";
  dna: BrandDna;
  cost_usd: number | null;
  edited_by_user: boolean;
  approved_at: string | null;
  created_at: string;
}
export interface ObData {
  workspaceId: string;
  name: string;
  kit: Record<string, string>;
  assets: ObAsset[];
  versions: ObVersion[];
  percent: number;
  missing: { key: string; label: string }[];
  status: string;
  approvedVersion: number | null;
  kitChanged: boolean;
}

const T = {
  id: {
    back: "Kembali ke Autopilot",
    title: "Brand Onboarding",
    sub: "Isi profil brand sekali. Tim AI Marqthink (Creative Director, Designer, Copywriter, Socmed Specialist) meriset brand kamu lalu menyusun Brand DNA — acuan semua konten Autopilot.",
    progress: "Kelengkapan brand",
    missing: "Belum diisi (wajib):",
    required: "1 · Data wajib",
    assets: "2 · Logo & foto asli",
    optional: "3 · Data tambahan (opsional — bisa dilengkapi otomatis dari riset)",
    dna: "4 · Brand DNA",
    save: "Simpan draf",
    saved: "Draf tersimpan",
    err: "Gagal menyimpan. Coba lagi.",
    logo: "Logo",
    logoHint: "PNG/JPG, latar transparan lebih baik.",
    photos: `Foto asli (${MIN_REAL_PHOTOS}–${MAX_REAL_PHOTOS})`,
    photosHint: "Foto produk, tempat, atau layanan kamu yang asli — dipakai sebagai acuan gambar AI.",
    shots: "Screenshot (opsional)",
    shotsHint: `Karena Instagram tidak bisa ditelusuri otomatis, unggah 3–${MAX_SCREENSHOTS} screenshot feed kamu, kompetitor, dan akun referensi.`,
    feed: "Feed brand",
    competitor: "Kompetitor",
    reference: "Referensi gaya",
    upload: "Unggah",
    uploading: "Mengunggah…",
    gen: "Riset & susun Brand DNA",
    regen: "Perbarui Brand DNA",
    genning: "Tim AI sedang meriset & menyusun Brand DNA (±2–4 menit)…",
    genDone: "Brand DNA siap ditinjau",
    genErr: "Gagal menyusun Brand DNA. Coba lagi beberapa saat lagi.",
    needReq: "Lengkapi semua data wajib dulu untuk membuat Brand DNA.",
    noDna: "Belum ada Brand DNA. Setelah data wajib lengkap, klik tombol di atas.",
    changed: "Brand Kit berubah sejak Brand DNA terakhir di-ACC. Perbarui Brand DNA supaya konten mengikuti data terbaru.",
    approved: "Aktif",
    open: "Buka Autopilot",
  },
  en: {
    back: "Back to Autopilot",
    title: "Brand Onboarding",
    sub: "Fill in your brand profile once. Marqthink's AI team (Creative Director, Designer, Copywriter, Socmed Specialist) researches your brand and builds a Brand DNA — the reference for all Autopilot content.",
    progress: "Brand completeness",
    missing: "Still missing (required):",
    required: "1 · Required",
    assets: "2 · Logo & real photos",
    optional: "3 · Extra details (optional — can be filled from research)",
    dna: "4 · Brand DNA",
    save: "Save draft",
    saved: "Draft saved",
    err: "Couldn't save. Please try again.",
    logo: "Logo",
    logoHint: "PNG/JPG, transparent background preferred.",
    photos: `Real photos (${MIN_REAL_PHOTOS}–${MAX_REAL_PHOTOS})`,
    photosHint: "Real photos of your product, place or service — used as references for AI images.",
    shots: "Screenshots (optional)",
    shotsHint: `Instagram can't be crawled automatically, so upload 3–${MAX_SCREENSHOTS} screenshots of your feed, competitors and reference accounts.`,
    feed: "Brand feed",
    competitor: "Competitors",
    reference: "Style references",
    upload: "Upload",
    uploading: "Uploading…",
    gen: "Research & build Brand DNA",
    regen: "Update Brand DNA",
    genning: "The AI team is researching & building your Brand DNA (±2–4 min)…",
    genDone: "Brand DNA ready for review",
    genErr: "Couldn't build the Brand DNA. Please try again shortly.",
    needReq: "Complete all required fields first to build the Brand DNA.",
    noDna: "No Brand DNA yet. Once the required fields are done, click the button above.",
    changed: "Your Brand Kit changed since the last approved Brand DNA. Update it so content follows the latest data.",
    approved: "Active",
    open: "Open Autopilot",
  },
};

const GOAL_LABEL: Record<(typeof CONTENT_GOALS)[number], string> = {
  awareness: "Awareness (dikenal)",
  jualan: "Jualan",
  booking: "Booking / reservasi",
  komunitas: "Komunitas",
};
const CTA_LABEL: Record<(typeof CTA_TYPES)[number], string> = {
  whatsapp: "Chat WhatsApp",
  link_booking: "Link booking",
  dm: "DM Instagram",
  datang: "Datang ke lokasi",
};

const REQ_TEXT: { key: string; label: string; ph: string; long?: boolean }[] = [
  {
    key: "category",
    label: "Kategori / industri",
    ph: "mis. Photobox & photo booth event",
  },
  {
    key: "instagram",
    label: "Link / akun Instagram",
    ph: "@namabrand atau instagram.com/namabrand",
  },
  {
    key: "target_audience",
    label: "Target audiens",
    ph: "Siapa pembeli utamamu? Usia, gaya hidup, kebutuhan",
    long: true,
  },
  {
    key: "location",
    label: "Lokasi / area layanan",
    ph: "mis. Jakarta Selatan & Tangerang, bisa dipanggil ke event",
  },
];
const OPT_TEXT: { key: string; label: string; ph: string; long?: boolean }[] = [
  { key: "website", label: "Website", ph: "https://…" },
  { key: "maps", label: "Google Maps", ph: "Link Google Maps" },
  { key: "tiktok", label: "TikTok", ph: "@akun" },
  { key: "color_primary", label: "Warna utama (hex)", ph: "#F2994A" },
  { key: "color_secondary", label: "Warna kedua (hex)", ph: "#1F2937" },
  { key: "fonts", label: "Font / gaya huruf", ph: "mis. rounded, ceria" },
  {
    key: "products",
    label: "Produk/layanan + harga",
    ph: "Satu per baris: nama — harga",
    long: true,
  },
  {
    key: "promos",
    label: "Promo berjalan",
    ph: "Hanya promo yang benar-benar berlaku",
    long: true,
  },
  {
    key: "usp",
    label: "Keunggulan (USP)",
    ph: "Kenapa orang memilih brand kamu?",
    long: true,
  },
  {
    key: "competitor_accounts",
    label: "2–3 akun kompetitor",
    ph: "@kompetitor1, @kompetitor2",
  },
  {
    key: "reference_accounts",
    label: "2–3 akun referensi gaya",
    ph: "@akunyangkamusuka",
  },
  {
    key: "caption_examples",
    label: "Contoh caption yang kamu suka",
    ph: "Tempel 1–3 caption",
    long: true,
  },
  {
    key: "brand_voice",
    label: "Gaya bicara",
    ph: "mis. santai, ceria, pakai 'kamu'",
    long: true,
  },
  { key: "voice_dont", label: "Kata terlarang", ph: "Pisahkan dengan koma" },
  {
    key: "visual_dont",
    label: "Visual terlarang",
    ph: "mis. tanpa alkohol, tanpa pakaian terbuka",
  },
  { key: "sensitive", label: "Hal sensitif", ph: "mis. halal, SARA, politik" },
  {
    key: "talent_pref",
    label: "Preferensi talent",
    ph: "mis. perempuan 20-an berhijab & tidak, ekspresi ceria",
  },
];

export function OnboardingView({ lang, data, workspaces }: { lang: "id" | "en"; data: ObData; workspaces: { id: string; name: string }[] }) {
  const t = T[lang];
  const router = useRouter();
  const [name, setName] = useState(data.name);
  const [kit, setKit] = useState<Record<string, string>>(data.kit);
  const [busy, setBusy] = useState<string | null>(null);
  const [percent, setPercent] = useState(data.percent);
  const [missing, setMissing] = useState(data.missing);
  const latest = data.versions[0] ?? null;
  const set = (k: string, v: string) => setKit((p) => ({ ...p, [k]: v }));

  async function save(silent = false) {
    setBusy("save");
    const fields: Record<string, string | null> = {};
    for (const f of [...REQ_TEXT, ...OPT_TEXT]) fields[f.key] = kit[f.key] ?? "";
    fields.content_goal = kit.content_goal || null;
    fields.cta_primary = kit.cta_primary || null;
    fields.cta_link = kit.cta_link ?? "";
    const res = await fetch("/api/brand/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: data.workspaceId, name, fields }),
    });
    setBusy(null);
    if (!res.ok) {
      toast.error(t.err);
      return false;
    }
    const j = await res.json();
    if (j.completeness) {
      setPercent(j.completeness.percent);
      setMissing(j.completeness.missing);
    }
    if (!silent) toast.success(t.saved);
    router.refresh();
    return true;
  }

  async function generate() {
    if (!(await save(true))) return;
    setBusy("dna");
    const res = await fetch("/api/brand/dna", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: data.workspaceId }),
    });
    setBusy(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return void toast.error(
        j.error === "onboarding_incomplete"
          ? t.needReq
          : j.error === "dna_limit"
            ? lang === "en"
              ? "Brand DNA can be rebuilt up to 3× per 30 days. You can still edit the current version."
              : "Brand DNA bisa dibuat ulang maks 3× per 30 hari. Versi sekarang tetap bisa diedit."
            : j.error === "plan"
              ? lang === "en"
                ? "Brand DNA is part of the Content Autopilot plan."
                : "Brand DNA termasuk Paket Autopilot Konten."
              : t.genErr,
      );
    }
    toast.success(t.genDone);
    router.refresh();
  }

  const requiredDone = missing.length === 0;
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of data.assets) c[a.kind] = (c[a.kind] ?? 0) + 1;
    return c;
  }, [data.assets]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 pt-6 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/autopilot" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> {t.back}
          </Link>
          {workspaces.length > 1 && (
            <select
              className="h-9 rounded-lg border bg-background px-2 text-sm"
              value={data.workspaceId}
              onChange={(e) => router.push(`/autopilot/onboarding?ws=${e.target.value}`)}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{t.sub}</p>
        </header>

        {/* Kelengkapan */}
        <section className="rounded-2xl border bg-card p-4 md:p-5" data-testid="completeness">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">{t.progress}</span>
            <span className="text-2xl font-semibold tabular-nums">{percent}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all" style={{ width: `${percent}%` }} />
          </div>
          {missing.length > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              <Lock className="mr-1 inline size-3.5" />
              {t.missing} {missing.map((m) => m.label).join(" · ")}
            </p>
          ) : (
            <p className="mt-3 text-xs text-emerald-600">
              <Check className="mr-1 inline size-3.5" />
              {lang === "en" ? "All required fields are complete." : "Semua data wajib lengkap."}
            </p>
          )}
        </section>

        {/* 1. Wajib */}
        <section className="space-y-4 rounded-2xl border bg-card p-4 md:p-5">
          <h2 className="font-semibold">{t.required}</h2>
          <Field label="Nama brand">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            {REQ_TEXT.map((f) => (
              <Field key={f.key} label={f.label} wide={f.long}>
                {f.long ? (
                  <Textarea rows={3} value={kit[f.key] ?? ""} placeholder={f.ph} onChange={(e) => set(f.key, e.target.value)} />
                ) : (
                  <Input value={kit[f.key] ?? ""} placeholder={f.ph} onChange={(e) => set(f.key, e.target.value)} />
                )}
              </Field>
            ))}
          </div>
          <Field label="Tujuan konten utama">
            <Chips
              options={CONTENT_GOALS.map((g) => ({
                value: g,
                label: GOAL_LABEL[g],
              }))}
              value={kit.content_goal ?? ""}
              onChange={(v) => set("content_goal", v)}
            />
          </Field>
          <Field label="CTA utama">
            <Chips options={CTA_TYPES.map((g) => ({ value: g, label: CTA_LABEL[g] }))} value={kit.cta_primary ?? ""} onChange={(v) => set("cta_primary", v)} />
            {(kit.cta_primary === "whatsapp" || kit.cta_primary === "link_booking") && (
              <Input
                className="mt-2"
                value={kit.cta_link ?? ""}
                placeholder={kit.cta_primary === "whatsapp" ? "Nomor/Link WhatsApp" : "Link booking"}
                onChange={(e) => set("cta_link", e.target.value)}
              />
            )}
          </Field>
        </section>

        {/* 2. Aset */}
        <section className="space-y-5 rounded-2xl border bg-card p-4 md:p-5">
          <h2 className="font-semibold">{t.assets}</h2>
          <AssetGroup t={t} workspaceId={data.workspaceId} kind="logo" title={t.logo} hint={t.logoHint} assets={data.assets.filter((a) => a.kind === "logo")} max={1} />
          <AssetGroup
            t={t}
            workspaceId={data.workspaceId}
            kind="real_photo"
            title={`${t.photos} · ${counts.real_photo ?? 0}/${MAX_REAL_PHOTOS}`}
            hint={t.photosHint}
            assets={data.assets.filter((a) => a.kind === "real_photo")}
            max={MAX_REAL_PHOTOS}
          />
          <div className="space-y-1">
            <p className="text-sm font-medium">{t.shots}</p>
            <p className="text-xs text-muted-foreground">{t.shotsHint}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {(
              [
                ["feed_screenshot", t.feed],
                ["competitor_screenshot", t.competitor],
                ["reference_screenshot", t.reference],
              ] as const
            ).map(([k, label]) => (
              <AssetGroup key={k} t={t} workspaceId={data.workspaceId} kind={k} title={label} assets={data.assets.filter((a) => a.kind === k)} max={MAX_SCREENSHOTS} compact />
            ))}
          </div>
        </section>

        {/* 3. Opsional */}
        <details className="group rounded-2xl border bg-card p-4 md:p-5">
          <summary className="cursor-pointer list-none font-semibold">{t.optional}</summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {OPT_TEXT.map((f) => (
              <Field key={f.key} label={f.label} wide={f.long}>
                {f.long ? (
                  <Textarea rows={3} value={kit[f.key] ?? ""} placeholder={f.ph} onChange={(e) => set(f.key, e.target.value)} />
                ) : (
                  <Input value={kit[f.key] ?? ""} placeholder={f.ph} onChange={(e) => set(f.key, e.target.value)} />
                )}
              </Field>
            ))}
          </div>
        </details>

        {/* 4. Brand DNA */}
        <section className="space-y-4 rounded-2xl border bg-card p-4 md:p-5" data-testid="dna">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">{t.dna}</h2>
            <Button onClick={generate} disabled={!requiredDone || busy !== null} variant={latest ? "outline" : "default"}>
              {busy === "dna" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {busy === "dna" ? t.genning : latest ? t.regen : t.gen}
            </Button>
          </div>
          {!requiredDone && <p className="text-xs text-muted-foreground">{t.needReq}</p>}
          {data.kitChanged && <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">{t.changed}</p>}
          {latest ? (
            <DnaEditor lang={lang} workspaceId={data.workspaceId} versions={data.versions} approvedVersion={data.approvedVersion} />
          ) : (
            <p className="text-sm text-muted-foreground">{t.noDna}</p>
          )}
        </section>
      </div>
      <div className="sticky bottom-0 z-20 mt-6 border-t bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <span className="text-sm text-muted-foreground">
            {t.progress} <b className="text-foreground">{percent}%</b>
          </span>
          <div className="flex gap-2">
            {data.approvedVersion && (
              <Button variant="outline" asChild>
                <Link href="/autopilot">{t.open}</Link>
              </Button>
            )}
            <Button onClick={() => save()} disabled={busy !== null}>
              {busy === "save" && <Loader2 className="size-4 animate-spin" />}
              {t.save}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block space-y-1.5 ${wide ? "md:col-span-2" : ""}`}>
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Chips({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-3 py-1.5 text-sm transition ${value === o.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function AssetGroup({
  t,
  workspaceId,
  kind,
  title,
  hint,
  assets,
  max,
  compact,
}: {
  t: (typeof T)["id"];
  workspaceId: string;
  kind: AssetKind;
  title: string;
  hint?: string;
  assets: ObAsset[];
  max: number;
  compact?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const room = kind === "logo" ? 1 : Math.max(0, max - assets.length);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const ids: string[] = [];
    for (const f of [...files].slice(0, Math.max(1, room))) {
      const r = await uploadFile<{ id: string }>(f, { scope: "chat" });
      if ("error" in r) toast.error(UPLOAD_ERRORS[r.error] ?? r.message ?? t.err);
      else ids.push(r.id);
    }
    if (ids.length) {
      const res = await fetch("/api/brand/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, kind, attachmentIds: ids }),
      });
      if (!res.ok) toast.error(t.err);
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/brand/assets/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {assets.map((a) => (
          <div key={a.id} className={`group relative overflow-hidden rounded-xl border bg-muted ${compact ? "size-20" : "size-24"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/brand/assets/${a.id}`} alt="" className={`size-full ${kind === "logo" ? "object-contain p-2" : "object-cover"}`} />
            <button
              type="button"
              onClick={() => remove(a.id)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
              aria-label="Hapus"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {(room > 0 || kind === "logo") && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs text-muted-foreground hover:bg-muted ${compact ? "size-20" : "size-24"}`}
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            {busy ? t.uploading : t.upload}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple={kind !== "logo"} className="hidden" onChange={(e) => add(e.target.files)} />
    </div>
  );
}
