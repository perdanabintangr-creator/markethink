"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ImagePlus, Loader2, Palette, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { INDUSTRIES, STYLE_PRESETS, presetById } from "@/lib/autopilot/presets";
import { uploadFile, UPLOAD_ERRORS } from "@/lib/upload-client";
import type { StyleDna } from "@/lib/autopilot/style";

export interface BrandStyleRow {
  id: string;
  name: string;
  dna: StyleDna;
  analysis: string | null;
  updated_at: string;
}

const T = {
  id: {
    title: "Gaya desain",
    sub: "Pilih gaya sesuai industri, atau unggah referensi desain yang kamu suka dan tim AI mempelajarinya.",
    current: "Gaya aktif",
    auto: "Otomatis (bergantian Glossy, Bold, Foto)",
    tabs: { industry: "Gaya industri", refs: "Referensi saya" },
    pickIndustry: "Pilih industri brand kamu",
    use: "Pakai gaya ini",
    active: "Dipakai",
    useAuto: "Kembali ke otomatis",
    refsTitle: "Unggah 3–10 contoh desain yang kamu suka",
    refsSub: "Screenshot IG brand idola, desain lama kamu, atau moodboard. Tim AI meniru nuansa & gayanya (bukan logo/teks/foto merek lain). Warna tetap dari Brand Kit.",
    add: "Tambah gambar",
    analyze: "Pelajari gaya ini",
    analyzing: "Tim AI sedang mempelajari referensi…",
    learned: "Yang ditangkap tim AI",
    feedbackPh: "Kurang pas? Tulis masukan, mis. \"hurufnya lebih elegan\", \"latar lebih gelap\"",
    adjust: "Sesuaikan",
    del: "Hapus",
    myStyles: "Gaya dari referensi",
    saved: "Gaya dipakai untuk konten berikutnya",
    err: "Gagal. Coba lagi sebentar lagi.",
    preview: "Pratinjau dengan brand kamu (visual AI asli dibuat saat konten dibuat)",
  },
  en: {
    title: "Design style",
    sub: "Pick a style for your industry, or upload design references you like and the AI team learns them.",
    current: "Active style",
    auto: "Auto (rotates Glossy, Bold, Photo)",
    tabs: { industry: "Industry styles", refs: "My references" },
    pickIndustry: "Choose your brand's industry",
    use: "Use this style",
    active: "In use",
    useAuto: "Back to auto",
    refsTitle: "Upload 3–10 designs you like",
    refsSub: "Screenshots of brands you admire, your past designs, or a moodboard. The AI team mirrors the feel & style (never other brands' logos/text/photos). Colours stay from your Brand Kit.",
    add: "Add images",
    analyze: "Learn this style",
    analyzing: "The AI team is studying your references…",
    learned: "What the AI team picked up",
    feedbackPh: "Not quite? Add feedback, e.g. \"more elegant type\", \"darker background\"",
    adjust: "Adjust",
    del: "Delete",
    myStyles: "Styles from references",
    saved: "Style applied to upcoming content",
    err: "Failed. Please try again shortly.",
    preview: "Preview with your brand (real AI visuals are created with the content)",
  },
};

async function post(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: method === "DELETE" ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function Previews({ q, ws }: { q: string; ws: string | null }) {
  const w = ws ? `&ws=${ws}` : "";
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {[1, 2, 3].map((n) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={n} src={`/api/autopilot/style/preview?${q}&n=${n}${w}`} alt="" loading="lazy" className="aspect-[4/5] w-full rounded-lg bg-muted object-cover ring-1 ring-black/5" />
      ))}
    </div>
  );
}

export function StyleSection({
  lang,
  workspaceId,
  industry: initialIndustry,
  presetId,
  styleId,
  styles,
}: {
  lang: "id" | "en";
  workspaceId: string | null;
  industry: string | null;
  presetId: string | null;
  styleId: string | null;
  styles: BrandStyleRow[];
}) {
  const t = T[lang];
  const router = useRouter();
  const [tab, setTab] = useState<"industry" | "refs">(styleId ? "refs" : "industry");
  const [industry, setIndustry] = useState<string>(initialIndustry ?? presetById(presetId)?.industry ?? INDUSTRIES[0].id);
  const [busy, setBusy] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const input = useRef<HTMLInputElement>(null);

  const activeName = styleId ? styles.find((s) => s.id === styleId)?.name : presetId ? presetById(presetId)?.dna.name : null;

  async function choose(body: Record<string, unknown>, key: string) {
    setBusy(key);
    const r = await post("/api/autopilot/style", { industry, ...body });
    setBusy(null);
    if (!r.ok) return void toast.error(t.err);
    toast.success(t.saved);
    router.refresh();
  }

  async function analyze() {
    if (!files.length) return;
    setBusy("analyze");
    const ids: string[] = [];
    for (const f of files.slice(0, 10)) {
      const r = await uploadFile<{ id: string }>(f, { scope: "chat" });
      if ("error" in r) {
        toast.error(UPLOAD_ERRORS[r.error] ?? r.message ?? t.err);
        continue;
      }
      ids.push(r.id);
    }
    if (!ids.length) return setBusy(null);
    const r = await post("/api/autopilot/styles/analyze", { attachmentIds: ids, workspaceId });
    setBusy(null);
    if (!r.ok) return void toast.error(t.err);
    setFiles([]);
    await choose({ mode: "custom", styleId: r.data.style.id }, "analyze");
  }

  async function adjust(id: string) {
    const fb = feedback[id]?.trim();
    if (!fb) return;
    setBusy(`adj-${id}`);
    const r = await post("/api/autopilot/styles/analyze", { styleId: id, feedback: fb, workspaceId });
    setBusy(null);
    if (!r.ok) return void toast.error(t.err);
    setFeedback((x) => ({ ...x, [id]: "" }));
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(`del-${id}`);
    await post(`/api/autopilot/styles/${id}`, null, "DELETE");
    setBusy(null);
    router.refresh();
  }

  return (
    <section className="mt-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Palette className="size-4 text-primary" /> {t.title}
          </h2>
          <p className="text-sm text-muted-foreground">{t.sub}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {t.current}: {activeName ?? t.auto}
          </span>
          {(styleId || presetId) && (
            <Button size="sm" variant="ghost" onClick={() => choose({ mode: "auto" }, "auto")} disabled={!!busy}>
              {busy === "auto" ? <Loader2 className="animate-spin" /> : <X />} {t.useAuto}
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 inline-flex gap-1 rounded-full border bg-muted/40 p-1">
        {(["industry", "refs"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={cn("rounded-full px-4 py-1.5 text-xs font-medium transition", tab === k ? "bg-background shadow-sm" : "text-muted-foreground")}>
            {t.tabs[k]}
          </button>
        ))}
      </div>

      {tab === "industry" ? (
        <>
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t.pickIndustry}</p>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind.id}
                onClick={() => setIndustry(ind.id)}
                className={cn("rounded-full border px-3 py-1 text-xs transition", industry === ind.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}
              >
                {lang === "en" ? ind.en_label : ind.id_label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {STYLE_PRESETS.filter((p) => p.industry === industry).map((p) => {
              const on = presetId === p.id && !styleId;
              return (
                <div key={p.id} className={cn("rounded-xl border p-3 transition", on && "border-primary ring-2 ring-primary/30")}>
                  <Previews q={`preset=${p.id}`} ws={workspaceId} />
                  <p className="mt-3 text-sm font-semibold">{p.dna.name}</p>
                  <p className="text-xs text-muted-foreground">{p.dna.description}</p>
                  <Button size="sm" className="mt-3 w-full rounded-full" variant={on ? "outline" : "default"} disabled={on || !!busy} onClick={() => choose({ mode: "preset", presetId: p.id }, p.id)}>
                    {busy === p.id ? <Loader2 className="animate-spin" /> : <Check />} {on ? t.active : t.use}
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t.preview}</p>
        </>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-dashed p-4">
            <p className="text-sm font-semibold">{t.refsTitle}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t.refsSub}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative size-20 overflow-hidden rounded-lg ring-1 ring-black/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(f)} alt="" className="size-full object-cover" />
                  <button onClick={() => setFiles(files.filter((_, k) => k !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white" aria-label="hapus">
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {files.length < 10 && (
                <button onClick={() => input.current?.click()} className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border text-[11px] text-muted-foreground hover:bg-accent">
                  <ImagePlus className="size-5" /> {t.add}
                </button>
              )}
              <input
                ref={input}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                hidden
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
                  setFiles((x) => [...x, ...list].slice(0, 10));
                  e.target.value = "";
                }}
              />
            </div>
            <Button className="mt-3 rounded-full" disabled={!files.length || !!busy} onClick={analyze}>
              {busy === "analyze" ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy === "analyze" ? t.analyzing : t.analyze}
            </Button>
          </div>

          {styles.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t.myStyles}</p>
              <div className="grid gap-4 md:grid-cols-2">
                {styles.map((st) => {
                  const on = styleId === st.id;
                  return (
                    <div key={st.id} className={cn("rounded-xl border p-3", on && "border-primary ring-2 ring-primary/30")}>
                      <Previews q={`style=${st.id}&v=${encodeURIComponent(st.updated_at)}`} ws={workspaceId} />
                      <div className="mt-3 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{st.name}</p>
                          <p className="text-xs text-muted-foreground">{st.dna.description}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="size-8 shrink-0 text-muted-foreground" onClick={() => remove(st.id)} disabled={!!busy} aria-label={t.del}>
                          {busy === `del-${st.id}` ? <Loader2 className="animate-spin" /> : <Trash2 />}
                        </Button>
                      </div>
                      {st.analysis && (
                        <div className="mt-2 rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
                          <p className="mb-1 font-medium text-foreground">{t.learned}</p>
                          <p className="whitespace-pre-line">{st.analysis}</p>
                        </div>
                      )}
                      <div className="mt-2 flex gap-2">
                        <input
                          value={feedback[st.id] ?? ""}
                          onChange={(e) => setFeedback((x) => ({ ...x, [st.id]: e.target.value.slice(0, 500) }))}
                          placeholder={t.feedbackPh}
                          className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-xs"
                        />
                        <Button size="sm" variant="outline" disabled={!feedback[st.id]?.trim() || !!busy} onClick={() => adjust(st.id)}>
                          {busy === `adj-${st.id}` ? <Loader2 className="animate-spin" /> : <Wand2 />} {t.adjust}
                        </Button>
                      </div>
                      <Button size="sm" className="mt-2 w-full rounded-full" variant={on ? "outline" : "default"} disabled={on || !!busy} onClick={() => choose({ mode: "custom", styleId: st.id }, st.id)}>
                        {busy === st.id ? <Loader2 className="animate-spin" /> : <Check />} {on ? t.active : t.use}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
