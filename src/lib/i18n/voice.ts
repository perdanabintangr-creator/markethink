import type { Lang } from "./dict";

/** Teks mode ngobrol suara & tombol mikrofon. ID + EN. */

const id = {
  talk: "Ngobrol",
  talkTitle: "Ngobrol pakai suara",
  dictate: "Ketik pakai suara",
  stopDictate: "Berhenti mendengarkan",
  unsupported: "Browser ini belum mendukung suara. Coba pakai Chrome, Edge, atau Safari terbaru.",
  micDenied: "Izin mikrofon ditolak. Aktifkan mikrofon untuk situs ini di pengaturan browser.",
  noSpeech: "Saya tidak mendengar apa-apa. Ketuk lingkaran untuk bicara lagi.",
  greetNew: (name: string) =>
    name ? `Halo ${name}! Mau bahas marketing apa hari ini?` : "Halo! Mau bahas marketing apa hari ini?",
  greetBack: "Oke, saya dengarkan. Mau lanjut bahas apa?",
  listening: "Mendengarkan...",
  thinking: "Sedang mengerjakan...",
  speaking: "Sedang bicara...",
  paused: "Ketuk lingkaran untuk bicara",
  tapToInterrupt: "Ketuk lingkaran untuk memotong & bicara",
  typeInstead: "Ketik saja",
  end: "Selesai ngobrol",
  error: "Maaf, ada kendala saat menjawab. Coba ulangi sekali lagi ya.",
  homeCta: "Ngobrol langsung",
  homeHint: "Ceritakan kebutuhan marketingmu pakai suara, AI akan menjawab sambil bicara.",
  privacy: "Suara diubah jadi teks oleh layanan pengenal suara bawaan browser kamu.",
};

const en: typeof id = {
  talk: "Talk",
  talkTitle: "Talk with voice",
  dictate: "Dictate",
  stopDictate: "Stop listening",
  unsupported: "This browser doesn't support voice yet. Try the latest Chrome, Edge, or Safari.",
  micDenied: "Microphone permission was denied. Allow the microphone for this site in your browser settings.",
  noSpeech: "I didn't hear anything. Tap the circle to speak again.",
  greetNew: (name: string) => (name ? `Hi ${name}! What marketing should we work on today?` : "Hi! What marketing should we work on today?"),
  greetBack: "Okay, I'm listening. What should we talk about next?",
  listening: "Listening...",
  thinking: "Working on it...",
  speaking: "Speaking...",
  paused: "Tap the circle to speak",
  tapToInterrupt: "Tap the circle to interrupt & speak",
  typeInstead: "Type instead",
  end: "End conversation",
  error: "Sorry, something went wrong while answering. Please try once more.",
  homeCta: "Talk now",
  homeHint: "Describe your marketing needs out loud, and the AI answers while speaking.",
  privacy: "Your voice is turned into text by your browser's built-in speech service.",
};

export const voiceText = (lang: Lang | null | undefined) => (lang === "en" ? en : id);
