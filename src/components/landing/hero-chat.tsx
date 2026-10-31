"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { BRAND_ICON } from "@/lib/brand";

/** Demo hidup di hero: pertanyaan diketik, lalu jawaban AI muncul baris demi baris (berganti-ganti). */
const DEMOS = [
  {
    q: "Penjualan sore kafe saya turun 2 minggu ini, kenapa ya?",
    a: ["Kompetitor terdekat pasang diskon 30% sejak 15 Okt.", "Jangan perang harga: jual suasana sore (colokan, wifi).", "Rencana 7 hari + 3 ide Reels sudah saya siapkan."],
  },
  {
    q: "Bikinin 3 caption IG buat promo beli 2 gratis 1.",
    a: ["1. “Ngopi sendiri? Mubazir. Ajak dua temanmu!”", "2. “Beli 2 gratis 1, cuma sampai Jumat.”", "3. “Tim kopi susu atau gula aren? Bawa dua-duanya.”"],
  },
  {
    q: "Berapa budget iklan Meta biar dapat 100 order sebulan?",
    a: ["Asumsi CPC Rp900, konversi 2,5%.", "Butuh ±4.000 klik ≈ Rp3,6 jt/bulan (Rp120rb/hari).", "Mulai Rp60rb/hari, naikkan ke iklan yang ROAS-nya > 3."],
  },
];

export function HeroChat() {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");
  const [lines, setLines] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const d = DEMOS[i];
    if (reduce) {
      setTyped(d.q);
      setLines(d.a.length);
      return;
    }
    setTyped("");
    setLines(0);
    let k = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const type = setInterval(() => {
      k += 1;
      setTyped(d.q.slice(0, k));
      if (k >= d.q.length) {
        clearInterval(type);
        d.a.forEach((_, n) => timers.push(setTimeout(() => setLines(n + 1), 700 + n * 650)));
        timers.push(setTimeout(() => setI((x) => (x + 1) % DEMOS.length), 700 + d.a.length * 650 + 2600));
      }
    }, 32);
    return () => {
      clearInterval(type);
      timers.forEach(clearTimeout);
    };
  }, [i]);

  const d = DEMOS[i];
  return (
    <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-4 text-left shadow-2xl shadow-cyan-500/10 backdrop-blur-xl sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-xs text-white/50">
        <span className="size-2.5 rounded-full bg-red-400/70" />
        <span className="size-2.5 rounded-full bg-amber-300/70" />
        <span className="size-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2">Tanya dulu, baru jualan.</span>
      </div>
      <div className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-gradient-to-r from-[#0a6cff] to-[#0bb5f5] px-3.5 py-2.5 text-sm text-white">
        {typed}
        <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-white/80 align-baseline" />
      </div>
      <div className="mt-4 flex gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_ICON} alt="" className="mt-0.5 size-7 shrink-0" />
        <div className="min-h-[5.5rem] flex-1 space-y-1.5 text-sm text-white/85">
          {lines === 0 && typed.length === d.q.length && (
            <p className="flex items-center gap-1.5 text-white/50">
              <Sparkles className="size-3.5 animate-spin [animation-duration:3s]" /> Marqthink sedang berpikir…
            </p>
          )}
          {d.a.slice(0, lines).map((l) => (
            <p key={l} className="animate-[mq-in_.45s_ease-out_both]">
              {l}
            </p>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-1.5">
        {DEMOS.map((_, n) => (
          <span key={n} className={`h-1 rounded-full transition-all ${n === i ? "w-6 bg-cyan-300" : "w-2 bg-white/20"}`} />
        ))}
      </div>
    </div>
  );
}
