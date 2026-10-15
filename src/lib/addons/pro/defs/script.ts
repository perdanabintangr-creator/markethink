import "server-only";
import { fileSlug } from "../../runtime";
import { makeRunner, type ProDef } from "../kit";
import { SCRIPT_STYLES, scriptForm, scriptOutput, tag, type ScriptItem } from "../specs/script";

const PLATFORM: Record<string, { label: string; rules: string }> = {
  tiktok: {
    label: "TikTok",
    rules: `TikTok: rasa native & lo-fi (direkam HP, natural, bicara langsung ke kamera), cut cepat, boleh pakai sound tren. Bila jualan:
  arahkan ke keranjang kuning / TikTok Shop ("klik keranjang kuning", "cek keranjang kiri bawah"). Teks layar jauh dari 20% area bawah
  & sisi kanan (tertutup caption dan tombol).`,
  },
  reels: {
    label: "Instagram Reels",
    rules: `Instagram Reels: visual lebih rapi & estetik dibanding TikTok, tetap terasa manusiawi. Siapkan cover yang terbaca di grid 4:5.
  CTA khas IG: "save buat nanti", "share ke temen yang …", "cek link di bio", "DM kata kunci …". Teks layar di area aman tengah.`,
  },
  shorts: {
    label: "YouTube Shorts",
    rules: `YouTube Shorts: penonton datang dari feed & pencarian — judul/teks pembuka berisi kata kunci yang dicari. Rancang ending yang menyambung
  ke awal (loop) agar ditonton ulang. CTA: subscribe, komen, atau "link di deskripsi/komentar tersemat".`,
  },
};

const OBJECTIVE: Record<string, string> = {
  awareness: "Awareness: video harus relatable dan layak dibagikan; brand/produk muncul natural (bukan hard selling), nama brand disebut atau terlihat minimal sekali di tengah, bukan di detik pertama.",
  engagement:
    "Engagement: rancang pemicu komentar/share/save yang spesifik (pertanyaan pilihan A/B, opini yang bisa diperdebatkan secara sehat, 'tag temen yang …', info yang layak disimpan).",
  jualan:
    "Jualan: produk sudah terlihat di 5 detik pertama, demo/bukti nyata (tekstur, sebelum-sesudah yang jujur, proses), harga/penawaran disebut jelas, dan satu CTA beli yang konkret.",
  edukasi: "Edukasi: satu video = satu pelajaran yang langsung bisa dipraktikkan; isi padat, layak di-save; produk hadir sebagai alat bantu, bukan pusat cerita.",
};

/** Rentang jumlah adegan wajar per durasi (ganti visual tiap ±2-5 detik). */
const SCENES: Record<number, string> = { 15: "4-5", 30: "5-7", 45: "6-8", 60: "7-9" };

export const scriptDef: ProDef<typeof scriptOutput> = {
  tool: "script",
  addon: "konten_pro",
  form: scriptForm,
  output: scriptOutput,
  maxOutputTokens: 16000,
  role: `Kamu Creative Director konten short-video yang memegang akun TikTok & Reels beberapa brand lokal hingga tembus jutaan views
dan penjualan dari TikTok Shop. Naskahmu langsung dipakai talent dan editor: setiap detik jelas apa yang terlihat, terdengar, dan tertulis di layar,
tanpa perlu ditanya ulang.`,
  rules: (input) => {
    const dur = Number(input.duration) || 30;
    const count = Number(input.count) || 3;
    const styles = (input.styles as unknown as string[]).map((s) => SCRIPT_STYLES.find(([v]) => v === s)?.[1] ?? s);
    const p = PLATFORM[String(input.platform)] ?? PLATFORM.tiktok;
    const words = Math.round(dur * 2.5);
    return `FORMAT
- Buat TEPAT ${count} naskah untuk ${p.label}, durasi ${dur} detik masing-masing. Gaya yang boleh dipakai: ${styles.join(", ")}.
  Sebar gaya & angle: tiap naskah memakai angle berbeda (mis. masalah/pain, hasil/transformasi, mitos vs fakta, perbandingan, cerita pelanggan,
  behind the scene). Jangan ada dua naskah dengan hook atau alur yang mirip.
- Adegan: ${SCENES[dur] ?? "5-7"} adegan, start/end dalam detik, berurutan tanpa celah, adegan pertama 0-3 detik (hook), adegan terakhir berakhir tepat di detik ${dur}.
- Voice over total maksimal ±${words} kata (tempo bicara Indonesia ±2,5 kata/detik). Panjang VO tiap adegan harus muat di durasi adegannya.
- Teks di layar maksimal ±8 kata per adegan, bukan salinan VO kata per kata.

STRUKTUR YANG TERBUKTI (pakai sebagai kerangka, sesuaikan dengan gaya)
1) Hook 0-3 dtk: visual, ucapan, dan teks layar bekerja bersamaan. Pola yang dipakai: pertanyaan yang sangat spesifik, pernyataan kontras/kontra-intuitif,
   hasil ditunjukkan duluan (result-first), kesalahan umum ("Stop … kalau …"), angka konkret, POV situasi yang relatable, gerakan/objek tak terduga.
   DILARANG membuka dengan salam ("Hai guys", "Halo semuanya"), perkenalan nama/brand, logo, atau intro lambat.
2) Re-hook / ketegangan (3-8 dtk): janji yang membuat penonton bertahan ("tunggu sampai lihat hasil hari ke-7", "ada 1 kesalahan yang paling sering").
3) Isi / bukti: demo, langkah, cerita, atau perbandingan yang konkret — tunjukkan, jangan hanya bilang. Ganti visual tiap 2-4 detik (cut, angle, zoom, b-roll).
4) Payoff: tuntaskan janji hook (hasil, jawaban, punchline).
5) CTA tunggal yang sesuai tujuan; boleh disisipkan natural di payoff. Untuk naskah ${dur >= 45 ? "45-60 detik, sisipkan pattern interrupt di tengah (pergantian lokasi/shot/SFX) untuk menahan retensi" : "pendek, CTA maksimal 3 detik terakhir"}.

PLATFORM & TUJUAN
- ${p.rules}
- ${OBJECTIVE[String(input.objective)] ?? OBJECTIVE.jualan}

TIAP NASKAH WAJIB BERISI
- 3 variasi hook dengan pendekatan berbeda (untuk diuji: body video sama, hook diganti).
- shot: jenis shot (close-up, medium, wide, POV, overhead/flatlay, over-the-shoulder), aksi talent, objek. Realistis untuk alat & talent user
  ${input.talent ? `(${input.talent})` : "(bila tidak disebut, asumsikan 1 orang dengan HP; sediakan opsi faceless/hand-only bila cocok)"}.
- voice_over persis seperti diucapkan, bahasa lisan sehari-hari target${input.tone ? ` dengan gaya: ${input.tone}` : ""}; boleh slang ringan, bukan bahasa iklan baku.
- audio: musik (karakter/tempo, mis. "beat lo-fi pelan" atau "sound tren yang sedang naik"), SFX (whoosh, pop, ding) di momen penting.
- props & lokasi spesifik; editing: ritme cut, kapan b-roll masuk, subtitle burn-in (banyak penonton menonton tanpa suara), cover/thumbnail.
- why: jelaskan mekanisme (curiosity gap, identifikasi diri, bukti visual, rewatch/loop, pemicu komentar), bukan pujian umum.

KEPATUHAN
- Jangan menjanjikan hasil yang tidak bisa dibuktikan atau klaim medis/kesehatan berlebihan ("menyembuhkan", "permanen", "100% ampuh").
  Untuk kosmetik/suplemen pakai bahasa aman ("membantu menyamarkan", "terasa lebih …"). Jangan mengarang testimoni, angka penjualan, atau sertifikasi.
- Before-after harus jujur (cahaya & angle sama), tanpa filter yang mengubah hasil.

TIPS (4-6): jam posting realistis untuk audiens Indonesia (mis. 11.00-13.00 dan 18.30-21.00), cara uji 3 hook, metrik yang dipantau
(3-second view rate/retensi detik ke-3, rata-rata durasi tonton, share & save), batas evaluasi (mis. 48 jam), dan cara repurpose ke platform lain.`;
  },
  post(out, input) {
    const target = Number(input.duration) || 30;
    out.scripts = out.scripts.map((s) => ({
      ...s,
      hooks: s.hooks.slice(0, 3),
      hashtags: s.hashtags.map(tag),
      scenes: fitScenes(s.scenes, target),
    }));
  },
  title: (_out, input) => `Naskah ${PLATFORM[String(input.platform)]?.label ?? "video"} ${input.duration} dtk — ${input.brand}`,
  files(out, input) {
    const rows = out.scripts.flatMap((s, i) => [
      ...s.scenes.map((sc, k) => ({
        no: i + 1,
        title: s.title,
        style: s.style,
        scene: k + 1,
        time: sc.time,
        len: sc.end - sc.start,
        shot: sc.shot,
        on_screen: sc.on_screen,
        voice_over: sc.voice_over,
        audio: sc.audio,
      })),
      { no: i + 1, title: s.title, style: s.style, scene: "CTA", time: "akhir", len: "", shot: "", on_screen: "", voice_over: s.cta, audio: "" },
    ]);
    const band = (r: Record<string, unknown>) => (r.scene === "CTA" ? "FFF7E0" : Number(r.no) % 2 ? "F3F0FF" : null);
    return {
      name: `naskah-video-${fileSlug(String(input.brand))}-${input.platform}-${input.duration}dtk`,
      sheetLabel: "Excel naskah & shot list",
      // PPT sengaja tidak dibuat: naskah dipakai talent & editor dalam bentuk tabel/teks utuh; slide memotong VO & shot (maks 60 karakter/sel).
      deck: null,
      sheets: [
        {
          name: "Naskah",
          title: `Naskah video ${input.duration} detik — ${input.brand}`,
          columns: [
            { header: "Naskah", key: "no", width: 8 },
            { header: "Judul", key: "title", width: 28 },
            { header: "Gaya", key: "style", width: 14 },
            { header: "Adegan", key: "scene", width: 8 },
            { header: "Waktu", key: "time", width: 10 },
            { header: "Durasi (dtk)", key: "len", width: 10 },
            { header: "Shot / visual", key: "shot", width: 44 },
            { header: "Teks di layar", key: "on_screen", width: 28 },
            { header: "Voice over / dialog", key: "voice_over", width: 50 },
            { header: "Audio / musik", key: "audio", width: 26 },
          ],
          rows,
          rowColor: band,
        },
        {
          name: "Hook",
          title: "Variasi hook 0-3 detik (uji: body sama, hook diganti)",
          columns: [
            { header: "Naskah", key: "no", width: 8 },
            { header: "Judul", key: "title", width: 28 },
            { header: "Variasi", key: "variant", width: 9 },
            { header: "Ucapan / teks layar", key: "text", width: 50 },
            { header: "Visual 0-3 detik", key: "visual", width: 50 },
            { header: "Hasil uji (retensi 3 dtk)", key: "result", width: 20 },
          ],
          rows: out.scripts.flatMap((s, i) => s.hooks.map((h, k) => ({ no: i + 1, title: s.title, variant: String.fromCharCode(65 + k), text: h.text, visual: h.visual, result: "" }))),
          rowColor: band,
        },
        {
          name: "Caption & produksi",
          columns: [
            { header: "Naskah", key: "no", width: 8 },
            { header: "Judul", key: "title", width: 26 },
            { header: "Angle", key: "angle", width: 36 },
            { header: "CTA", key: "cta", width: 28 },
            { header: "Caption", key: "caption", width: 60 },
            { header: "Hashtag", key: "hashtags", width: 30 },
            { header: "Properti & lokasi", key: "props", width: 36 },
            { header: "Catatan editing", key: "editing", width: 44 },
            { header: "Kenapa bekerja", key: "why", width: 44 },
            { header: "Status", key: "status", width: 12 },
          ],
          rows: out.scripts.map((s, i) => ({
            no: i + 1,
            title: s.title,
            angle: s.angle,
            cta: s.cta,
            caption: s.caption,
            hashtags: s.hashtags.join(" "),
            props: s.props,
            editing: s.editing,
            why: s.why,
            status: "Draft",
          })),
        },
        {
          name: "Tips",
          columns: [
            { header: "Tips", key: "title", width: 30 },
            { header: "Detail", key: "detail", width: 90 },
          ],
          rows: out.tips,
        },
      ],
    };
  },
};

/** Urutkan adegan & paskan total waktunya ke durasi video (detik bulat, tanpa celah/tumpang tindih). */
export function fitScenes(list: ScriptItem["scenes"], target: number): ScriptItem["scenes"] {
  const scenes = [...list].sort((a, b) => (Number(a.start) || 0) - (Number(b.start) || 0) || (Number(a.end) || 0) - (Number(b.end) || 0));
  if (!scenes.length) return scenes;
  const lens = scenes.map((x) => {
    const d = Number(x.end) - Number(x.start);
    return Number.isFinite(d) && d > 0 ? d : target / scenes.length;
  });
  const total = lens.reduce((a, b) => a + b, 0);
  let cum = 0;
  let prev = 0;
  return scenes.map((x, i) => {
    cum += lens[i];
    const left = scenes.length - 1 - i;
    let end = i === scenes.length - 1 ? target : Math.round((cum * target) / total);
    end = Math.max(prev + 1, Math.min(end, target - left));
    const start = prev;
    prev = end;
    return { ...x, start, end, time: `${start}-${end} dtk` };
  });
}

export const scriptRunner = makeRunner(scriptDef);
