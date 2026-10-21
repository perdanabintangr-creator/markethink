"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Mic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/i18n/dict";
import { voiceText } from "@/lib/i18n/voice";
import { fillerFor, speakableText, speechLang } from "@/lib/voice/speech";
import { useVoice } from "./use-voice";

type Phase = "speaking" | "listening" | "thinking" | "idle";

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

  const { listen, stopListening, speak, stopSpeaking } = voice;

  const startListening = useCallback(() => {
    setHint(null);
    const ok = listen({
      onFinal: (text) => {
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
      onEnd: (err) => {
        if (waitingReply.current) return;
        setPhase("idle");
        if (err === "denied") setHint(V.micDenied);
        else if (err === "no-speech") setHint(V.noSpeech);
      },
    });
    setPhase(ok ? "listening" : "idle");
    if (!ok) setHint(V.unsupported);
  }, [listen, speak, onSend, lang, V]);

  const sayThenListen = useCallback(
    (text: string) => {
      setPhase("speaking");
      speak(text, startListening);
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
      stopListening();
      setPhase("idle");
    } else if (phase === "idle") startListening();
  };

  const close = () => {
    stopListening();
    stopSpeaking();
    onClose();
  };

  const status =
    phase === "listening" ? V.listening : phase === "thinking" || busy ? V.thinking : phase === "speaking" ? V.speaking : V.paused;
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
          {phase === "thinking" && <span className="absolute -inset-1 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />}
          <span
            className={cn(
              "relative size-16 rounded-full bg-[radial-gradient(circle_at_30%_30%,#7dd3fc,#2563eb_55%,#1e3a8a)] shadow-lg transition-transform",
              phase === "speaking" && "animate-pulse",
              phase === "listening" && "scale-110",
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
