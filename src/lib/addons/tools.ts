import "server-only";
import type { FilePart, ImagePart } from "ai";
import type { z } from "zod";
import { untrusted } from "@/lib/ai/prompt";
import type { AddonId } from "./catalog";
import {
  KOL_TIER_LABEL,
  PLATFORM_LABEL,
  TITLE_LIMIT,
  WA_GOAL_LABEL,
  adsInput,
  adsOutput,
  competitorInput,
  competitorOutput,
  kolInput,
  kolOutput,
  listingInput,
  listingOutput,
  liveInput,
  liveOutput,
  whatsappInput,
  whatsappOutput,
  type CompetitorOutput,
} from "./schemas";
import { BASE, fmt, padSteps, shortRp, webResearch } from "./helpers";
import { RESEARCH_RUNNERS } from "./research";
import { PRO_RUNNERS } from "./pro";
import { aiObject, clip, fileSlug, makeDeck, makeWorkbook, withNotes, storeMaybe, storeToolFile, type ToolCtx, type ToolFile } from "./runtime";

export interface ToolResult {
  title: string;
  output: unknown;
  files: ToolFile[];
}

export interface Runner<I extends z.ZodTypeAny> {
  addon: AddonId;
  input: I;
  run: (ctx: ToolCtx, input: z.infer<I>) => Promise<ToolResult>;
}

// ============================================================ Optimasi Listing Marketplace

const listing: Runner<typeof listingInput> = {
  addon: "jualan_kit",
  input: listingInput,
  async run(ctx, input) {
    const out = await aiObject(ctx, {
      schema: listingOutput,
      system: `${BASE}
Kamu spesialis SEO & copywriting marketplace (Shopee, TikTok Shop, Tokopedia).
Aturan:
- Buat listing HANYA untuk platform yang diminta, masing-masing dengan gaya platform itu (Shopee: kata kunci padat; Tokopedia: ringkas ≤ ${TITLE_LIMIT.tokopedia} karakter; TikTok Shop: lebih santai + hashtag 3-6).
- Judul: kata kunci utama di depan, lalu varian/ukuran/manfaat; panjang disarankan Shopee ≤ ${TITLE_LIMIT.shopee}, TikTok Shop ≤ ${TITLE_LIMIT.tiktok}, Tokopedia ≤ ${TITLE_LIMIT.tokopedia} karakter. Tanpa huruf kapital semua, tanpa emoji di judul.
- Deskripsi 150-300 kata, terstruktur dengan baris baru: hook 1 kalimat → manfaat utama (poin) → spesifikasi → cara pakai/isi paket → garansi/pengiriman → ajakan beli. Boleh emoji secukupnya sebagai bullet.
- Kata kunci 10-15: campuran utama, turunan, long-tail yang benar-benar dicari pembeli Indonesia; prioritas 5 = paling penting.
- highlights 3-5 poin singkat. hashtags kosong untuk Shopee/Tokopedia.
- before_after: isi hanya jika ada judul lama; jika tidak, null.
- photo_tips 3-5 (foto utama, angle, infografis), price_tips 1-3 (strategi harga/voucher/bundling).`,
      prompt: untrusted(
        "produk",
        [
          `Produk: ${input.product}`,
          input.category && `Kategori: ${input.category}`,
          input.price && `Harga: ${input.price}`,
          `Keunggulan/spesifikasi: ${input.features}`,
          input.audience && `Target pembeli: ${input.audience}`,
          input.current_title && `Judul lama: ${input.current_title}`,
          `Platform: ${input.platforms.map((p) => PLATFORM_LABEL[p]).join(", ")}`,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    });
    out.listings = out.listings.filter((l) => input.platforms.includes(l.platform));
    if (!input.current_title) out.before_after = null;

    const xlsx = await makeWorkbook(withNotes(ctx, [
      {
        name: "Kata kunci",
        title: `Kata kunci: ${input.product}`,
        columns: [
          { header: "Kata kunci", key: "keyword", width: 34 },
          { header: "Jenis", key: "type", width: 14 },
          { header: "Prioritas (1-5)", key: "priority", width: 14 },
          { header: "Dipakai di", key: "where", width: 28 },
        ],
        rows: out.keywords,
      },
      ...out.listings.map((l) => ({
        name: PLATFORM_LABEL[l.platform],
        title: `Listing ${PLATFORM_LABEL[l.platform]}: ${input.product}`,
        columns: [
          { header: "Bagian", key: "k", width: 18 },
          { header: "Isi", key: "v", width: 100 },
        ],
        rows: [
          { k: "Judul", v: l.title },
          { k: "Panjang judul", v: `${l.title.length} karakter (disarankan ≤ ${TITLE_LIMIT[l.platform]})` },
          { k: "Deskripsi", v: l.description },
          { k: "Keunggulan", v: l.highlights.map((h) => `• ${h}`).join("\n") },
          { k: "Hashtag", v: l.hashtags.join(" ") },
        ],
      })),
    ]));
    const file = await storeToolFile(ctx, `listing-${fileSlug(input.product)}.xlsx`, "xlsx", xlsx, "Excel listing & kata kunci");
    return { title: input.product, output: out, files: [file] };
  },
};

// ============================================================ Skrip Live Selling

const live: Runner<typeof liveInput> = {
  addon: "jualan_kit",
  input: liveInput,
  async run(ctx, input) {
    const out = await aiObject(ctx, {
      schema: liveOutput,
      system: `${BASE}
Kamu pelatih host live selling ${input.platform === "tiktok" ? "TikTok Live" : input.platform === "shopee" ? "Shopee Live" : "Instagram Live"} yang berpengalaman.
Buat rundown live ${input.duration} menit dengan gaya host ${input.host_style}.
Aturan:
- segments berurutan tanpa celah dari menit 0 sampai ${input.duration} (6-12 segmen), tiap segmen punya nama, tujuan, skrip ucapan host (kalimat lisan, santai, bisa langsung dibaca), 1-3 aksi, dan CTA.
- Pola yang terbukti: hook & sapa → perkenalan produk → demo/bukti → promo/flash sale → jawab komentar → ulang CTA → closing. Ulangi CTA "klik keranjang kuning / checkout sekarang" secara berkala.
- flash_sales 2-4 kali tersebar, sesuai promo user (jangan mengarang diskon bila user tidak menyebut promo; pakai "harga spesial live" umum).
- objections 5-8: keberatan pembeli yang umum (mahal, ori/tidak, ongkir, ukuran, lama kirim) + jawaban host.
- opening_hooks 3-5 kalimat 3 detik pertama. closing_lines 2-3. tips 3-5 (pencahayaan, pin komentar, interaksi).`,
      prompt: untrusted(
        "live",
        [`Produk: ${input.products}`, input.promo && `Promo: ${input.promo}`, `Durasi: ${input.duration} menit`, `Gaya host: ${input.host_style}`]
          .filter(Boolean)
          .join("\n"),
      ),
      maxOutputTokens: 12000,
    });
    out.segments.sort((a, b) => a.start_min - b.start_min);

    const sentences = (txt: string) =>
      txt
        .split(/(?<=[.!?])\s+|\n+/)
        .map((x) => x.trim())
        .filter(Boolean);
    const segSlides = out.segments.slice(0, 13).map((sg) => ({
      layout: "bullets" as const,
      kicker: clip(`MENIT ${sg.start_min}-${sg.end_min}`, 40),
      title: clip(sg.name, 90),
      subtitle: clip(sg.goal, 160),
      bullets: [...sentences(sg.script).slice(0, 4), `CTA: ${sg.cta}`].map((b) => clip(b, 140)).slice(0, 6),
      notes: clip(`${sg.script}\n\nAksi: ${sg.actions.join("; ")}`, 1500),
    }));
    const pptx = await makeDeck({
      title: clip(out.title || "Skrip Live Selling", 90),
      subtitle: clip(`Contekan host · ${input.duration} menit`, 160),
      theme: "midnight",
      cover_style: "split",
      slides: [
        { layout: "bullets", kicker: "BUKA LIVE", title: "Hook 3 detik pertama", bullets: out.opening_hooks.slice(0, 5).map((h) => clip(h, 140)) },
        ...segSlides,
        {
          layout: "cards",
          kicker: "JAWAB KOMENTAR",
          title: "Keberatan pembeli & jawabannya",
          cards: out.objections.slice(0, 6).map((o) => ({ icon: "message-circle", title: clip(o.objection, 40), text: clip(o.answer, 160) })),
        },
        { layout: "closing", title: "Closing", bullets: out.closing_lines.slice(0, 4).map((c) => clip(c, 140)) },
      ].slice(0, 20),
    });
    const xlsx = await makeWorkbook(withNotes(ctx, [
      {
        name: "Rundown",
        title: out.title,
        columns: [
          { header: "Mulai (menit)", key: "start_min", width: 12 },
          { header: "Selesai", key: "end_min", width: 10 },
          { header: "Segmen", key: "name", width: 24 },
          { header: "Tujuan", key: "goal", width: 30 },
          { header: "Skrip host", key: "script", width: 70 },
          { header: "Aksi", key: "actions", width: 30 },
          { header: "CTA", key: "cta", width: 30 },
        ],
        rows: out.segments.map((sg) => ({ ...sg, actions: sg.actions.join("\n") })),
      },
      {
        name: "Flash sale",
        columns: [
          { header: "Menit", key: "at_min", width: 10 },
          { header: "Penawaran", key: "offer", width: 40 },
          { header: "Skrip", key: "script", width: 70 },
        ],
        rows: out.flash_sales,
      },
      {
        name: "Keberatan",
        columns: [
          { header: "Pembeli bilang", key: "objection", width: 40 },
          { header: "Jawaban host", key: "answer", width: 80 },
        ],
        rows: out.objections,
      },
    ]));
    const files = (await Promise.all([
      storeMaybe(ctx, `skrip-live-${fileSlug(out.title)}.pptx`, "pptx", pptx, "PPT contekan host"),
      storeToolFile(ctx, `rundown-live-${fileSlug(out.title)}.xlsx`, "xlsx", xlsx, "Excel rundown"),
    ])).filter((f): f is ToolFile => Boolean(f));
    return { title: out.title || "Skrip Live Selling", output: out, files };
  },
};

// ============================================================ Template WhatsApp

const whatsapp: Runner<typeof whatsappInput> = {
  addon: "crm_pro",
  input: whatsappInput,
  async run(ctx, input) {
    const out = await aiObject(ctx, {
      schema: whatsappOutput,
      system: `${BASE}
Kamu ahli WhatsApp marketing & customer service toko online Indonesia.
Aturan:
- Buat 2 variasi pesan untuk setiap jenis pesan yang diminta (category harus salah satu yang diminta).
- Pesan pendek & personal (maks ± 6 baris), nada ${input.tone}, pakai variabel {nama}, {produk}, {link} bila relevan, format WhatsApp (*tebal*), emoji secukupnya.
- Selalu ada ajakan jelas di akhir. Untuk broadcast sertakan opsi berhenti ("balas STOP").
- when: kapan waktu terbaik mengirim. tip: cara memakai pesan itu.
- broadcast_tips 3-5: agar nomor tidak diblokir/dianggap spam.`,
      prompt: untrusted(
        "bisnis",
        [
          `Bisnis: ${input.business}`,
          input.products && `Produk: ${input.products}`,
          input.promo && `Promo: ${input.promo}`,
          `Jenis pesan: ${input.goals.map((g) => WA_GOAL_LABEL[g]).join(", ")}`,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    });
    out.messages = out.messages.filter((m) => input.goals.includes(m.category));
    const xlsx = await makeWorkbook(withNotes(ctx, [
      {
        name: "Template WA",
        title: `Template WhatsApp: ${input.business}`,
        columns: [
          { header: "Jenis", key: "cat", width: 24 },
          { header: "Judul", key: "title", width: 26 },
          { header: "Pesan", key: "text", width: 70 },
          { header: "Kapan dikirim", key: "when", width: 30 },
          { header: "Tips", key: "tip", width: 40 },
        ],
        rows: out.messages.map((m) => ({ ...m, cat: WA_GOAL_LABEL[m.category] })),
      },
    ]));
    const file = await storeToolFile(ctx, `template-wa-${fileSlug(input.business)}.xlsx`, "xlsx", xlsx, "Excel template WhatsApp");
    return { title: `Template WA: ${input.business}`, output: out, files: [file] };
  },
};

// ============================================================ Analis Laporan Iklan

const PLATFORM_ADS: Record<string, string> = { meta: "Meta Ads (Facebook/Instagram)", tiktok: "TikTok Ads", shopee: "Shopee Ads", google: "Google Ads", lainnya: "platform iklan" };

const ads: Runner<typeof adsInput> = {
  addon: "dokter_iklan",
  input: adsInput,
  async run(ctx, input) {
    const { data: rows } = await ctx.admin
      .from("attachments")
      .select("id, name, mime, storage_path, extracted_text")
      .eq("user_id", ctx.userId)
      .in("id", input.attachment_ids);
    if (!rows?.length) throw new Error("FILE_NOT_FOUND");

    const parts: (ImagePart | FilePart)[] = [];
    let textData = "";
    let hasImage = false;
    let readable = false;
    for (const r of rows) {
      const text = String(r.extracted_text ?? "");
      const scannedPdf = r.mime === "application/pdf" && text.replace(/\s+/g, "").length < 80;
      if (scannedPdf) {
        // PDF hasil scan/gambar (mis. laporan "compressed"): kirim utuh agar AI membacanya secara visual.
        const { data } = await ctx.admin.storage.from("uploads").download(r.storage_path as string);
        if (!data) continue;
        hasImage = true;
        readable = true;
        parts.push({ type: "file", data: new Uint8Array(await data.arrayBuffer()), mediaType: "application/pdf", filename: r.name as string });
        textData += `\n[PDF laporan (dibaca visual): ${r.name}]`;
      } else if (String(r.mime).startsWith("image/")) {
        const { data } = await ctx.admin.storage.from("uploads").download(r.storage_path as string);
        if (!data) continue;
        hasImage = true;
        readable = true;
        parts.push({ type: "image", image: new Uint8Array(await data.arrayBuffer()), mediaType: r.mime as string });
        textData += `\n[Screenshot: ${r.name}]`;
      } else if (text.trim()) {
        readable = true;
        textData += `\n\n=== File: ${r.name} ===\n${text.slice(0, 45_000)}`;
      } else {
        textData += `\n[File ${r.name} tidak bisa dibaca isinya]`;
      }
    }

    if (!readable) throw new Error("FILE_UNREADABLE");

    const out = await aiObject(ctx, {
      schema: adsOutput,
      vision: hasImage,
      maxOutputTokens: 12000,
      system: `${BASE}
Kamu performance marketer senior yang mengaudit laporan ${PLATFORM_ADS[input.platform]}.
Aturan:
- Baca data laporan (tabel/CSV/screenshot/PDF). Gunakan angka asli dari data; jangan mengarang kampanye atau angka. Bila kolom tidak ada, isi null dan jelaskan di data_notes. Masukkan SEMUA kampanye/ad set yang ada di laporan.
- Mata uang Rupiah (angka penuh, tanpa titik/koma ribuan). CTR dalam persen (mis. 1.8). ROAS = pendapatan/biaya.
- Tujuan iklan: ${input.goal}. ${input.target ? `Target user: ${input.target}.` : "Bila tidak ada target, bandingkan dengan rata-rata akun."}
- status per kampanye/ad set: "bagus" (efisien, layak dinaikkan), "perhatian" (bisa diperbaiki), "boros" (biaya tinggi hasil rendah → matikan/ubah).
- diagnosis & action spesifik (kreatif, audiens, bidding, landing page, jam tayang). Maks 25 baris kampanye (gabungkan yang kecil).
- budget_plan: pembagian budget sekarang vs rekomendasi (persen, total ± 100).
- score 0-100 dan verdict. next_steps 3-6 urut dari dampak tertinggi. wins 1-4, problems 1-5. headline 1 kalimat untuk pemilik bisnis.`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${untrusted("laporan-iklan", textData || "(lihat screenshot)")}${input.notes ? `\n\nCatatan user: ${untrusted("catatan", input.notes)}` : ""}`,
            },
            ...parts,
          ],
        },
      ],
    });

    const topSpend = [...out.campaigns].sort((a, b) => b.spend - a.spend);
    const kpi = (label: string, value: string, note?: string) => ({ value: clip(value, 12), label: clip(label, 60), note: note ? clip(note, 80) : undefined });
    const stats = [
      kpi("Skor kesehatan akun", `${out.score}/100`, out.verdict === "sehat" ? "Sehat" : out.verdict === "kritis" ? "Kritis" : "Perlu perhatian"),
      kpi("Total biaya iklan", shortRp(out.totals.spend)),
      out.totals.roas !== null ? kpi("ROAS", `${fmt(out.totals.roas, 2)}x`) : kpi(`Biaya per ${out.result_label}`, shortRp(out.totals.cpa)),
      kpi(`Total ${out.result_label}`, fmt(out.totals.results, 0)),
    ];
    const pptx = await makeDeck({
      title: clip(`Rapor ${PLATFORM_ADS[input.platform]}`, 90),
      subtitle: clip(out.headline, 160),
      theme: "corporate",
      cover_style: "split",
      slides: [
        { layout: "stats", kicker: "RINGKASAN", title: "Kondisi akun iklan", stats, bullets: [clip(out.headline, 140)] },
        {
          layout: "chart",
          kicker: "BIAYA",
          title: "Biaya per kampanye",
          subtitle: clip(`Kampanye dengan biaya terbesar · ${out.result_label}`, 160),
          chart: {
            type: "bar",
            labels: topSpend.slice(0, 8).map((c) => clip(c.name, 30)),
            series: [{ name: "Biaya (ribu Rp)", values: topSpend.slice(0, 8).map((c) => Math.round(c.spend / 1000)) }],
            unit: "rb",
          },
          bullets: out.problems.slice(0, 3).map((p) => clip(p, 140)),
        },
        {
          layout: "table",
          kicker: "RAPOR",
          title: "Rapor per kampanye",
          table: {
            headers: ["Kampanye", "Biaya", out.result_label.slice(0, 30) || "Hasil", out.totals.roas !== null ? "ROAS" : "Biaya/hasil", "Status"],
            rows: topSpend.slice(0, 7).map((c) => [
              clip(c.name, 60),
              shortRp(c.spend),
              fmt(c.results, 0),
              out.totals.roas !== null ? (c.roas !== null ? `${fmt(c.roas, 2)}x` : "-") : shortRp(c.cpa),
              c.status === "bagus" ? "Bagus" : c.status === "boros" ? "Boros" : "Perhatian",
            ]),
          },
        },
        {
          layout: "comparison",
          kicker: "DIAGNOSIS",
          title: "Masalah vs yang sudah bagus",
          columns: [
            { heading: "Masalah utama", bullets: out.problems.slice(0, 5).map((p) => clip(p, 110)) },
            { heading: "Yang sudah bagus", bullets: out.wins.slice(0, 5).map((p) => clip(p, 110)) },
          ],
        },
        {
          layout: "chart",
          kicker: "BUDGET",
          title: "Usulan pembagian budget",
          chart: {
            type: "doughnut",
            labels: out.budget_plan.slice(0, 8).map((b) => clip(b.name, 30)),
            series: [{ name: "Rekomendasi (%)", values: out.budget_plan.slice(0, 8).map((b) => Math.round(b.recommended_share)) }],
            unit: "%",
          },
          bullets: out.budget_plan.slice(0, 3).map((b) => clip(`${b.name}: ${Math.round(b.current_share)}% → ${Math.round(b.recommended_share)}%`, 140)),
        },
        {
          layout: "timeline",
          kicker: "AKSI",
          title: "Langkah perbaikan",
          steps: padSteps(out.next_steps.map((s, i) => ({ title: clip(`${i + 1}. Dampak ${s.impact}`, 40), text: clip(s.step, 120) }))),
        },
        { layout: "closing", title: "Catatan data", bullets: [clip(out.data_notes, 140), "Dianalisis dengan Markethink · Dokter Iklan"] },
      ],
    });
    const colors: Record<string, string> = { bagus: "DCFCE7", perhatian: "FEF3C7", boros: "FEE2E2" };
    const xlsx = await makeWorkbook(withNotes(ctx, [
      {
        name: "Rapor kampanye",
        title: `Rapor ${PLATFORM_ADS[input.platform]}, skor ${out.score}/100`,
        columns: [
          { header: "Kampanye", key: "name", width: 34 },
          { header: "Biaya", key: "spend", width: 16, money: true },
          { header: out.result_label || "Hasil", key: "results", width: 12 },
          { header: "Pendapatan", key: "revenue", width: 16, money: true },
          { header: "Biaya/hasil", key: "cpa", width: 14, money: true },
          { header: "ROAS", key: "roas", width: 10 },
          { header: "CTR %", key: "ctr", width: 10 },
          { header: "Status", key: "status", width: 12 },
          { header: "Diagnosis", key: "diagnosis", width: 50 },
          { header: "Tindakan", key: "action", width: 44 },
        ],
        rows: out.campaigns,
        rowColor: (r) => colors[String(r.status)] ?? null,
      },
      {
        name: "Budget",
        columns: [
          { header: "Kampanye", key: "name", width: 34 },
          { header: "Sekarang (%)", key: "current_share", width: 14 },
          { header: "Rekomendasi (%)", key: "recommended_share", width: 16 },
          { header: "Alasan", key: "reason", width: 60 },
        ],
        rows: out.budget_plan,
      },
      {
        name: "Langkah",
        columns: [
          { header: "Langkah", key: "step", width: 80 },
          { header: "Dampak", key: "impact", width: 12 },
        ],
        rows: out.next_steps,
      },
    ]));
    const files = (await Promise.all([
      storeMaybe(ctx, `rapor-iklan-${input.platform}.pptx`, "pptx", pptx, "PPT laporan"),
      storeToolFile(ctx, `rapor-iklan-${input.platform}.xlsx`, "xlsx", xlsx, "Excel bertanda warna"),
    ])).filter((f): f is ToolFile => Boolean(f));
    return { title: `Rapor ${PLATFORM_ADS[input.platform]}`, output: out, files };
  },
};

// ============================================================ Riset Kompetitor

const competitor: Runner<typeof competitorInput> = {
  addon: "riset_pro",
  input: competitorInput,
  async run(ctx, input) {
    // 1) Riset web (pencarian otomatis Claude). Bila pencarian tidak tersedia, router menjawab tanpa web.
    const research = await webResearch(ctx, {
      system: `${BASE}
Kamu analis riset pasar. Cari informasi TERKINI di web tentang tiap kompetitor: produk & kisaran harga, positioning/klaim utama,
target pasar, kanal penjualan (marketplace, toko, website, sosmed), gaya konten media sosial, ulasan/keluhan pelanggan, promo yang sering dipakai.
Tulis catatan riset faktual per kompetitor (poin-poin) beserta URL sumbernya. Bila info tidak ditemukan, tulis "tidak ditemukan" — jangan mengarang.`,
      prompt: untrusted(
        "riset",
        [
          `Brand user: ${input.brand}`,
          `Produk/kategori: ${input.product}`,
          input.market && `Pasar/kota/segmen: ${input.market}`,
          `Kompetitor: ${input.competitors}`,
          input.focus && `Fokus riset: ${input.focus}`,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    });
    const { sources, webNote } = research;

    // 2) Susun jadi laporan terstruktur.
    const out: CompetitorOutput = await aiObject(ctx, {
      schema: competitorOutput,
      system: `${BASE}
Susun laporan riset kompetitor dari catatan riset. Aturan:
- competitors: satu entri per kompetitor yang disebut user (maks 6). price_score 1 (murah) – 10 (premium); quality_score 1-10 = persepsi kualitas/kekuatan brand.
- our_position: posisi brand user (${input.brand}) di skala yang sama + catatan singkat.
- swot untuk brand user dibanding kompetitor (2-4 poin tiap kuadran).
- content_gaps 3-5: celah konten yang belum digarap kompetitor + ide konten konkret + format (Reels, TikTok, carousel, live, dsb).
- recommendations 3-5 langkah strategi berprioritas.
- summary 2-3 kalimat. ${webNote}`,
      prompt: `Brand user: ${input.brand}\nProduk: ${input.product}\n${input.market ? `Pasar: ${input.market}\n` : ""}\nCatatan riset:\n${untrusted("catatan-riset", research.text.slice(0, 30_000))}`,
    });
    out.sources = sources;
    if (webNote) out.summary = `${out.summary} ${webNote}`.trim();

    const comps = out.competitors.slice(0, 6);
    const pptx = await makeDeck({
      title: clip(`Riset Kompetitor ${input.brand}`, 90),
      subtitle: clip(input.product, 160),
      theme: "ocean",
      cover_style: "split",
      slides: [
        { layout: "quote", kicker: "RINGKASAN", title: "Inti temuan", quote: clip(out.summary, 240) },
        {
          layout: "table",
          kicker: "PERBANDINGAN",
          title: "Peta kompetitor",
          table: {
            headers: ["Brand", "Harga", "Positioning", "Kanal"],
            rows: [
              ...comps.map((c) => [clip(c.name, 60), clip(c.price_range, 60), clip(c.positioning, 60), clip(c.channels.join(", "), 60)]),
              [clip(`${input.brand} (kamu)`, 60), "-", clip(out.our_position.note, 60), "-"],
            ].slice(0, 7),
          },
        },
        {
          layout: "chart",
          kicker: "POSISI",
          title: "Harga vs kekuatan brand",
          subtitle: "Skor 1-10 · semakin tinggi semakin premium / kuat",
          chart: {
            type: "bar",
            labels: [...comps.map((c) => clip(c.name, 30)), clip(input.brand, 30)],
            series: [
              { name: "Harga", values: [...comps.map((c) => c.price_score), out.our_position.price_score] },
              { name: "Kualitas/brand", values: [...comps.map((c) => c.quality_score), out.our_position.quality_score] },
            ],
          },
        },
        ...comps.slice(0, 4).map((c) => ({
          layout: "comparison" as const,
          kicker: "PROFIL KOMPETITOR",
          title: clip(c.name, 90),
          subtitle: clip(`${c.positioning} · ${c.price_range}`, 160),
          columns: [
            { heading: "Kelemahan (peluang kita)", bullets: c.weaknesses.slice(0, 4).map((w) => clip(w, 110)) },
            { heading: "Kekuatan", bullets: c.strengths.slice(0, 4).map((w) => clip(w, 110)) },
          ],
        })),
        {
          layout: "cards",
          kicker: "SWOT",
          title: `SWOT ${clip(input.brand, 40)}`,
          cards: [
            { icon: "trophy", title: "Kekuatan", text: clip(out.swot.strengths.join(" · "), 160) },
            { icon: "flag", title: "Kelemahan", text: clip(out.swot.weaknesses.join(" · "), 160) },
            { icon: "rocket", title: "Peluang", text: clip(out.swot.opportunities.join(" · "), 160) },
            { icon: "shield", title: "Ancaman", text: clip(out.swot.threats.join(" · "), 160) },
          ],
        },
        {
          layout: "cards",
          kicker: "CELAH KONTEN",
          title: "Konten yang belum digarap kompetitor",
          cards: out.content_gaps.slice(0, 6).map((g) => ({ icon: "lightbulb", title: clip(`${g.format}: ${g.gap}`, 40), text: clip(g.idea, 160) })),
        },
        {
          layout: "timeline",
          kicker: "STRATEGI",
          title: "Rekomendasi langkah",
          steps: padSteps(out.recommendations.map((r) => ({ title: clip(r.title, 40), text: clip(r.detail, 120) }))),
        },
        {
          layout: "closing",
          title: "Sumber riset",
          bullets: (sources.length ? sources.slice(0, 5).map((s) => clip(s.title, 140)) : ["Pengetahuan umum AI (tanpa sumber web)"]),
        },
      ].slice(0, 20),
    });
    const xlsx = await makeWorkbook(withNotes(ctx, [
      {
        name: "Kompetitor",
        title: `Riset kompetitor: ${input.brand}`,
        columns: [
          { header: "Brand", key: "name", width: 22 },
          { header: "Harga", key: "price_range", width: 20 },
          { header: "Positioning", key: "positioning", width: 40 },
          { header: "Target", key: "target", width: 30 },
          { header: "Kekuatan", key: "strengths", width: 44 },
          { header: "Kelemahan", key: "weaknesses", width: 44 },
          { header: "Kanal", key: "channels", width: 26 },
          { header: "Gaya konten", key: "content_style", width: 36 },
          { header: "Skor harga", key: "price_score", width: 10 },
          { header: "Skor brand", key: "quality_score", width: 10 },
        ],
        rows: comps.map((c) => ({ ...c, strengths: c.strengths.join("\n"), weaknesses: c.weaknesses.join("\n"), channels: c.channels.join(", ") })),
      },
      {
        name: "Celah & strategi",
        columns: [
          { header: "Jenis", key: "kind", width: 16 },
          { header: "Judul", key: "title", width: 40 },
          { header: "Detail", key: "detail", width: 70 },
          { header: "Format/Prioritas", key: "extra", width: 18 },
        ],
        rows: [
          ...out.content_gaps.map((g) => ({ kind: "Celah konten", title: g.gap, detail: g.idea, extra: g.format })),
          ...out.recommendations.map((r) => ({ kind: "Rekomendasi", title: r.title, detail: r.detail, extra: r.priority })),
        ],
      },
      {
        name: "Sumber",
        columns: [
          { header: "Judul", key: "title", width: 60 },
          { header: "URL", key: "url", width: 80 },
        ],
        rows: sources,
      },
    ]));
    const files = (await Promise.all([
      storeMaybe(ctx, `riset-kompetitor-${fileSlug(input.brand)}.pptx`, "pptx", pptx, "PPT laporan riset"),
      storeToolFile(ctx, `riset-kompetitor-${fileSlug(input.brand)}.xlsx`, "xlsx", xlsx, "Excel data riset"),
    ])).filter((f): f is ToolFile => Boolean(f));
    return { title: `Riset kompetitor: ${input.brand}`, output: out, files };
  },
};

// ============================================================ Brief KOL / Affiliate

const kol: Runner<typeof kolInput> = {
  addon: "kolpr_pro",
  input: kolInput,
  async run(ctx, input) {
    const out = await aiObject(ctx, {
      schema: kolOutput,
      system: `${BASE}
Kamu KOL/affiliate manager agensi Indonesia. Susun brief kerja sama kreator yang profesional & siap kirim.
Aturan:
- deliverables realistis untuk platform ${input.platform}, jumlah kreator ${input.creators}, tier: ${input.tiers.map((t) => KOL_TIER_LABEL[t]).join(", ")}.
- talking_points 3-5, dos 3-5, donts 3-5 (termasuk kewajiban label #ad/#iklan/kolaborasi berbayar sesuai etika iklan).
- timeline 4-7 tahap (brief → draft → revisi → tayang → laporan). kpis 3-5 dengan target angka.
- fee_estimate: perkiraan tarif pasar Indonesia per konten untuk tiap tier yang dipilih (Rupiah, rentang min-max, qty = pembagian ${input.creators} kreator), total min/max, note bahwa ini estimasi & sesuaikan dengan rate card kreator.${input.budget ? ` Bandingkan dengan budget user (${input.budget}) di note.` : ""}
- dm_template: pesan DM/email ajakan kerja sama yang sopan, personal, singkat (pakai {nama_kreator}).
- contract_points 3-5 poin perjanjian (hak pakai konten, pembayaran, revisi, jadwal).`,
      prompt: untrusted(
        "brief",
        [
          `Brand: ${input.brand}`,
          `Produk: ${input.product}`,
          `Tujuan: ${input.objective}`,
          `Platform: ${input.platform}`,
          `Jumlah kreator: ${input.creators}`,
          input.budget && `Budget: ${input.budget}`,
          input.timeline && `Timeline: ${input.timeline}`,
          input.key_message && `Pesan utama: ${input.key_message}`,
          input.rules && `Aturan khusus: ${input.rules}`,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    });
    const pptx = await makeDeck({
      title: clip(out.campaign_name || `Brief KOL ${input.brand}`, 90),
      subtitle: clip(`${input.brand} · ${out.objective}`, 160),
      theme: "coral",
      cover_style: "split",
      slides: [
        { layout: "quote", kicker: "PESAN UTAMA", title: "Yang harus ditangkap audiens", quote: clip(out.key_message, 240), attribution: clip(out.audience, 60) },
        {
          layout: "cards",
          kicker: "DELIVERABLES",
          title: "Konten yang dibuat",
          cards: padCards(out.deliverables.slice(0, 6).map((d) => ({ icon: "video", title: clip(`${d.qty}× ${d.format}`, 40), text: clip(d.specs, 160) }))),
        },
        { layout: "bullets", kicker: "TALKING POINTS", title: "Poin yang wajib disampaikan", bullets: out.talking_points.slice(0, 6).map((p) => clip(p, 140)) },
        {
          layout: "comparison",
          kicker: "ATURAN",
          title: "Do & Don't",
          columns: [
            { heading: "Jangan", bullets: out.donts.slice(0, 5).map((p) => clip(p, 110)) },
            { heading: "Lakukan", bullets: out.dos.slice(0, 5).map((p) => clip(p, 110)) },
          ],
        },
        { layout: "timeline", kicker: "JADWAL", title: "Timeline kampanye", steps: padSteps(out.timeline.map((t) => ({ title: clip(t.when, 40), text: clip(t.task, 120) }))) },
        {
          layout: "table",
          kicker: "ESTIMASI FEE",
          title: "Perkiraan biaya kreator",
          table: {
            headers: ["Tier", "Followers", "Fee/konten", "Jumlah"],
            rows: [
              ...out.fee_estimate.rows.map((r) => [clip(r.tier, 60), clip(r.followers, 60), `${shortRp(r.fee_min)}-${shortRp(r.fee_max)}`, String(r.qty)]),
              ["Total", "", `${shortRp(out.fee_estimate.total_min)}-${shortRp(out.fee_estimate.total_max)}`, ""],
            ].slice(0, 7),
          },
        },
        { layout: "stats", kicker: "TARGET", title: "KPI kampanye", stats: padStats(out.kpis.slice(0, 4).map((k) => ({ value: clip(k.target, 12), label: clip(k.metric, 60) }))) },
        { layout: "closing", title: clip(out.cta, 90), bullets: [clip(out.hashtags.join(" "), 140)] },
      ],
    });
    const xlsx = await makeWorkbook(withNotes(ctx, [
      {
        name: "Estimasi fee",
        title: out.campaign_name,
        columns: [
          { header: "Tier", key: "tier", width: 20 },
          { header: "Followers", key: "followers", width: 18 },
          { header: "Fee min", key: "fee_min", width: 16, money: true },
          { header: "Fee max", key: "fee_max", width: 16, money: true },
          { header: "Jumlah kreator", key: "qty", width: 14 },
        ],
        rows: out.fee_estimate.rows,
      },
      {
        name: "Deliverables",
        columns: [
          { header: "Format", key: "format", width: 24 },
          { header: "Jumlah", key: "qty", width: 10 },
          { header: "Spesifikasi", key: "specs", width: 70 },
        ],
        rows: out.deliverables,
      },
      {
        name: "Timeline",
        columns: [
          { header: "Kapan", key: "when", width: 20 },
          { header: "Tugas", key: "task", width: 70 },
        ],
        rows: out.timeline,
      },
    ]));
    const files = (await Promise.all([
      storeMaybe(ctx, `brief-kol-${fileSlug(input.brand)}.pptx`, "pptx", pptx, "PPT brief kreator"),
      storeToolFile(ctx, `brief-kol-${fileSlug(input.brand)}.xlsx`, "xlsx", xlsx, "Excel fee & timeline"),
    ])).filter((f): f is ToolFile => Boolean(f));
    return { title: out.campaign_name || `Brief KOL: ${input.brand}`, output: out, files };
  },
};

function padCards(cards: { icon: string; title: string; text: string }[]) {
  const out = [...cards];
  while (out.length < 2) out.push({ icon: "sparkles", title: "Konten tambahan", text: "Sesuaikan dengan kesepakatan kreator." });
  return out;
}
function padStats(stats: { value: string; label: string }[]) {
  const out = [...stats];
  while (out.length < 2) out.push({ value: "-", label: "Target tambahan" });
  return out;
}

// ============================================================ Registry

export const RUNNERS: Record<string, Runner<z.ZodTypeAny>> = {
  listing: listing as Runner<z.ZodTypeAny>,
  live: live as Runner<z.ZodTypeAny>,
  whatsapp: whatsapp as Runner<z.ZodTypeAny>,
  ads: ads as Runner<z.ZodTypeAny>,
  competitor: competitor as Runner<z.ZodTypeAny>,
  kol: kol as Runner<z.ZodTypeAny>,
  ...RESEARCH_RUNNERS,
  ...PRO_RUNNERS,
};

export const isAiTool = (id: string) => Object.prototype.hasOwnProperty.call(RUNNERS, id);
