"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Mic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/i18n/dict";
import { voiceText } from "@/lib/i18n/voice";
import { fillerFor, speakableText, speechLang } from "@/lib/voice/speech";
import { useVoice } from "./use-voice";
import { useVad } from "./use-vad";

type Phase = "speaking" | "listening" | "transcribing" | "thinking" | "idle";

/** Jeda diam (ms) setelah user bicara sebelum ucapannya dikirim. */
const SILENCE_MS = 1200;
/** Tanpa ucapan selama ini (ms) → berhenti mendengarkan supaya mic tidak menyala terus. */
const NO_SPEECH_MS = 15000;

/**
 * Mode ngobrol suara: AI menyapa, mendengarkan user, mengirim ucapan sebagai pesan chat biasa,
 * bilang sedang mengerjakan, lalu membacakan jawabannya dan kembali mendengarkan. Ketik tetap bisa (tombol "Ketik saja").
 */
export function VoiceMode({
  lang,
  firstName,
  hasMessages,
  busy,
  reply,
  failures,
  stt,
  onSend,
  onClose,
}: {
  lang: Lang;
  firstName: string;
  hasMessages: boolean;
  busy: boolean;
  /** Jawaban AI terakhir yang sudah selesai (id berubah tiap jawaban baru). */
  reply: { id: string; text: string } | null;
  /** Bertambah setiap kali menjawab gagal. */
  failures: number;
  /** Pakai pendeteksi suara + Groq Whisper (cepat & tahan bising). */
  stt?: boolean;
  onSend: (text: string) => void;
  onClose: () => void;
}) {
  const V = voiceText(lang);
  const voice = useVoice(speechLang(lang));
  const [phase, setPhase] = useState<Phase>("speaking");
  const [said, setSaid] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const waitingReply = useRef(false);
  const fillerTalking = useRef(false);
  const pendingSpeech = useRef<string | null>(null);
  const seenReply = useRef(reply?.id ?? null);
  const seenFailures = useRef(failures);
  const sayRef = useRef<(text: string) => void>(() => {});
  const listenRef = useRef<() => void>(() => {});
  const [sttOn, setSttOn] = useState(Boolean(stt));
  const [userTalking, setUserTalking] = useState(false);
  const noSpeechTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { listen, stopListening, speak, stopSpeaking } = voice;

  const submitSpeech = useCallback(
    (text: string) => {
      setSaid(text);
      setPhase("thinking");
      waitingReply.current = true;
      onSend(text);
      fillerTalking.current = true;
      speak(fillerFor(text, lang), () => {
        fillerTalking.current = false;
        const next = pendingSpeech.current;
        pendingSpeech.current = null;
        if (next) sayRef.current(next);
      });
    },
    [onSend, speak, lang],
  );

  /**
   * Dengar dengan deteksi jeda sendiri: begitu user berhenti bicara ±1,2 detik, ucapan langsung dikirim
   * (tanpa menunggu pengenal suara browser yang di beberapa HP/tablet lambat memutuskan "selesai").
   */
  const startBrowserListening = useCallback(
    (retry = true) => {
      setHint(null);
      setSaid("");
      let heard = "";
      let live = "";
      let done = false;
      let silence: ReturnType<typeof setTimeout> | undefined;
      const startedAt = Date.now();
      const finish = () => {
        if (done) return;
        const text = `${heard} ${live}`.replace(/\s+/g, " ").trim();
        if (!text) return;
        done = true;
        clearTimeout(silence);
        stopListening();
        submitSpeech(text);
      };
      const armSilence = () => {
        clearTimeout(silence);
        if (`${heard}${live}`.trim()) silence = setTimeout(finish, SILENCE_MS);
      };
      const ok = listen({
        continuous: true,
        // Keduanya berisi kalimat utuh sesi ini (bukan potongan), jadi diganti, tidak disambung.
        onFinal: (full) => {
          heard = full;
          live = "";
          armSilence();
        },
        onInterim: (full) => {
          heard = "";
          live = full;
          if (full) setSaid(full);
          armSilence();
        },
        onEnd: (err) => {
          clearTimeout(silence);
          if (done || waitingReply.current) return;
          if (`${heard}${live}`.trim()) return finish();
          // Beberapa HP menutup mic sendiri dalam hitungan detik tanpa suara: coba sekali lagi otomatis.
          if (retry && !err && Date.now() - startedAt < 4000) return startBrowserListening(false);
          setPhase("idle");
          if (err === "denied") setHint(V.micDenied);
          else setHint(V.noSpeech);
        },
      });
      setPhase(ok ? "listening" : "idle");
      if (!ok) setHint(V.unsupported);
    },
    [listen, stopListening, submitSpeech, V],
  );

  // ── Jalur cepat: pendeteksi suara manusia di browser → Groq Whisper ──
  const vad = useVad({
    onSpeaking: (talking) => {
      setUserTalking(talking);
      if (talking) clearTimeout(noSpeechTimer.current);
    },
    onSpeech: (wav) => {
      clearTimeout(noSpeechTimer.current);
      void vad.pause();
      setPhase("transcribing");
      const form = new FormData();
      form.append("audio", wav, "speech.wav");
      form.append("lang", lang);
      void fetch("/api/voice/transcribe", { method: "POST", body: form })
        .then(async (res) => {
          if (res.status === 503) {
            setSttOn(false);
            return startBrowserListening();
          }
          const text = res.ok ? ((await res.json()) as { text?: string }).text?.trim() : "";
          if (text) submitSpeech(text);
          else listenRef.current();
        })
        .catch(() => listenRef.current());
    },
  });

  const startVadListening = useCallback(async () => {
    setHint(null);
    setSaid("");
    setPhase("listening");
    const err = await vad.start();
    if (err === "denied") {
      setPhase("idle");
      setHint(V.micDenied);
      return;
    }
    if (err) {
      setSttOn(false);
      startBrowserListening();
      return;
    }
    clearTimeout(noSpeechTimer.current);
    noSpeechTimer.current = setTimeout(() => {
      void vad.pause();
      setPhase("idle");
      setHint(V.noSpeech);
    }, NO_SPEECH_MS);
  }, [vad, V, startBrowserListening]);

  const startListening = useCallback(() => {
    if (sttOn) void startVadListening();
    else startBrowserListening();
  }, [sttOn, startVadListening, startBrowserListening]);
  useEffect(() => {
    listenRef.current = startListening;
  }, [startListening]);

  const stopAllListening = useCallback(() => {
    clearTimeout(noSpeechTimer.current);
    setUserTalking(false);
    stopListening();
    void vad.pause();
  }, [stopListening, vad]);

  const sayThenListen = useCallback(
    (text: string) => {
      setPhase("speaking");
      speak(text, () => startListening());
    },
    [speak, startListening],
  );
  useEffect(() => {
    sayRef.current = sayThenListen;
  }, [sayThenListen]);

  // Sapaan pertama (dipicu klik user, jadi browser mengizinkan suara).
  useEffect(() => {
    sayThenListen(hasMessages ? V.greetBack : V.greetNew(firstName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Jawaban baru selesai → bacakan, lalu dengarkan lagi.
  useEffect(() => {
    if (!reply || reply.id === seenReply.current) return;
    seenReply.current = reply.id;
    if (!waitingReply.current) return;
    waitingReply.current = false;
    const text = speakableText(reply.text, lang);
    if (fillerTalking.current) pendingSpeech.current = text;
    else sayThenListen(text);
  }, [reply, lang, sayThenListen]);

  // Gagal menjawab → beri tahu dengan suara, lalu dengarkan lagi.
  useEffect(() => {
    if (failures === seenFailures.current) return;
    seenFailures.current = failures;
    if (!waitingReply.current) return;
    waitingReply.current = false;
    if (fillerTalking.current) pendingSpeech.current = V.error;
    else sayThenListen(V.error);
  }, [failures, V, sayThenListen]);

  const tapOrb = () => {
    if (phase === "speaking") {
      pendingSpeech.current = null;
      fillerTalking.current = false;
      stopSpeaking();
      startListening();
    } else if (phase === "listening") {
      stopAllListening();
      setPhase("idle");
    } else if (phase === "idle") startListening();
  };

  const close = () => {
    stopAllListening();
    stopSpeaking();
    onClose();
  };

  const status =
    phase === "listening"
      ? V.listening
      : phase === "transcribing"
        ? V.processing
        : phase === "thinking" || busy
          ? V.thinking : phase === "speaking" ? V.speaking : V.paused;
  const live = voice.interim || said;

  return (
    <div className="rounded-3xl border bg-card px-4 pb-3 pt-5 shadow-sm" role="region" aria-label={V.talkTitle}>
      <div className="flex flex-col items-center text-center">
        <button
          type="button"
          onClick={tapOrb}
          aria-label={phase === "listening" ? V.stopDictate : V.paused}
          className="relative grid size-20 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {phase === "listening" && <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" />}
          {(phase === "thinking" || phase === "transcribing") && <span className="absolute -inset-1 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />}
          <span
            className={cn(
              "relative size-16 rounded-full bg-[radial-gradient(circle_at_30%_30%,#7dd3fc,#2563eb_55%,#1e3a8a)] shadow-lg transition-transform",
              phase === "speaking" && "animate-pulse",
              phase === "listening" && (userTalking ? "scale-125" : "scale-105"),
              phase === "idle" && "opacity-70",
            )}
          />
        </button>
        <p className="mt-3 text-sm font-medium">{status}</p>
        <p className="mt-1 line-clamp-2 min-h-10 max-w-md text-sm text-muted-foreground">
          {hint ?? (live ? `“${live}”` : phase === "speaking" ? V.tapToInterrupt : "")}
        </p>
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <Button variant="ghost" size="sm" className="rounded-full" onClick={close}>
          <Keyboard /> {V.typeInstead}
        </Button>
        <Button
          variant={phase === "listening" ? "default" : "outline"}
          size="icon"
          className="rounded-full"
          onClick={tapOrb}
          disabled={phase === "thinking"}
          aria-label={phase === "listening" ? V.stopDictate : V.talk}
        >
          <Mic className={cn(phase === "listening" && "animate-pulse")} />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={close} aria-label={V.end} title={V.end}>
          <X />
        </Button>
      </div>
      <p className="mt-1 text-center text-[10px] text-muted-foreground/80">{V.privacy}</p>
    </div>
  );
}
