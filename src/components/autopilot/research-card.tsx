"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Package, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BrandResearch } from "@/lib/autopilot/research-shape";

export interface ResearchRow {
  id: string;
  data: BrandResearch;
  images: { path: string | null; title: string; source: string; ig: boolean; product: boolean }[];
  created_at: string;
}

const T = {
  id: {
    title: "Riset brand otomatis",
    sub: "Marqthink menelusuri Google (web & gambar) dan Instagram brand kamu bila terhubung, lalu menentukan profil bisnis, produk, dan KV (warna, mood, gaya visual) yang langsung dipakai untuk desain.",
    run: "Riset brand sekarang",
    rerun: "Riset ulang",
    running: "Menelusuri web, gambar & Instagram…",
    done: "Riset selesai: Brand Kit kosong sudah diisi & gaya KV dipakai",
    err: "Riset gagal. Pastikan nama project = nama brand, isi akun IG/website di Brand Kit, lalu coba lagi.",
    noWs: "Pilih brand (project) dulu di Pengaturan.",
    business: "Bisnis",
    kv: "Key visual",
    subjects: "Visual khas brand",
    products: "Produk/layanan",
    images: "Gambar temuan",
    imagesHint: "Simpan gambar yang benar-benar milik brand kamu sebagai foto produk, supaya desain memakai produk asli.",
    saveProduct: "Jadikan foto produk",
    saved: "Disimpan ke Produk (SKU)",
    confidence: { high: "keyakinan tinggi", medium: "keyakinan sedang", low: "data tipis, cek & lengkapi Brand Kit" } as Record<string, string>,
    ig: "dari IG kamu",
  },
  en: {
    title: "Auto brand research",
    sub: "Marqthink searches Google (web & images) and your brand's Instagram when connected, then works out your business profile, products and KV (colours, mood, visual style) and uses them for design right away.",
    run: "Research brand now",
    rerun: "Research again",
    running: "Searching web, images & Instagram…",
    done: "Research done: empty Brand Kit fields filled & KV style applied",
    err: "Research failed. Make sure the project name is your brand name, add your IG/website to the Brand Kit, then retry.",
    noWs: "Choose a brand (project) in Settings first.",
    business: "Business",
    kv: "Key visual",
    subjects: "Signature visuals",
    products: "Products/services",
    images: "Images found",
    imagesHint: "Save images that are truly your brand's as product photos so designs show your real products.",
    saveProduct: "Use as product photo",
    saved: "Saved to Products (SKU)",
    confidence: { high: "high confidence", medium: "medium confidence", low: "thin data — check & complete your Brand Kit" },
    ig: "from your IG",
  },
};

export function ResearchCard({ lang, workspaceId, research }: { lang: "id" | "en"; workspaceId: string | null; research: ResearchRow | null }) {
  const t = T[lang];
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  async function run() {
    if (!workspaceId) return void toast.error(t.noWs);
    setBusy("run");
    const res = await fetch("/api/autopilot/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId }) });
    setBusy(null);
    if (!res.ok) return void toast.error(t.err);
    toast.success(t.done);
    router.refresh();
  }
  async function saveProduct(k: number) {
    if (!research) return;
    setBusy(`p${k}`);
    const name = research.data.business.products[0]?.name ?? research.data.business.category;
    const res = await fetch("/api/autopilot/research/product", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ researchId: research.id, index: k, name }) });
    setBusy(null);
    if (!res.ok) return void toast.error(t.err);
    setSaved((x) => new Set(x).add(k));
    toast.success(t.saved);
    router.refresh();
  }

  const r = research?.data;
  return (
    <section className="mt-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Search className="size-4 text-primary" /> {t.title}
          </h2>
          <p className="text-sm text-muted-foreground">{t.sub}</p>
        </div>
        <Button onClick={run} disabled={!!busy} className="rounded-full" variant={r ? "outline" : "default"}>
          {busy === "run" ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy === "run" ? t.running : r ? t.rerun : t.run}
        </Button>
      </div>

      {r && research && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t.business} · {r.business.category} · <span className={r.confidence === "low" ? "text-amber-600" : ""}>{t.confidence[r.confidence]}</span>
              </p>
              <p className="mt-0.5">{r.business.summary}</p>
            </div>
            {r.business.products.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t.products}</p>
                <p className="mt-0.5">{r.business.products.map((p) => p.name).join(" · ")}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t.kv}</p>
              <div className="mt-1 flex items-center gap-2">
                {[r.kv.primary, r.kv.secondary, r.kv.background].filter(Boolean).map((c) => (
                  <span key={c} className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                    <span className="size-3.5 rounded-full ring-1 ring-black/10" style={{ background: c }} /> {c}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.kv.mood} · {r.dna.name}
              </p>
            </div>
            {r.visual_subjects.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t.subjects}</p>
                <ul className="mt-0.5 list-disc pl-4 text-xs text-muted-foreground">
                  {r.visual_subjects.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {research.images.some((i) => i.path) && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t.images}</p>
              <p className="mb-2 text-[11px] text-muted-foreground">{t.imagesHint}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {research.images.map((im, k) =>
                  im.path ? (
                    <div key={k} className="group relative overflow-hidden rounded-lg ring-1 ring-black/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/autopilot/research/image/${research.id}/${k}`} alt={im.title} loading="lazy" className="aspect-square w-full object-cover" />
                      {(im.product || im.ig) && (
                        <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">{im.ig ? t.ig : <Package className="inline size-3" />}</span>
                      )}
                      <button
                        onClick={() => saveProduct(k)}
                        disabled={!!busy || saved.has(k)}
                        className="absolute inset-x-1 bottom-1 rounded-md bg-white/90 px-1 py-0.5 text-[10px] font-medium text-black shadow-sm"
                      >
                        {busy === `p${k}` ? <Loader2 className="mx-auto size-3 animate-spin" /> : saved.has(k) ? <Check className="mx-auto size-3" /> : t.saveProduct}
                      </button>
                    </div>
                  ) : null,
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
