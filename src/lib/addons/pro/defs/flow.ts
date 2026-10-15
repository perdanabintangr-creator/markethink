import "server-only";
import { clip, fileSlug } from "../../runtime";
import { atLeast, makeRunner, type ProDef } from "../kit";
import { FLOW_STAGES, delayMinutes, flowForm, flowOutput, flowVariables } from "../specs/flow";

const CHANNEL: Record<string, string> = { whatsapp: "WhatsApp saja", email: "Email saja", both: "WhatsApp + email" };

/** SOP tiap tahap; jeda repeat & win-back dihitung dari siklus beli ulang. */
function stageRules(stages: string[], cycle: number) {
  const remind = Math.max(3, Math.round(cycle * 0.8));
  const passive = cycle * 2;
  const sop: Record<string, string> = {
    lead: `Lead baru: balas ≤5 menit (H+0) — jawab pertanyaannya + 1 pertanyaan kualifikasi (kebutuhan/budget/lokasi kirim), bukan langsung daftar harga panjang.
  Follow-up H+1 (rekomendasi produk sesuai jawaban) dan H+3 (alasan beli sekarang yang jujur). Berhenti setelah 3 pesan tanpa balasan.`,
    no_order: `Chat tanpa order: H+0 2-3 jam setelah chat terakhir (bantu putuskan: jawab keberatan harga/ongkir/cara bayar), H+1 (bukti: slot {testimoni} dari pelanggan
  NYATA yang diisi admin — jangan mengarang testimoni), H+3 insentif kecil berbatas waktu (gratis ongkir/bonus), bukan diskon besar.`,
    cart: `Keranjang/checkout ditinggal: H+0 30-60 menit (pengingat + link kembali ke keranjang), H+1 (jawab hambatan umum: ongkir, metode bayar, estimasi kirim),
  H+2 atau H+3 insentif kecil dengan batas 24 jam. Hentikan otomatis begitu order masuk.`,
    post_purchase: `Setelah beli: H+0 konfirmasi pesanan & estimasi kirim (pesan utilitas), saat barang sampai: cara pakai/simpan + 1 tips, H+2/H+3 cek kepuasan
  dengan pertanyaan skala 1-5. Jangan menjual apa pun di 2 pesan pertama.`,
    review: `Minta ulasan: hanya ke pelanggan yang menjawab kepuasan 4-5; skor 1-3 dialihkan ke CS untuk diselesaikan dulu. Kirim H+3 s/d H+5 setelah barang sampai,
  sertakan link langsung ke halaman ulasan. Boleh insentif untuk MENULIS ulasan jujur, dilarang insentif khusus bintang 5 (melanggar kebijakan marketplace).`,
    repeat: `Repeat order: siklus beli ulang ${cycle} hari → pengingat pertama H+${remind} (perkiraan produk mau habis), kedua H+${cycle}, ketiga H+${cycle + 7}
  dengan penawaran paket/langganan. Personalisasi dengan {produk} terakhir yang dibeli.`,
    winback: `Win-back: pelanggan pasif = tidak beli > ${passive} hari (2× siklus). 3 pesan dalam 14 hari: (1) sapaan + apa yang baru, (2) penawaran comeback
  berbatas waktu, (3) pesan terakhir dengan pilihan berhenti menerima pesan. Setelah itu keluarkan dari alur, tandai "tidur".`,
  };
  return stages.map((s) => `- ${sop[s] ?? s}`).join("\n");
}

export const flowDef: ProDef<typeof flowOutput> = {
  tool: "flow",
  addon: "crm_pro",
  form: flowForm,
  output: flowOutput,
  maxOutputTokens: 15000,
  role: `Kamu CRM & Retention Lead yang membangun automation WhatsApp dan email untuk brand D2C Indonesia (F&B, beauty, fashion, kebutuhan rumah).
Kamu terbiasa menulis flow di Qontak, Wati, Mekari, Klaviyo maupun cara manual dengan label WhatsApp Business. Ukuran keberhasilanmu: repeat order
dan konversi chat naik tanpa nomor diblokir atau pelanggan merasa di-spam.`,
  rules: (input) => {
    const stages = (input.stages as unknown as string[]) ?? [];
    const names = stages.map((s) => FLOW_STAGES.find(([k]) => k === s)?.[1] ?? s);
    const cycle = Number(input.cycle) || 30;
    const ch = String(input.channel);
    return `- Buat TEPAT ${stages.length} tahap, urut: ${names.join(" → ")}. Kanal: ${CHANNEL[ch] ?? CHANNEL.whatsapp}.${
      ch === "both" ? " Pakai WhatsApp untuk pesan cepat/transaksional & follow-up pendek; email untuk konten panjang (panduan, cerita brand, katalog)." : ""
    }
- Alat yang dipakai: ${String(input.tool || "belum disebut — asumsikan WhatsApp Business manual dengan label, dan sebutkan kapan perlu naik ke WhatsApp Business API")}.

SOP PER TAHAP
${stageRules(stages, cycle)}

ATURAN PENULISAN PESAN
- Tiap tahap 2-4 pesan. Pesan WA follow-up ≤ 400 karakter, satu CTA, sapaan "Kak {nama}", bahasa ngobrol sesuai gaya brand. Tidak ada "Dear customer", tidak ada
  paragraf promosi panjang. Emoji maksimal 2 per pesan.
- Email: subject ≤ 45 karakter yang spesifik (bukan "Newsletter Bulan Ini"), isi 80-150 kata, satu tombol CTA. Untuk WhatsApp, subject dikosongkan.
- Pakai variabel dalam kurung kurawal: {nama}, {produk}, {link}, dan bila perlu {kode_voucher}, {resi}, {tanggal}. Jangan menulis nama pelanggan/angka testimoni karangan.
- Kondisi keluar jelas: begitu pelanggan order/membalas STOP/pindah tahap, pesan berikutnya di tahap itu tidak dikirim. Satu pelanggan hanya di satu alur aktif.
- Jeda ditulis konsisten: "H+0, 15 menit", "H+1, 10.00", "H+3, 19.00". Hari dihitung dari pemicu tahap itu.

TARGET (perkiraan pasar Indonesia, sesuaikan dengan produk)
- WhatsApp: balasan lead baru 35-60%, konversi lead → order 10-25%; chat tanpa order → order 8-15%; keranjang ditinggal pulih 10-20%;
  respons minta ulasan 15-30%; repeat order dari pengingat 15-35%; win-back 5-12%. Email: open 20-40%, klik 2-5%.
- metric_note menjelaskan cara menghitung (mis. "order dengan label Lead ÷ lead baru minggu itu").

KEPATUHAN & ANTI-BANNED (wajib ada di compliance)
- Izin: hanya kirim ke kontak yang pernah chat/order/opt-in; setiap pesan promosi memberi cara berhenti ("balas STOP").
- Jam kirim 08.00-20.00 WIB; hindari Jumat 11.30-13.00; maksimal 2 pesan promosi per pelanggan per minggu lintas alur.
- WhatsApp Business API: di luar jendela 24 jam sejak pesan terakhir pelanggan wajib template yang disetujui Meta (kategori marketing/utility, berbayar per percakapan);
  di dalam jendela 24 jam boleh pesan bebas. Aplikasi WA Business biasa: kirim manual/broadcast list (hanya sampai ke kontak yang menyimpan nomor toko),
  jangan pakai aplikasi blast tidak resmi, panaskan nomor baru bertahap, jaga tingkat blokir/laporan rendah dengan personalisasi.
- Data pribadi pelanggan disimpan seperlunya dan tidak dibagikan (UU PDP).

SEGMEN & SETUP
- Segmen berupa label yang bisa dibuat di alat user (mis. Lead-Iklan, Belum Order, Pelanggan Baru, Pelanggan Setia ≥3x, Pasif >${cycle * 2} hari) dengan perlakuan berbeda.
- Setup: langkah urut yang bisa diikuti admin di alat tersebut (label/atribut kontak, quick reply/template, flow/automation, persetujuan template, laporan mingguan).`;
  },
  post(out, input) {
    const ch = String(input.channel);
    const norm = (c: string) => (ch === "whatsapp" ? "WhatsApp" : ch === "email" ? "Email" : /mail/i.test(c) ? "Email" : "WhatsApp");
    const pct = (v: number | null) => (v === null || !Number.isFinite(v) ? null : Math.round(Math.min(100, Math.max(0, v)) * 10) / 10);
    out.stages = out.stages.map((s) => {
      const messages = s.messages.map((m) => {
        const channel = norm(m.channel);
        return { ...m, channel, subject: channel === "Email" ? m.subject : "" };
      });
      const mins = messages.map((m) => delayMinutes(m.delay));
      const sorted = mins.every((x) => x !== null)
        ? messages.map((m, i) => ({ m, k: mins[i] as number })).sort((a, b) => a.k - b.k).map((x) => x.m)
        : messages;
      return { ...s, messages: sorted, reply_rate: pct(s.reply_rate), conversion_rate: pct(s.conversion_rate) };
    });
    const all = out.compliance.map((c) => `${c.rule} ${c.detail}`).join(" ");
    if (!/20[.:]00/.test(all)) out.compliance.push({ rule: "Jam kirim 08.00-20.00 WIB", detail: "Pesan otomatis di luar jam ini ditahan dan dikirim pagi berikutnya; hindari Jumat 11.30-13.00." });
    if (!/stop|berhenti|opt/i.test(all)) out.compliance.push({ rule: "Cara berhenti (opt-out)", detail: "Setiap pesan promosi ditutup 'Balas STOP kalau tidak mau dapat info lagi'; kontak yang membalas STOP langsung dikeluarkan dari semua alur." });
  },
  title: (_out, input) => `Alur follow-up ${CHANNEL[String(input.channel)] ?? ""} — ${brandOf(String(input.business))}`,
  files(out, input) {
    const brand = brandOf(String(input.business));
    const totalMsg = out.stages.reduce((s, x) => s + x.messages.length, 0);
    const withConv = out.stages.filter((s) => s.conversion_rate !== null);
    let no = 0;
    return {
      name: `alur-follow-up-${fileSlug(brand)}`,
      deckLabel: "PPT peta alur",
      sheetLabel: "Excel alur pesan",
      deck: {
        title: clip(`Alur Follow-up ${brand}`, 90),
        subtitle: clip(`${CHANNEL[String(input.channel)] ?? ""} · ${out.stages.length} tahap · ${totalMsg} pesan`, 160),
        theme: "ocean",
        cover_style: "split",
        slides: [
          { layout: "quote", kicker: "GAMBARAN ALUR", title: "Ringkasan", quote: clip(out.summary, 240) },
          {
            layout: "timeline",
            kicker: "PETA ALUR",
            title: "Perjalanan pelanggan",
            steps: atLeast(
              out.stages.slice(0, 6).map((s) => ({ title: clip(s.stage, 40), text: clip(`${s.trigger} → ${s.goal}`, 120) })),
              3,
              { title: "Evaluasi mingguan", text: "Cek balasan & konversi tiap tahap setiap Senin, ganti pesan yang paling lemah." },
            ),
          },
          ...out.stages.slice(0, 7).map((s, i) => ({
            layout: "table" as const,
            kicker: clip(`TAHAP ${i + 1}`, 40),
            title: clip(s.stage, 90),
            subtitle: clip(`Pemicu: ${s.trigger} · Keluar: ${s.exit}`, 160),
            table: {
              headers: ["Jeda", "Kanal", "Isi pesan", "CTA"],
              rows: s.messages.slice(0, 7).map((m) => [clip(m.delay, 60), clip(m.channel, 60), clip(m.text, 60), clip(m.cta, 60)]),
            },
          })),
          ...(withConv.length >= 2
            ? [
                {
                  layout: "chart" as const,
                  kicker: "TARGET",
                  title: "Target konversi per tahap",
                  subtitle: "Perkiraan, dalam persen",
                  chart: {
                    type: "bar" as const,
                    labels: withConv.slice(0, 12).map((s) => clip(s.stage, 30)),
                    series: [
                      { name: "Balasan/klik", values: withConv.slice(0, 12).map((s) => s.reply_rate ?? 0) },
                      { name: "Konversi", values: withConv.slice(0, 12).map((s) => s.conversion_rate ?? 0) },
                    ],
                    unit: "%",
                  },
                },
              ]
            : []),
          {
            layout: "cards",
            kicker: "SEGMENTASI",
            title: "Label pelanggan",
            cards: atLeast(
              out.segments.slice(0, 6).map((s) => ({ icon: "users", title: clip(s.name, 40), text: clip(`${s.rule} → ${s.treatment}`, 160) })),
              2,
              { icon: "user-check", title: "Pelanggan aktif", text: "Order dalam 1 siklus terakhir; hanya terima pesan repeat order." },
            ),
          },
          {
            layout: "table",
            kicker: "KEPATUHAN",
            title: "Aturan kirim agar nomor aman",
            table: { headers: ["Aturan", "Detail"], rows: out.compliance.slice(0, 7).map((c) => [clip(c.rule, 60), clip(c.detail, 60)]) },
          },
          { layout: "closing", title: "Langkah setup", bullets: out.setup.slice(0, 6).map((s) => clip(`${s.title}: ${s.detail}`, 140)) },
        ],
      },
      sheets: [
        {
          name: "Alur pesan",
          title: `Alur follow-up — ${brand}`,
          columns: [
            { header: "No", key: "no", width: 5 },
            { header: "Tahap", key: "stage", width: 18 },
            { header: "Pemicu", key: "trigger", width: 30 },
            { header: "Urutan", key: "order", width: 8 },
            { header: "Jeda", key: "delay", width: 16 },
            { header: "Kanal", key: "channel", width: 11 },
            { header: "Subjek email", key: "subject", width: 26 },
            { header: "Isi pesan", key: "text", width: 70 },
            { header: "Variabel", key: "vars", width: 20 },
            { header: "CTA", key: "cta", width: 24 },
            { header: "Catatan admin", key: "note", width: 36 },
            { header: "Kondisi keluar", key: "exit", width: 30 },
            { header: "Status", key: "status", width: 10 },
          ],
          rows: out.stages.flatMap((s) =>
            s.messages.map((m, i) => ({
              ...m,
              no: ++no,
              stage: s.stage,
              trigger: i === 0 ? s.trigger : "",
              exit: i === 0 ? s.exit : "",
              order: i + 1,
              vars: flowVariables(`${m.subject} ${m.text}`).join(" "),
              status: "Draft",
            })),
          ),
          rowColor: (r) => (r.order === 1 ? "EEF6FF" : null),
        },
        {
          name: "Target per tahap",
          columns: [
            { header: "Tahap", key: "stage", width: 20 },
            { header: "Tujuan", key: "goal", width: 40 },
            { header: "Jumlah pesan", key: "count", width: 12 },
            { header: "Target balasan/klik %", key: "reply_rate", width: 16 },
            { header: "Target konversi %", key: "conversion_rate", width: 16 },
            { header: "Cara mengukur", key: "metric_note", width: 50 },
          ],
          rows: [
            ...out.stages.map((s) => ({ stage: s.stage, goal: s.goal, count: s.messages.length, reply_rate: s.reply_rate, conversion_rate: s.conversion_rate, metric_note: s.metric_note })),
            { stage: "", goal: "" },
            ...out.kpis.map((k) => ({ stage: k.metric, goal: k.target })),
          ],
        },
        {
          name: "Segmentasi",
          columns: [
            { header: "Segmen / label", key: "name", width: 24 },
            { header: "Aturan masuk", key: "rule", width: 50 },
            { header: "Perlakuan", key: "treatment", width: 50 },
          ],
          rows: out.segments,
        },
        {
          name: "Setup & kepatuhan",
          columns: [
            { header: "Bagian", key: "kind", width: 14 },
            { header: "Langkah / aturan", key: "title", width: 32 },
            { header: "Detail", key: "detail", width: 80 },
          ],
          rows: [
            ...out.setup.map((s, i) => ({ kind: `Setup ${i + 1}`, title: s.title, detail: s.detail })),
            ...out.compliance.map((c) => ({ kind: "Kepatuhan", title: c.rule, detail: c.detail })),
          ],
          rowColor: (r) => (r.kind === "Kepatuhan" ? "FFF7E0" : null),
        },
      ],
    };
  },
};

/** Nama brand dari kalimat pertama deskripsi bisnis. */
function brandOf(business: string) {
  return clip(business.split(/\s[—–-]\s|[,.\n(:]/)[0].trim() || "Bisnis", 40);
}

export const flowRunner = makeRunner(flowDef);
