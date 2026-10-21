import "server-only";

/**
 * Suara → teks lewat Groq Whisper (cepat & murah, ±US$0,04 per jam audio, minimal ditagih 10 detik per permintaan).
 * Aktif hanya bila founder menyetel VOICE_STT=groq + GROQ_API_KEY di Vercel (berbayar, butuh ACC).
 */
export const STT_MODEL = "whisper-large-v3-turbo";

export const sttEnabled = () => process.env.VOICE_STT?.trim() === "groq" && Boolean(process.env.GROQ_API_KEY?.trim());

// Kosakata marketing membantu Whisper menulis istilah dengan benar.
const PROMPT = {
  id: "Percakapan marketing: strategi konten, Instagram, TikTok, reels, caption, campaign, brand, PPT, carousel, iklan, UMKM.",
  en: "Marketing conversation: content strategy, Instagram, TikTok, reels, captions, campaign, brand, slides, carousel, ads.",
};

// Kalimat "hantu" yang sering ditulis Whisper dari suara bising/hening.
const HALLUCINATIONS = [
  /terima kasih (telah|sudah) menonton/i,
  /jangan lupa (like|subscribe)/i,
  /thanks? (you )?for watching/i,
  /subtitles? by/i,
  /^(terima kasih|thank you)[.!]?$/i,
  /amara\.org/i,
  /^\W*(\[|\()?(music|musik|applause|tepuk tangan|♪)/i,
];

/** Segmen yang menurut Whisper sendiri kemungkinan besar bukan ucapan (musik, bising) dibuang. */
export interface SttSegment {
  text: string;
  no_speech_prob?: number;
  avg_logprob?: number;
}
export function keepSegments(segments: SttSegment[]) {
  return segments
    .filter((s) => (s.no_speech_prob ?? 0) < 0.6 && (s.avg_logprob ?? 0) > -1.0)
    .map((s) => s.text)
    .join(" ");
}

export function cleanTranscript(text: string) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t || t.length < 2) return "";
  if (HALLUCINATIONS.some((re) => re.test(t))) return "";
  if (!/[\p{L}\p{N}]/u.test(t)) return "";
  return t;
}

export async function transcribe(audio: Blob, lang: "id" | "en") {
  const form = new FormData();
  form.append("file", audio, "speech.wav");
  form.append("model", STT_MODEL);
  form.append("language", lang);
  form.append("temperature", "0");
  form.append("response_format", "verbose_json");
  form.append("prompt", PROMPT[lang]);
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY?.trim()}` },
    body: form,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`groq stt ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { text?: string; segments?: SttSegment[] };
  return cleanTranscript(data.segments ? keepSegments(data.segments) : (data.text ?? ""));
}
