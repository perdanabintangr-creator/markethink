import "server-only";
import { clip, fileSlug } from "../../runtime";
import { atLeast, makeRunner, type ProDef } from "../kit";
import { AUDIT_ASPECTS, BIO_LIMIT, auditForm, auditOutput, scoreLabel } from "../specs/audit";

const GOAL: Record<string, string> = {
  sales: "jualan/order: setiap konten harus punya jalur ke pembelian (link, keranjang, WA) dan akun harus meyakinkan orang asing untuk beli dalam 10 detik melihat profil",
  leads: "chat & leads: ukur dari DM/WA masuk; pakai CTA kata kunci, highlight 'Cara order/konsultasi', dan respons cepat",
  awareness: "dikenal lebih banyak orang: utamakan reach non-follower, share, dan konten yang mudah dibagikan; profil harus jelas dalam 3 detik",
  community: "komunitas & loyalitas: utamakan komentar bermakna, UGC/repost pelanggan, story interaktif, dan konsistensi suara brand",
  authority: "membangun kepercayaan/keahlian: konten edukasi mendalam yang layak disimpan, bukti kompetensi, dan wajah/nama ahli di balik brand",
};

export const auditDef: ProDef<typeof auditOutput> = {
  tool: "audit",
  addon: "konten_pro",
  form: auditForm,
  output: auditOutput,
  maxOutputTokens: 14000,
  validate: (input) =>
    !String(input.bio ?? "").trim() && !String(input.data ?? "").trim() && !(input.attachment_ids as string[] | undefined)?.length
      ? "Isi bio sekarang, data konten terakhir, atau upload screenshot profil/insight dulu, ya — supaya audit berdasarkan bukti, bukan tebakan."
      : null,
  role: `Kamu Social Media Lead di agency yang rutin mengaudit akun Instagram & TikTok brand sebelum pitching dan onboarding klien.
Auditmu tajam dan jujur: setiap nilai punya bukti dari akun itu sendiri, setiap temuan diikuti perbaikan yang bisa dikerjakan minggu ini,
dan klien langsung paham apa yang harus diubah duluan.`,
  rules: (input) => {
    const platform = String(input.platform) === "tiktok" ? "tiktok" : "instagram";
    const limit = BIO_LIMIT[platform];
    return `KONTEKS
- Platform: ${platform === "tiktok" ? "TikTok" : "Instagram"} · akun ${input.handle} · tujuan akun: ${GOAL[String(input.goal)] ?? GOAL.sales}.
- Sumber bukti HANYA: bio, followers, frekuensi, data konten, dan screenshot dari user. Kamu tidak bisa membuka akunnya.
  DILARANG mengarang angka performa (views, ER, followers, jam aktif) atau isi konten yang tidak terlihat. Bila sebuah aspek tidak bisa
  dinilai dari data, tetap beri skor konservatif (4-6), tulis evidence diawali "Asumsi: …", dan masukkan data yang dibutuhkan ke assumptions.

PENILAIAN 7 ASPEK (key wajib: ${AUDIT_ASPECTS.map(([k, n]) => `${k} = ${n}`).join("; ")})
Skala 1-10: 1-3 lemah/merugikan, 4-6 standar tapi tidak membedakan, 7-8 baik & konsisten, 9-10 layak jadi contoh di kategorinya.
- profile: dalam 3 detik orang asing harus paham — siapa, untuk siapa, apa untungnya, kenapa percaya, langkah berikutnya (CTA + link).
  ${platform === "instagram" ? "Kolom Nama berisi kata kunci yang dicari (bisa ditemukan lewat search), kategori bisnis, tombol kontak/WA, link-in-bio maks 3-5 tombol." : "Nama tampilan berisi kata kunci, link di bio (butuh akun bisnis/1.000 followers), tautan TikTok Shop/etalase."}
  Foto profil: logo/wajah terbaca di ukuran kecil.
- visual: konsistensi warna, font, template cover ${platform === "instagram" ? "Reels & carousel; 9 posting teratas grid membentuk kesan yang jelas" : "video; thumbnail/cover terbaca di grid profil"}; produk/wajah terlihat.
- pillars: 3-5 pilar yang jelas dan berulang, tiap konten terkait masalah/keinginan audiens, rasio jualan vs nilai (jualan ±20-30% kecuali akun toko murni).
- hook: 3 detik pertama video / slide pertama carousel / cover; struktur cerita (masalah → bukti → payoff → CTA); teks layar & subtitle.
- engagement: hitung dari data bila ada — ER per konten = (likes + komentar + saves + shares) ÷ reach/views × 100, rata-ratakan, tulis caranya di evidence.
  Patokan perkiraan: Instagram ER by reach 3-6% sehat untuk akun brand kecil; TikTok ER by views 4-8% sehat. Save & share lebih bernilai daripada likes.
  Nilai juga balasan komentar, story interaktif, repost pelanggan/UGC.
- funnel: setiap konten punya langkah berikutnya; jalur profil → link/WA/keranjang mulus; ada konten bukti (testimoni nyata, demo, cara order);
  ${platform === "instagram" ? "CTA kata kunci DM, highlight cara order, story dengan link sticker." : "keranjang kuning/etalase, video dengan CTA ke TikTok Shop, live jualan bila relevan."}
- cadence: ${platform === "instagram" ? "patokan 3-5 posting feed/Reels per minggu + story hampir tiap hari" : "patokan 4-7 video per minggu"}; konsistensi lebih penting dari volume; jam tayang sesuai audiens Indonesia (mis. 11.00-13.00, 18.30-21.00).
- priority "tinggi" untuk aspek berskor ≤5 yang paling dekat dengan tujuan akun.

BIO BARU
- Tepat 3 opsi, MAKSIMAL ${limit} karakter termasuk spasi, emoji, dan baris baru (batas ${platform === "instagram" ? "Instagram" : "TikTok"}). Hitung dengan teliti.
- Tiap opsi pendekatan berbeda (mis. manfaat utama, bukti/kredibilitas dari data user, penawaran/CTA). Jangan mengarang klaim ("No.1", "terlaris", jumlah pelanggan) yang tidak disebut user.

HIGHLIGHT & PINNED
- ${platform === "instagram" ? "4-6 highlight (type 'highlight') dengan nama pendek ≤15 karakter, urut sesuai perjalanan pembeli (mis. Mulai sini, Menu/Produk, Testimoni, Cara order, FAQ, Promo) + 3 posting pinned (type 'pinned')." : "TikTok tidak punya highlight: pakai type 'highlight' untuk 3-5 playlist video (nama ≤15 karakter) + 3 video pinned (type 'pinned')."}
- Isi tiap highlight/pinned: konten apa yang ditaruh dan tugasnya di funnel.

KEEP / STOP / START
- 2-4 poin per kolom, spesifik (format + topik), alasan berbasis bukti data bila ada. Contoh yang buruk: "buat konten lebih menarik".

RENCANA 30 HARI & KPI
- Tepat 4 minggu. Minggu 1 = benahi fondasi (bio, highlight, pinned, template); minggu 2-3 = produksi pilar & uji hook; minggu 4 = evaluasi & gandakan yang berhasil.
  Tiap minggu 3-5 aksi konkret dengan jumlah konten, format, dan siapa yang mengerjakan.
- KPI 3-6: baseline dari data user (atau "belum ada data"); target realistis 30 hari (mis. ER naik 1-2 poin, saves ×2, klik link/DM masuk) — tandai sebagai target.
- verdict jujur dan berangka bila data ada (mis. "Konten edukasi ditonton 9x lebih banyak dari promo, tapi bio tidak memberi alasan untuk follow atau beli.").`;
  },
  post(out, input) {
    const platform = String(input.platform) === "tiktok" ? "tiktok" : "instagram";
    out.platform = platform;
    const order = AUDIT_ASPECTS.map(([k]) => k as string);
    const seen = new Set<string>();
    out.aspects = out.aspects
      .filter((a) => (seen.has(a.key) ? false : (seen.add(a.key), true)))
      .map((a) => ({ ...a, score: Math.round(Math.min(10, Math.max(1, Number(a.score) || 1)) * 10) / 10 }))
      .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
    const avg = out.aspects.length ? out.aspects.reduce((s, a) => s + a.score, 0) / out.aspects.length : 0;
    out.score_total = Math.round(avg * 10);
    out.plan = out.plan
      .map((w, i) => ({ ...w, week: Math.min(4, Math.max(1, Math.round(Number(w.week) || i + 1))) }))
      .sort((a, b) => a.week - b.week);
    out.bio_options = out.bio_options.slice(0, 3);
  },
  title: (_out, input) => `Audit akun ${String(input.handle)} (${String(input.platform) === "tiktok" ? "TikTok" : "Instagram"})`,
  files(out, input) {
    const handle = String(input.handle);
    const platform = String(input.platform) === "tiktok" ? "TikTok" : "Instagram";
    const sorted = [...out.aspects].sort((a, b) => b.score - a.score);
    const best = sorted[0];
    const worst = sorted.at(-1);
    const fixes = [...out.aspects].sort((a, b) => a.score - b.score).slice(0, 3);
    const kss = Math.min(7, Math.max(out.keep.length, out.stop.length, out.start.length, 1));
    const limit = BIO_LIMIT[out.platform ?? "instagram"] ?? 150;
    return {
      name: `audit-${platform.toLowerCase()}-${fileSlug(handle)}`,
      deckLabel: "PPT hasil audit",
      sheetLabel: "Excel audit & rencana 30 hari",
      deck: {
        title: clip(`Audit Akun ${platform} ${handle}`, 90),
        subtitle: clip(`${scoreLabel(out.score_total)} · skor ${out.score_total}/100`, 160),
        theme: "midnight",
        cover_style: "split",
        slides: [
          { layout: "quote", kicker: "HASIL AUDIT", title: clip(out.verdict, 90), quote: clip(out.summary, 240) },
          {
            layout: "stats",
            kicker: "SKOR",
            title: "Kondisi akun saat ini",
            stats: [
              { value: `${out.score_total}/100`, label: "Skor total", note: clip(scoreLabel(out.score_total), 80) },
              ...(best ? [{ value: `${best.score}/10`, label: clip(`Terkuat: ${best.name}`, 60) }] : []),
              ...(worst && worst !== best ? [{ value: `${worst.score}/10`, label: clip(`Terlemah: ${worst.name}`, 60) }] : []),
              ...(input.followers ? [{ value: clip(String(input.followers), 12), label: "Followers saat audit" }] : []),
            ],
          },
          {
            layout: "chart",
            kicker: "7 ASPEK",
            title: "Skor per aspek (1-10)",
            subtitle: "Skor total = rata-rata aspek × 10",
            chart: { type: "bar", labels: out.aspects.map((a) => clip(a.name, 30)), series: [{ name: "Skor", values: out.aspects.map((a) => a.score) }] },
          },
          {
            layout: "table",
            kicker: "TEMUAN",
            title: "Temuan & perbaikan per aspek",
            table: { headers: ["Aspek", "Skor", "Temuan", "Perbaikan"], rows: out.aspects.slice(0, 7).map((a) => [clip(a.name, 60), `${a.score}/10`, clip(a.finding, 60), clip(a.fix, 60)]) },
          },
          {
            layout: "cards",
            kicker: "PRIORITAS",
            title: "Tiga perbaikan dengan dampak terbesar",
            cards: fixes.map((a) => ({ icon: "zap", title: clip(`${a.name} (${a.score}/10)`, 40), text: clip(a.fix, 160) })),
          },
          {
            layout: "table",
            kicker: "KEEP · STOP · START",
            title: "Konten yang dipertahankan, dihentikan & dimulai",
            table: {
              headers: ["Pertahankan", "Hentikan", "Mulai"],
              rows: Array.from({ length: kss }, (_, i) => [clip(out.keep[i]?.item ?? "", 60), clip(out.stop[i]?.item ?? "", 60), clip(out.start[i]?.item ?? "", 60)]),
            },
          },
          {
            layout: "cards",
            kicker: "BIO BARU",
            title: `Tiga opsi bio (maks ${limit} karakter)`,
            cards: out.bio_options.map((b, i) => ({ icon: "pen-tool", title: clip(`Opsi ${i + 1}: ${b.angle}`, 40), text: clip(b.text, 160) })),
          },
          {
            layout: "table",
            kicker: platform === "TikTok" ? "PLAYLIST & PINNED" : "HIGHLIGHT & PINNED",
            title: "Struktur profil yang mengarahkan ke pembelian",
            table: {
              headers: ["Jenis", "Nama", "Isi & tugasnya"],
              rows: out.highlights.slice(0, 7).map((h) => [h.type === "pinned" ? "Pinned" : platform === "TikTok" ? "Playlist" : "Highlight", clip(h.name, 60), clip(h.content, 60)]),
            },
          },
          {
            layout: "timeline",
            kicker: "30 HARI",
            title: "Rencana perbaikan per minggu",
            steps: atLeast(
              out.plan.slice(0, 6).map((w) => ({ title: clip(`Minggu ${w.week}: ${w.focus}`, 40), text: clip(w.actions.slice(0, 2).join(" · "), 120) })),
              3,
              { title: "Evaluasi mingguan", text: "Cek ER, saves, klik link & DM tiap Senin; gandakan format terbaik." },
            ),
          },
          {
            layout: "stats",
            kicker: "TARGET 30 HARI",
            title: "KPI yang dipantau",
            stats: atLeast(
              out.kpis.slice(0, 4).map((k) => ({ value: clip(k.target, 12), label: clip(k.metric, 60), note: clip(`Sekarang: ${k.baseline}`, 80) })),
              2,
              { value: `${out.score_total + 10}+`, label: "Skor audit ulang", note: "Target audit ulang di hari ke-30" },
            ),
          },
          {
            layout: "closing",
            title: out.assumptions.length ? "Asumsi & data yang perlu dilengkapi" : "Langkah pertama minggu ini",
            bullets: (out.assumptions.length ? out.assumptions : out.plan[0]?.actions ?? []).slice(0, 6).map((b) => clip(b, 140)),
          },
        ],
      },
      sheets: [
        {
          name: "Skor aspek",
          title: `Audit ${platform} ${handle} — skor ${out.score_total}/100 (${scoreLabel(out.score_total)})`,
          columns: [
            { header: "Aspek", key: "name", width: 24 },
            { header: "Skor (1-10)", key: "score", width: 11 },
            { header: "Prioritas", key: "priority", width: 11 },
            { header: "Temuan", key: "finding", width: 50 },
            { header: "Bukti dari data", key: "evidence", width: 50 },
            { header: "Perbaikan", key: "fix", width: 55 },
          ],
          rows: [...out.aspects, { name: "SKOR TOTAL (rata-rata × 10)", score: out.score_total, priority: "", finding: out.verdict, evidence: "", fix: "" }],
          rowColor: (r) => (String(r.name).startsWith("SKOR TOTAL") ? "DBEAFE" : Number(r.score) >= 7.5 ? "E8F8EF" : Number(r.score) < 5.5 ? "FDECEC" : "FFF7E0"),
        },
        {
          name: "Keep-Stop-Start",
          columns: [
            { header: "Kategori", key: "kind", width: 14 },
            { header: "Konten / kebiasaan", key: "item", width: 45 },
            { header: "Alasan", key: "reason", width: 70 },
          ],
          rows: [
            ...out.keep.map((x) => ({ kind: "Pertahankan", ...x })),
            ...out.stop.map((x) => ({ kind: "Hentikan", ...x })),
            ...out.start.map((x) => ({ kind: "Mulai", ...x })),
          ],
          rowColor: (r) => (r.kind === "Pertahankan" ? "E8F8EF" : r.kind === "Hentikan" ? "FDECEC" : "EEF2FF"),
        },
        {
          name: "Rencana 30 hari",
          columns: [
            { header: "Minggu", key: "week", width: 9 },
            { header: "Fokus", key: "focus", width: 30 },
            { header: "Aksi", key: "actions", width: 80 },
            { header: "Output", key: "output", width: 36 },
            { header: "Status", key: "status", width: 12 },
          ],
          rows: out.plan.map((w) => ({ ...w, actions: w.actions.map((a) => `• ${a}`).join("\n"), status: "Belum" })),
        },
        {
          name: "KPI 30 hari",
          columns: [
            { header: "Metrik", key: "metric", width: 30 },
            { header: "Sekarang", key: "baseline", width: 18 },
            { header: "Target 30 hari", key: "target", width: 18 },
            { header: "Cara ukur", key: "how", width: 60 },
            { header: "Hasil hari ke-30", key: "result", width: 18 },
          ],
          rows: out.kpis.map((k) => ({ ...k, result: "" })),
        },
        {
          name: "Bio & highlight",
          columns: [
            { header: "Jenis", key: "kind", width: 14 },
            { header: "Nama / pendekatan", key: "name", width: 30 },
            { header: "Isi", key: "text", width: 70 },
            { header: "Karakter", key: "chars", width: 10 },
          ],
          rows: [
            ...out.bio_options.map((b, i) => ({ kind: `Bio opsi ${i + 1}`, name: b.angle, text: b.text, chars: `${[...b.text].length}/${limit}` })),
            ...out.highlights.map((h) => ({ kind: h.type === "pinned" ? "Pinned" : platform === "TikTok" ? "Playlist" : "Highlight", name: h.name, text: h.content, chars: "" })),
          ],
          rowColor: (r) => (String(r.chars).includes("/") && Number(String(r.chars).split("/")[0]) > limit ? "FDECEC" : null),
        },
      ],
    };
  },
};

export const auditRunner = makeRunner(auditDef);
