"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Lock, Paperclip, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { UPLOAD_ERRORS, uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { emitChatsChanged } from "@/lib/events";
import {
  BIZ_MODEL_LABEL,
  BIZ_MODELS,
  KOL_TIER_LABEL,
  KOL_TIERS,
  PLATFORM_LABEL,
  PLATFORMS,
  SURVEY_LENGTH,
  SURVEY_TOPIC_LABEL,
  SURVEY_TOPICS,
  WA_GOAL_LABEL,
  WA_GOALS,
} from "@/lib/addons/schemas";
import { sampleSize } from "@/lib/addons/sample";
import { RequestAddonButton } from "./request-addon";
import type { AddonStatusLite } from "./common";

const STEPS: Record<string, string[]> = {
  listing: ["Mempelajari produkmu…", "Mencari kata kunci yang dicari pembeli…", "Menulis judul & deskripsi per platform…", "Menyusun file Excel…"],
  live: ["Menyusun alur live…", "Menulis skrip host per segmen…", "Menyiapkan jawaban keberatan pembeli…", "Membuat PPT contekan & Excel…"],
  whatsapp: ["Memahami bisnismu…", "Menulis template pesan…", "Menyusun tips anti-spam…", "Menyusun file Excel…"],
  ads: ["Membaca laporan iklan…", "Menghitung performa tiap kampanye…", "Mendiagnosis iklan boros & bagus…", "Menyusun usulan budget…", "Membuat PPT & Excel…"],
  competitor: ["Mencari data kompetitor di web…", "Membaca sumber-sumber…", "Membandingkan harga & positioning…", "Menyusun SWOT & celah konten…", "Membuat PPT & Excel…"],
  sizing: ["Mencari data pasar & laporan industri…", "Membaca sumber-sumber…", "Menghitung TAM, SAM & SOM…", "Menyusun proyeksi, tren & PESTEL…", "Membuat PPT & Excel…"],
  persona: ["Mencari riset perilaku konsumen…", "Membaca survei & ulasan pembeli…", "Menyusun segmen pasar…", "Menulis persona & customer journey…", "Membuat PPT & Excel…"],
  entry: ["Riset pemain & harga pasar…", "Mengecek izin & regulasi…", "Menilai kekuatan persaingan…", "Menghitung unit economics & risiko…", "Menyusun rencana 90 hari…", "Membuat PPT & Excel…"],
  survey: ["Merumuskan tujuan & hipotesis…", "Menyusun screener…", "Menulis pertanyaan per bagian…", "Menyusun rencana analisis…", "Membuat Excel kuesioner…"],
  kol: ["Menyusun konsep kampanye…", "Menulis brief kreator…", "Menghitung estimasi fee…", "Membuat PPT & Excel…"],
};

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Chips({ name, options, defaults }: { name: string; options: { value: string; label: string }[]; defaults: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input type="checkbox" name={name} value={o.value} defaultChecked={defaults.includes(o.value)} className="peer sr-only" />
          <span className="inline-flex rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

/** Kumpulkan isi form menjadi objek input tool. */
function collect(tool: string, form: HTMLFormElement, attachmentIds: string[]) {
  const fd = new FormData(form);
  const str = (k: string) => String(fd.get(k) ?? "").trim();
  const all = (k: string) => fd.getAll(k).map(String);
  switch (tool) {
    case "listing":
      return {
        product: str("product"),
        category: str("category"),
        price: str("price"),
        features: str("features"),
        audience: str("audience"),
        current_title: str("current_title"),
        platforms: all("platforms"),
      };
    case "live":
      return { products: str("products"), promo: str("promo"), duration: Number(str("duration")), host_style: str("host_style"), platform: str("platform") };
    case "whatsapp":
      return { business: str("business"), products: str("products"), goals: all("goals"), tone: str("tone"), promo: str("promo") };
    case "ads":
      return { platform: str("platform"), goal: str("goal"), target: str("target"), notes: str("notes"), attachment_ids: attachmentIds };
    case "competitor":
      return { brand: str("brand"), product: str("product"), market: str("market"), competitors: str("competitors"), focus: str("focus") };
    case "sizing":
      return { product: str("product"), business: str("business"), area: str("area"), target: str("target"), price: str("price"), model: str("model"), goal: str("goal") };
    case "persona":
      return { product: str("product"), brand: str("brand"), area: str("area"), price: str("price"), model: str("model"), known: str("known"), goal: str("goal") };
    case "entry":
      return { idea: str("idea"), brand: str("brand"), area: str("area"), model: str("model"), price: str("price"), budget: str("budget"), assets: str("assets") };
    case "survey":
      return {
        objective: str("objective"),
        product: str("product"),
        respondents: str("respondents"),
        topics: all("topics"),
        method: str("method"),
        length: str("length"),
        margin: Number(str("margin") || 5),
        population: Number(str("population").replace(/\D/g, "") || 0),
      };
    case "kol":
      return {
        brand: str("brand"),
        product: str("product"),
        objective: str("objective"),
        platform: str("platform"),
        tiers: all("tiers"),
        creators: Number(str("creators") || 1),
        budget: str("budget"),
        timeline: str("timeline"),
        key_message: str("key_message"),
        rules: str("rules"),
      };
  }
  return {};
}

const RESEARCH_TOOLS = new Set(["competitor", "sizing", "persona", "entry"]);

/** Form survei + pratinjau jumlah responden (dihitung langsung saat isian berubah). */
function SurveyFields() {
  const [margin, setMargin] = useState(5);
  const [population, setPopulation] = useState("");
  const sample = sampleSize(margin, Number(population.replace(/\D/g, "") || 0));
  return (
    <>
      <Field label="Apa yang ingin kamu ketahui? *" hint="Tulis tujuan riset / keputusan yang mau diambil.">
        <Textarea name="objective" required maxLength={800} rows={3} placeholder="mis. Apakah pelanggan mau beli varian kopi gula aren 1 liter di harga Rp60rb, dan lewat kanal apa mereka biasa beli" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Target responden *">
          <Input name="respondents" required maxLength={300} placeholder="mis. Pekerja 20-35 th di Jabodetabek, minum kopi ≥2×/minggu" />
        </Field>
        <Field label="Produk / brand (opsional)">
          <Input name="product" maxLength={200} placeholder="mis. Kopi Senja literan" />
        </Field>
      </div>
      <Field label="Topik yang ditanyakan *">
        <Chips name="topics" options={SURVEY_TOPICS.map((t) => ({ value: t, label: SURVEY_TOPIC_LABEL[t] }))} defaults={["kebiasaan", "harga"]} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cara sebar">
          <NativeSelect name="method" defaultValue="online">
            <option value="online">Online (Google Form, WA, IG)</option>
            <option value="tatap_muka">Tatap muka</option>
            <option value="telepon">Telepon</option>
          </NativeSelect>
        </Field>
        <Field label="Panjang survei">
          <NativeSelect name="length" defaultValue="sedang">
            {Object.entries(SURVEY_LENGTH).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Tingkat ketelitian">
          <NativeSelect name="margin" value={margin} onChange={(e) => setMargin(Number(e.target.value))}>
            <option value={3}>Sangat teliti (±3%)</option>
            <option value={5}>Standar riset (±5%)</option>
            <option value={10}>Cepat & hemat (±10%)</option>
          </NativeSelect>
        </Field>
        <Field label="Jumlah populasi target (opsional)" hint="mis. jumlah pelanggan kamu. Kosongkan bila sangat besar.">
          <Input name="population" inputMode="numeric" value={population} onChange={(e) => setPopulation(e.target.value)} placeholder="mis. 2000" />
        </Field>
      </div>
      <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        Kamu butuh minimal <b>{sample.n.toLocaleString("id-ID")} responden</b> — disarankan sebar ke{" "}
        <b>{sample.recommended.toLocaleString("id-ID")}</b> (cadangan 20% untuk jawaban tidak valid).
      </div>
    </>
  );
}

interface UploadedFile {
  id: string;
  name: string;
}

export function ToolRunner({ tool, status }: { tool: string; status: AddonStatusLite }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [buyOpen, setBuyOpen] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const steps = STEPS[tool] ?? ["Memproses…"];
  const canRun = Boolean(status.nextSource);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const t = setInterval(() => {
      const sec = Math.floor((Date.now() - started) / 1000);
      setElapsed(sec);
      setStep(Math.min(steps.length - 1, Math.floor(sec / 12)));
    }, 1000);
    return () => clearInterval(t);
  }, [busy, steps.length]);

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    for (const file of Array.from(list).slice(0, 5 - files.length)) {
      setUploading((n) => n + 1);
      try {
        const data = await uploadFile<{ id: string; name: string }>(file, { scope: "chat" });
        if ("error" in data) toast.error(`${file.name}: ${UPLOAD_ERRORS[data.error] ?? "Upload gagal."}`);
        else setFiles((f) => [...f, { id: data.id, name: data.name }]);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canRun) return setBuyOpen(true);
    if (tool === "ads" && !files.length) return toast.error("Upload dulu file laporan iklannya.");
    const input = collect(tool, e.currentTarget, files.map((f) => f.id));
    setBusy(true);
    setStep(0);
    setElapsed(0);
    try {
      const res = await fetch(`/api/tools/${tool}`, { method: "POST", body: JSON.stringify(input) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402) {
        setBuyOpen(true);
        return;
      }
      if (!res.ok) {
        toast.error(data.message ?? (res.status === 429 ? "Terlalu cepat, tunggu sebentar." : "Gagal memproses. Coba lagi."));
        return;
      }
      emitChatsChanged();
      router.push(`/tools/${tool}/${data.runId}`);
      router.refresh();
    } catch {
      toast.error("Koneksi terputus. Cek riwayat di bawah beberapa saat lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
        {tool === "listing" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama produk *">
                <Input name="product" required maxLength={120} placeholder="mis. Kopi Susu Gula Aren Literan 1L" />
              </Field>
              <Field label="Kategori">
                <Input name="category" maxLength={80} placeholder="mis. Minuman siap minum" />
              </Field>
              <Field label="Harga">
                <Input name="price" maxLength={40} placeholder="mis. Rp45.000" />
              </Field>
              <Field label="Target pembeli">
                <Input name="audience" maxLength={200} placeholder="mis. pekerja kantoran 22-35 th di Jabodetabek" />
              </Field>
            </div>
            <Field label="Keunggulan & spesifikasi *" hint="Bahan, ukuran, varian, manfaat, isi paket, garansi — makin lengkap makin bagus.">
              <Textarea name="features" required minLength={10} maxLength={2000} rows={5} placeholder="mis. Pakai gula aren asli, tanpa pengawet, tahan 5 hari di kulkas, varian: original & less sugar…" />
            </Field>
            <Field label="Judul produk sekarang (opsional)" hint="Isi bila ingin dibandingkan sebelum vs sesudah.">
              <Input name="current_title" maxLength={255} />
            </Field>
            <Field label="Platform *">
              <Chips name="platforms" options={PLATFORMS.map((p) => ({ value: p, label: PLATFORM_LABEL[p] }))} defaults={["shopee", "tiktok"]} />
            </Field>
          </>
        )}

        {tool === "live" && (
          <>
            <Field label="Produk yang dijual saat live *" hint="Tulis nama, harga, dan keunggulan tiap produk.">
              <Textarea name="products" required minLength={5} maxLength={2000} rows={5} placeholder="mis. 1) Serum Vit C 20ml Rp89rb — mencerahkan 14 hari…" />
            </Field>
            <Field label="Promo khusus live">
              <Input name="promo" maxLength={500} placeholder="mis. Diskon 30% + gratis ongkir, beli 2 gratis 1 jam 20.00" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Durasi">
                <NativeSelect name="duration" defaultValue="60">
                  {[30, 60, 90, 120].map((d) => (
                    <option key={d} value={d}>
                      {d} menit
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Gaya host">
                <NativeSelect name="host_style" defaultValue="energik">
                  <option value="energik">Energik</option>
                  <option value="santai">Santai</option>
                  <option value="edukatif">Edukatif</option>
                  <option value="lucu">Lucu</option>
                </NativeSelect>
              </Field>
              <Field label="Platform">
                <NativeSelect name="platform" defaultValue="tiktok">
                  <option value="tiktok">TikTok Live</option>
                  <option value="shopee">Shopee Live</option>
                  <option value="instagram">Instagram Live</option>
                </NativeSelect>
              </Field>
            </div>
          </>
        )}

        {tool === "whatsapp" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama bisnis *">
                <Input name="business" required maxLength={200} placeholder="mis. Toko Hijab Annisa" />
              </Field>
              <Field label="Nada bicara">
                <NativeSelect name="tone" defaultValue="ramah">
                  <option value="ramah">Ramah</option>
                  <option value="profesional">Profesional</option>
                  <option value="santai">Santai</option>
                  <option value="lucu">Lucu</option>
                </NativeSelect>
              </Field>
            </div>
            <Field label="Produk / layanan">
              <Textarea name="products" maxLength={1000} rows={3} placeholder="mis. Hijab voal motif, pashmina, ciput — harga 35-89rb" />
            </Field>
            <Field label="Promo yang sedang berjalan">
              <Input name="promo" maxLength={500} placeholder="mis. Payday sale 25-28: diskon 20% semua produk" />
            </Field>
            <Field label="Jenis pesan *">
              <Chips name="goals" options={WA_GOALS.map((g) => ({ value: g, label: WA_GOAL_LABEL[g] }))} defaults={["broadcast_promo", "follow_up", "abandoned_cart", "faq"]} />
            </Field>
          </>
        )}

        {tool === "ads" && (
          <>
            <Field label="File laporan iklan *" hint="Export dari Ads Manager (Excel/CSV) atau screenshot tabel laporan. Maks 5 file.">
              <div
                className="rounded-xl border border-dashed p-4 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void upload(e.dataTransfer.files);
                }}
              >
                <input ref={fileRef} type="file" hidden multiple accept=".csv,.xlsx,.pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => upload(e.target.files)} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={files.length >= 5}>
                  <Paperclip /> Pilih file
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">atau seret file ke sini · CSV, Excel, PDF, PNG/JPG</p>
                {(files.length > 0 || uploading > 0) && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {files.map((f) => (
                      <span key={f.id} className="inline-flex items-center gap-1.5 rounded-lg border bg-background py-1 pl-2 pr-1 text-xs">
                        <FileText className="size-3.5" /> <span className="max-w-40 truncate">{f.name}</span>
                        <button type="button" aria-label="Hapus" onClick={() => setFiles((x) => x.filter((y) => y.id !== f.id))}>
                          <X className="size-3.5" />
                        </button>
                      </span>
                    ))}
                    {uploading > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" /> Mengunggah…
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Platform iklan">
                <NativeSelect name="platform" defaultValue="meta">
                  <option value="meta">Meta (FB/IG)</option>
                  <option value="tiktok">TikTok Ads</option>
                  <option value="shopee">Shopee Ads</option>
                  <option value="google">Google Ads</option>
                  <option value="lainnya">Lainnya</option>
                </NativeSelect>
              </Field>
              <Field label="Tujuan iklan">
                <NativeSelect name="goal" defaultValue="penjualan">
                  <option value="penjualan">Penjualan</option>
                  <option value="leads">Leads / chat</option>
                  <option value="traffic">Traffic</option>
                  <option value="awareness">Awareness</option>
                </NativeSelect>
              </Field>
              <Field label="Target (opsional)">
                <Input name="target" maxLength={120} placeholder="mis. ROAS 3 / CPA Rp25rb" />
              </Field>
            </div>
            <Field label="Catatan (opsional)">
              <Textarea name="notes" maxLength={1000} rows={2} placeholder="mis. periode 1-30 Sept, produk utama skincare, budget harian Rp500rb" />
            </Field>
          </>
        )}

        {tool === "competitor" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Brand kamu *">
                <Input name="brand" required maxLength={100} placeholder="mis. Kopi Senja" />
              </Field>
              <Field label="Pasar / kota / segmen">
                <Input name="market" maxLength={120} placeholder="mis. Jakarta, kopi literan online" />
              </Field>
            </div>
            <Field label="Produk / kategori *">
              <Input name="product" required maxLength={300} placeholder="mis. Kopi susu literan siap minum" />
            </Field>
            <Field label="Kompetitor *" hint="Tulis 1-6 nama brand (boleh dengan link website/Instagram), pisahkan koma atau baris baru.">
              <Textarea name="competitors" required maxLength={600} rows={3} placeholder="mis. Kopi Kenangan, Fore Coffee, Tuku" />
            </Field>
            <Field label="Fokus riset (opsional)">
              <Input name="focus" maxLength={300} placeholder="mis. harga & promo, konten TikTok, strategi marketplace" />
            </Field>
          </>
        )}

        {(tool === "sizing" || tool === "persona") && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Produk / kategori *">
                <Input name="product" required maxLength={200} placeholder="mis. Kopi susu literan siap minum" />
              </Field>
              <Field label="Wilayah pasar" hint="Kosongkan = seluruh Indonesia">
                <Input name="area" maxLength={120} placeholder="mis. Jabodetabek, Surabaya, Indonesia" />
              </Field>
              {tool === "sizing" ? (
                <Field label="Bisnis kamu (opsional)">
                  <Input name="business" maxLength={300} placeholder="mis. Kopi Senja, jual online via Shopee & TikTok" />
                </Field>
              ) : (
                <Field label="Brand (opsional)">
                  <Input name="brand" maxLength={100} placeholder="mis. Kopi Senja" />
                </Field>
              )}
              <Field label="Harga rata-rata (opsional)">
                <Input name="price" maxLength={80} placeholder="mis. Rp45.000 / liter" />
              </Field>
              <Field label="Model bisnis">
                <NativeSelect name="model" defaultValue="b2c">
                  {BIZ_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {BIZ_MODEL_LABEL[m]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {tool === "sizing" && (
                <Field label="Target pembeli (opsional)">
                  <Input name="target" maxLength={300} placeholder="mis. pekerja kantoran 22-35 th" />
                </Field>
              )}
            </div>
            {tool === "persona" && (
              <Field label="Yang sudah kamu tahu tentang pelanggan (opsional)" hint="Makin banyak info, makin tajam persona-nya.">
                <Textarea name="known" maxLength={800} rows={3} placeholder="mis. kebanyakan pembeli perempuan, beli saat promo gajian, sering tanya soal kadar gula" />
              </Field>
            )}
            <Field label="Untuk keputusan apa riset ini? (opsional)">
              <Input name="goal" maxLength={300} placeholder={tool === "sizing" ? "mis. cari investor / buka cabang / tentukan target omzet" : "mis. bikin konten & iklan yang lebih kena"} />
            </Field>
          </>
        )}

        {tool === "entry" && (
          <>
            <Field label="Rencana bisnis / produk *" hint="Ceritakan produk, cara jualan, dan target pembelinya.">
              <Textarea name="idea" required maxLength={1200} rows={4} placeholder="mis. Mau jual frozen food dimsum premium untuk keluarga muda, dijual online di Shopee & reseller ibu-ibu" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Brand (opsional)">
                <Input name="brand" maxLength={100} />
              </Field>
              <Field label="Wilayah pasar" hint="Kosongkan = seluruh Indonesia">
                <Input name="area" maxLength={120} placeholder="mis. Bandung" />
              </Field>
              <Field label="Model bisnis">
                <NativeSelect name="model" defaultValue="b2c">
                  {BIZ_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {BIZ_MODEL_LABEL[m]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Rencana harga (opsional)">
                <Input name="price" maxLength={80} placeholder="mis. Rp55.000 / pack" />
              </Field>
              <Field label="Modal yang tersedia (opsional)">
                <Input name="budget" maxLength={80} placeholder="mis. Rp30 juta" />
              </Field>
            </div>
            <Field label="Kekuatan / aset yang kamu punya (opsional)">
              <Textarea name="assets" maxLength={600} rows={2} placeholder="mis. punya dapur sendiri, 5rb followers IG, jaringan reseller" />
            </Field>
          </>
        )}

        {tool === "survey" && <SurveyFields />}

        {tool === "kol" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Brand *">
                <Input name="brand" required maxLength={100} />
              </Field>
              <Field label="Produk *">
                <Input name="product" required maxLength={300} />
              </Field>
              <Field label="Tujuan kampanye">
                <NativeSelect name="objective" defaultValue="penjualan">
                  <option value="awareness">Awareness</option>
                  <option value="penjualan">Penjualan / affiliate</option>
                  <option value="launching">Launching produk</option>
                  <option value="review">Review produk</option>
                </NativeSelect>
              </Field>
              <Field label="Platform">
                <NativeSelect name="platform" defaultValue="tiktok">
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="campuran">Campuran</option>
                </NativeSelect>
              </Field>
              <Field label="Jumlah kreator">
                <Input name="creators" type="number" min={1} max={50} defaultValue={5} />
              </Field>
              <Field label="Budget (opsional)">
                <Input name="budget" maxLength={60} placeholder="mis. Rp10 juta" />
              </Field>
            </div>
            <Field label="Tier kreator *">
              <Chips name="tiers" options={KOL_TIERS.map((t) => ({ value: t, label: KOL_TIER_LABEL[t] }))} defaults={["nano", "micro"]} />
            </Field>
            <Field label="Timeline (opsional)">
              <Input name="timeline" maxLength={120} placeholder="mis. tayang 1-14 Desember" />
            </Field>
            <Field label="Pesan utama (opsional)">
              <Textarea name="key_message" maxLength={500} rows={2} />
            </Field>
            <Field label="Aturan khusus (opsional)">
              <Textarea name="rules" maxLength={800} rows={2} placeholder="mis. wajib tag @brand, tidak boleh menyebut kompetitor" />
            </Field>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {status.nextSource === "trial"
              ? "Ini percobaan gratis kamu (1×)."
              : status.nextSource === "promax"
                ? `Memakai jatah gratis Promax (sisa ${status.promaxRemaining}).`
                : status.nextSource === "paid"
                  ? `Sisa kuota add-on bulan ini: ${status.paidRemaining}.`
                  : status.nextSource === "admin"
                    ? "Mode admin (tanpa batas)."
                    : "Kuota habis — beli add-on untuk lanjut."}{" "}
            Kuota hanya terpotong bila hasil berhasil dibuat.
          </p>
          <Button type="submit" disabled={busy || uploading > 0}>
            {canRun ? <Sparkles /> : <Lock />} {canRun ? "Buat sekarang" : "Beli add-on untuk memakai"}
          </Button>
        </div>
      </form>

      {busy && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl bg-background/90 p-6 text-center backdrop-blur-sm">
          <Loader2 className="size-8 animate-spin text-primary" />
          <div>
            <p className="font-medium">{steps[step]}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {elapsed}s · biasanya 30–{RESEARCH_TOOLS.has(tool) ? "150" : "60"} detik. Jangan tutup halaman ini.
            </p>
          </div>
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <span key={i} className={cn("h-1.5 w-8 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
        </div>
      )}

      <RequestAddonButton
        addon={status.id}
        name={status.name}
        price={status.price}
        quota={status.quota}
        open={buyOpen}
        onOpenChange={setBuyOpen}
      />
    </div>
  );
}
