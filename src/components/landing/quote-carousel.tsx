"use client";

import { useEffect, useState } from "react";
import { Quote } from "lucide-react";

/** Kutipan tokoh marketing dunia (versi asli + terjemahan), tampil dengan efek teks "decode" digital. */
const QUOTES = [
  {
    text: "Your brand is what other people say about you when you're not in the room.",
    id: "Brand kamu adalah apa yang orang katakan tentangmu saat kamu tidak ada di ruangan.",
    by: "Jeff Bezos",
  },
  {
    text: "Marketing is no longer about the stuff that you make, but about the stories you tell.",
    id: "Marketing bukan lagi soal barang yang kamu buat, tapi cerita yang kamu sampaikan.",
    by: "Seth Godin",
  },
  {
    text: "People don't buy what you do; they buy why you do it.",
    id: "Orang tidak membeli apa yang kamu kerjakan, mereka membeli alasan kamu mengerjakannya.",
    by: "Simon Sinek",
  },
  {
    text: "The aim of marketing is to know and understand the customer so well the product or service fits him and sells itself.",
    id: "Tujuan marketing adalah memahami pelanggan begitu dalam sampai produknya cocok dan terjual dengan sendirinya.",
    by: "Peter Drucker",
  },
  {
    text: "The best marketing doesn't feel like marketing.",
    id: "Marketing terbaik tidak terasa seperti marketing.",
    by: "Tom Fishburne",
  },
];

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?";

function useDecode(target: string, enabled: boolean) {
  const [out, setOut] = useState(target);
  useEffect(() => {
    if (!enabled) return setOut(target);
    let frame = 0;
    const total = 28;
    const t = setInterval(() => {
      frame += 1;
      const done = Math.floor((frame / total) * target.length);
      setOut(
        target
          .split("")
          .map((ch, i) => (i < done || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(""),
      );
      if (frame >= total) {
        clearInterval(t);
        setOut(target);
      }
    }, 30);
    return () => clearInterval(t);
  }, [target, enabled]);
  return out;
}

export function QuoteCarousel() {
  const [i, setI] = useState(0);
  const [motion, setMotion] = useState(false);
  useEffect(() => {
    const ok = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMotion(ok);
    const t = setInterval(() => setI((x) => (x + 1) % QUOTES.length), 7000);
    return () => clearInterval(t);
  }, []);
  const q = QUOTES[i];
  const text = useDecode(q.text, motion);

  return (
    <figure className="relative mx-auto max-w-4xl text-center">
      <Quote className="mx-auto size-10 text-cyan-300/70" />
      <blockquote className="mt-6 min-h-[7.5rem] font-brand text-2xl font-extrabold leading-snug tracking-tight text-white sm:min-h-[6rem] sm:text-4xl">
        “{text}”
      </blockquote>
      <p key={`id-${i}`} className="mx-auto mt-4 max-w-2xl animate-[mq-in_.8s_ease-out_both] text-white/60">
        {q.id}
      </p>
      <figcaption key={`by-${i}`} className="mt-5 animate-[mq-in_.8s_.2s_ease-out_both] text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
        {q.by}
      </figcaption>
      <div className="mt-8 flex justify-center gap-2">
        {QUOTES.map((x, n) => (
          <button
            key={x.by}
            type="button"
            aria-label={`Kutipan ${x.by}`}
            onClick={() => setI(n)}
            className={`h-1.5 rounded-full transition-all ${n === i ? "w-8 bg-cyan-300" : "w-2.5 bg-white/25 hover:bg-white/50"}`}
          />
        ))}
      </div>
    </figure>
  );
}
