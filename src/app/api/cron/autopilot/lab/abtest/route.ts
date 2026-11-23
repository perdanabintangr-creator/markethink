import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { internalAuthorized } from "@/lib/vault-auth";
import { createFallbackModel } from "@/lib/ai/router";
import { getTier } from "@/lib/ai/models.config";

export const maxDuration = 300;

/** Uji buta Claude vs Qwen (ACC founder 23 Nov): 10 tugas marketing, prompt & instruksi otak Senior yang sama. Internal saja. */
const TASKS = [
  "Buatkan 3 caption Instagram untuk kedai kopi susu gula aren di Bandung yang baru buka cabang kedua. Target mahasiswa. Sertakan hook, CTA, dan 3-5 hashtag.",
  "Susun campaign plan 2 minggu untuk promo Harbolnas 12.12 toko skincare lokal di Shopee dengan budget iklan Rp3 juta. Sertakan timeline, kanal, dan KPI.",
  "Analisis singkat kompetitor untuk brand sambal kemasan premium di Indonesia: siapa pemain utamanya, posisi harga, kekuatan & celah yang bisa diambil brand baru.",
  "Tulis naskah video TikTok 30 detik untuk jasa laundry kiloan antar-jemput di Jakarta Selatan. Format: hook 3 detik, isi, CTA. Bahasa santai Gen Z.",
  "Buat 5 variasi headline iklan Meta Ads untuk kelas kursus bahasa Inggris online untuk karyawan, masing-masing maks 40 karakter, plus 2 primary text.",
  "Saya punya warung nasi padang, penjualan turun 30% sejak ada pesaing di sebelah. Berikan 5 strategi konkret yang bisa saya jalankan minggu ini dengan modal kecil.",
  "Buat persona pembeli utama untuk brand hijab premium harga Rp150-300 ribu: demografi, kebiasaan media sosial, motivasi beli, dan keberatan.",
  "Buat kalender konten Instagram 1 minggu (7 post) untuk klinik gigi di Surabaya: tema harian, format (reel/carousel/single), dan judul konten.",
  "Tulis template balasan WhatsApp untuk pelanggan yang komplain pesanan kue ulang tahunnya terlambat 2 jam. Nada empatik, tawarkan kompensasi wajar.",
  "Jelaskan dengan bahasa sederhana untuk pemilik UMKM: apa itu CAC dan LTV, cara menghitungnya dari data penjualan sederhana, dan contoh angka toko baju online.",
];

const MODELS = {
  claude: { provider: "anthropic" as const, modelId: "claude-sonnet-5-5", price: [2, 10] },
  qwen: { provider: "openrouter" as const, modelId: process.env.ABTEST_QWEN_MODEL?.trim() || "qwen/qwen3.5-plus-02-15", price: [0.26, 1.56] },
};

export async function POST(req: Request) {
  if (!(await internalAuthorized(req))) return NextResponse.json({ ok: false }, { status: 401 });
  const admin = createAdminClient();
  const body = (await req.json().catch(() => ({}))) as { only?: string; tasks?: number[]; max?: number };
  const maxOut = Math.min(Math.max(Number(body.max) || 12000, 1000), 16000);
  const keys = (Object.keys(MODELS) as (keyof typeof MODELS)[]).filter((k) => !body.only || body.only === k);
  const system = getTier("senior").skillPrompt + "\nJawab dalam Bahasa Indonesia. Tanpa pencarian web: pakai pengetahuanmu dan tandai perkiraan.";
  const results = await Promise.all(
    TASKS.flatMap((task, i) =>
      (Array.isArray(body.tasks) && !body.tasks.includes(i) ? [] : keys).map(async (key) => {
        const m = MODELS[key];
        const started = Date.now();
        try {
          const out = await generateText({
            model: createFallbackModel([{ provider: m.provider, modelId: m.modelId }]).model,
            system,
            prompt: task,
            maxOutputTokens: maxOut,
            abortSignal: AbortSignal.timeout(285_000),
          });
          const inTok = out.usage.inputTokens ?? 0;
          const outTok = out.usage.outputTokens ?? 0;
          const cost = (inTok * m.price[0] + outTok * m.price[1]) / 1_000_000;
          await admin
            .from("usage_logs")
            .insert({
              user_id: null,
              tier: `abtest-${key}`,
              provider: m.provider,
              model: m.modelId,
              latency_ms: Date.now() - started,
              input_tokens: inTok,
              output_tokens: outTok,
              est_cost_usd: cost,
              credits: 0,
              status: "ok",
            });
          return { task: i, model: key, finish: out.finishReason, text: out.text, ms: Date.now() - started, inTok, outTok, cost };
        } catch (err) {
          return { task: i, model: key, text: `GAGAL: ${String(err).slice(0, 300)}`, ms: Date.now() - started, inTok: 0, outTok: 0, cost: 0 };
        }
      }),
    ),
  );
  return NextResponse.json({ ok: true, tasks: TASKS, qwenModel: MODELS.qwen.modelId, results });
}
