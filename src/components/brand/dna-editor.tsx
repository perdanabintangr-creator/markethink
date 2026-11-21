"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { DNA_ROLES, type BrandDna, type DnaRole } from "@/lib/brand/dna";
import { FONT_IDS } from "@/lib/autopilot/style";
import type { ObVersion } from "./onboarding-view";

const ROLE_LABEL: Record<DnaRole, { id: string; en: string; who: string }> = {
  creative_director: {
    id: "Creative Director",
    en: "Creative Director",
    who: "Big idea, mood, pilar konten, keputusan akhir",
  },
  designer: {
    id: "Designer",
    en: "Designer",
    who: "Palet, tipografi, gaya foto, casting, panduan gambar AI",
  },
  copywriter: {
    id: "Copywriter",
    en: "Copywriter",
    who: "Tone, kosakata, kata terlarang, hook, CTA, contoh caption",
  },
  socmed: {
    id: "Socmed Specialist",
    en: "Socmed Specialist",
    who: "Audiens, campuran format & pilar, jam posting, benchmark",
  },
};

/** Label field Brand DNA (kunci JSON → bahasa manusia). */
const LABEL: Record<string, string> = {
  big_idea: "Big idea",
  positioning: "Positioning",
  mood_keywords: "Mood keywords",
  moodboard: "Moodboard",
  pillars: "Pilar konten",
  name: "Nama",
  description: "Deskripsi",
  consistency_notes: "Catatan konsistensi & keputusan",
  palette: "Palet warna",
  primary: "Utama",
  secondary: "Kedua",
  accent: "Aksen",
  background: "Latar",
  rules: "Aturan",
  typography: "Tipografi",
  font: "Font",
  layout_rules: "Aturan layout",
  image_style: "Gaya gambar",
  type: "Jenis",
  lighting: "Pencahayaan",
  angle: "Sudut kamera",
  composition: "Komposisi",
  casting_guide: "Panduan casting talent",
  prompt_style_guide: "Panduan prompt gambar AI (English)",
  tone: "Tone",
  pronoun: "Sapaan",
  vocabulary: "Kosakata khas",
  forbidden: "Kata terlarang",
  hook_patterns: "Pola hook",
  cta_style: "Gaya CTA",
  sample_captions: "Contoh caption",
  audience: "Audiens",
  profile: "Profil",
  problems: "Masalah",
  desires: "Keinginan",
  active_times: "Waktu aktif",
  format_mix: "Campuran format / minggu",
  carousel: "Carousel",
  reel: "Reel",
  image: "Single image",
  pillar_mix: "Campuran pilar (%)",
  edukasi: "Edukasi",
  relatable: "Relatable",
  insight: "Insight",
  produk: "Produk",
  posting_times: "Jam posting (WIB)",
  competitor_benchmark: "Benchmark kompetitor",
  works: "Yang berhasil",
  gaps: "Celah untuk brand ini",
};
const HIDDEN = new Set(["style_dna"]);
const HEX = /^#[0-9A-Fa-f]{6}$/;

export function DnaEditor({ lang, workspaceId, versions, approvedVersion }: { lang: "id" | "en"; workspaceId: string; versions: ObVersion[]; approvedVersion: number | null }) {
  const router = useRouter();
  const [selected, setSelected] = useState(versions[0].version);
  const current = versions.find((v) => v.version === selected) ?? versions[0];
  const [dna, setDna] = useState<BrandDna>(current.dna);
  const [tab, setTab] = useState<DnaRole>("creative_director");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  function pick(v: number) {
    const row = versions.find((x) => x.version === v);
    if (!row) return;
    setSelected(v);
    setDna(row.dna);
    setDirty(false);
  }

  function update(role: DnaRole, value: unknown) {
    setDna((d) => ({ ...d, [role]: value }) as BrandDna);
    setDirty(true);
  }

  async function saveEdit() {
    setBusy("save");
    const res = await fetch("/api/brand/dna", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, version: current.version, dna }),
    });
    setBusy(null);
    if (!res.ok) return void toast.error(lang === "en" ? "Couldn't save." : "Gagal menyimpan editan.");
    const j = await res.json();
    toast.success(j.version !== current.version ? `Editan disimpan sebagai v${j.version}` : "Editan tersimpan");
    setDirty(false);
    router.refresh();
    if (j.version !== current.version) setSelected(j.version);
  }

  async function approve() {
    if (dirty) return void toast.error("Simpan editan dulu sebelum ACC.");
    setBusy("acc");
    const res = await fetch("/api/brand/dna/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, version: current.version }),
    });
    setBusy(null);
    if (!res.ok) return void toast.error(lang === "en" ? "Couldn't approve." : "Gagal ACC Brand DNA.");
    toast.success(`Brand DNA v${current.version} di-ACC — Autopilot terbuka`);
    router.refresh();
  }

  const isActive = approvedVersion === current.version;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {versions.map((v) => (
          <button
            key={v.version}
            type="button"
            onClick={() => pick(v.version)}
            className={`rounded-full border px-3 py-1 ${v.version === selected ? "border-foreground bg-foreground text-background" : "hover:bg-muted"}`}
          >
            v{v.version}
            {v.version === approvedVersion ? " · ACC" : v.status === "draft" ? " · draf" : ""}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {current.cost_usd ? `Biaya riset & tim AI: $${Number(current.cost_usd).toFixed(3)}` : ""}
          {current.edited_by_user ? " · diedit" : ""}
        </span>
      </div>

      <Swatches dna={dna} />

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1" role="tablist">
        {DNA_ROLES.map((r) => (
          <button
            key={r}
            role="tab"
            type="button"
            aria-selected={tab === r}
            onClick={() => setTab(r)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${tab === r ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {ROLE_LABEL[r][lang]}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{ROLE_LABEL[tab].who}</p>
      <div className="space-y-4">
        <ObjectEditor value={dna[tab] as unknown as Record<string, unknown>} onChange={(v) => update(tab, v)} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        {isActive && !dirty && (
          <span className="mr-auto inline-flex items-center gap-1 text-sm text-emerald-600">
            <Check className="size-4" /> Versi aktif — dipakai semua agen Autopilot
          </span>
        )}
        <Button variant="outline" onClick={saveEdit} disabled={!dirty || busy !== null}>
          {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Simpan editan
        </Button>
        <Button onClick={approve} disabled={busy !== null || (isActive && !dirty)}>
          {busy === "acc" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          ACC Brand DNA
        </Button>
      </div>
    </div>
  );
}

function Swatches({ dna }: { dna: BrandDna }) {
  const p = dna.designer.palette;
  const colors = [p.primary, p.secondary, p.accent, p.background].filter((c): c is string => Boolean(c));
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
      <div className="flex">
        {colors.map((c) => (
          <span key={c} className="-ml-1 size-9 rounded-full border-2 border-background first:ml-0" style={{ background: c }} title={c} />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{dna.creative_director.big_idea}</p>
        <p className="truncate text-xs text-muted-foreground">{dna.creative_director.mood_keywords.join(" · ")}</p>
      </div>
    </div>
  );
}

/** Editor umum: teks, daftar teks (satu per baris), angka, warna hex, objek bertingkat, daftar objek. */
function ObjectEditor({ value, onChange }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Object.entries(value ?? {})
        .filter(([k]) => !HIDDEN.has(k))
        .map(([k, v]) => (
          <FieldEditor key={k} name={k} value={v} onChange={(nv) => onChange({ ...value, [k]: nv })} />
        ))}
    </div>
  );
}

function FieldEditor({ name, value, onChange }: { name: string; value: unknown; onChange: (v: unknown) => void }) {
  const label = LABEL[name] ?? name;
  if (typeof value === "number")
    return (
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
      </label>
    );
  if (typeof value === "string") {
    if (name === "font")
      return (
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <select className="h-10 w-full rounded-lg border bg-background px-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
            {FONT_IDS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
      );
    if (HEX.test(value))
      return (
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className="flex items-center gap-2">
            <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-10 w-12 cursor-pointer rounded border bg-background" />
            <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" />
          </span>
        </label>
      );
    const long = value.length > 70;
    return (
      <label className={`block space-y-1 ${long ? "md:col-span-2" : ""}`}>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {long ? (
          <Textarea rows={Math.min(8, Math.ceil(value.length / 90) + 1)} value={value} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <Input value={value} onChange={(e) => onChange(e.target.value)} />
        )}
      </label>
    );
  }
  if (Array.isArray(value)) {
    if (value.every((x) => typeof x === "string"))
      return (
        <label className="block space-y-1 md:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">{label} (satu per baris)</span>
          <Textarea
            rows={Math.min(10, Math.max(2, value.length + 1))}
            value={(value as string[]).join("\n")}
            onChange={(e) =>
              onChange(
                e.target.value
                  .split("\n")
                  .map((x) => x.replace(/\s+$/, ""))
                  .filter((x, i, a) => x || i === a.length - 1),
              )
            }
          />
        </label>
      );
    return (
      <div className="space-y-2 md:col-span-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {(value as Record<string, unknown>[]).map((item, i) => (
          <div key={i} className="rounded-xl border p-3">
            <ObjectEditor value={item} onChange={(nv) => onChange(value.map((x, j) => (j === i ? nv : x)))} />
          </div>
        ))}
      </div>
    );
  }
  if (value && typeof value === "object")
    return (
      <fieldset className="space-y-2 rounded-xl border p-3 md:col-span-2">
        <legend className="px-1 text-xs font-semibold">{label}</legend>
        <ObjectEditor value={value as Record<string, unknown>} onChange={onChange as (v: Record<string, unknown>) => void} />
      </fieldset>
    );
  return null;
}
