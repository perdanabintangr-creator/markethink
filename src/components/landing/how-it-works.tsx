"use client";

import { useEffect, useState } from "react";
import { BarChart3, CalendarDays, Check, FileSpreadsheet, FileText, Globe, Heart, Mic, Paperclip, Presentation, Send, Target } from "lucide-react";
import { BRAND_ICON } from "@/lib/brand";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: "01", title: "Tanya", desc: "Ceritakan kebutuhanmu dengan bahasa sehari-hari, bisa juga lewat suara." },
  { n: "02", title: "Riset", desc: "AI membaca Brand Kit, file, dan riset web terbaru dengan sumber." },
  { n: "03", title: "Strategi", desc: "Rencana, angle, dan angka yang masuk akal untuk brand kamu." },
  { n: "04", title: "Eksekusi", desc: "Caption, iklan, kalender, PPT, desain: siap dipakai hari ini." },
];
const STEP_MS = 6500;

/** Animasi masuk bertahap untuk isi visual. */
const IN = "mq-motion animate-[mq-in_0.45s_ease-out_both]";
const at = (ms: number) => ({ animationDelay: `${ms}ms` });

/** Cara kerja: 4 langkah, tiap langkah menampilkan contoh hasil visualnya (berganti otomatis, bisa diklik). */
export function HowItWorks() {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(t);
  }, [step, auto]);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {STEPS.map((s, i) => (
          <button
            key={s.n}
            type="button"
            onClick={() => {
              setStep(i);
              setAuto(false);
            }}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-4 text-left transition-all sm:p-5",
              i === step ? "border-primary/40 bg-card shadow-xl shadow-primary/10" : "bg-card/50 hover:bg-card",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full font-brand text-xs font-black transition-colors",
                  i === step ? "bg-gradient-to-br from-[#0a6cff] to-[#12d0f5] text-white shadow-lg shadow-primary/25" : "bg-muted text-muted-foreground",
                )}
              >
                {s.n}
              </span>
              <div className="min-w-0">
                <p className="font-brand text-lg font-black">{s.title}</p>
                <p className={cn("text-sm text-muted-foreground", i !== step && "hidden sm:block")}>{s.desc}</p>
              </div>
            </div>
            {i === step && auto && (
              <span
                key={step}
                className="mq-motion absolute bottom-0 left-0 h-0.5 w-full origin-left animate-[mq-grow_linear_both] bg-gradient-to-r from-[#0a6cff] to-[#12d0f5]"
                style={{ animationDuration: `${STEP_MS}ms` }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-[#050b1f] p-4 text-white shadow-2xl shadow-primary/10 sm:p-6">
        <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-[radial-gradient(circle,rgba(10,108,255,0.35),transparent_65%)]" />
        <div className="relative mb-4 flex items-center gap-2 text-xs text-white/50">
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-amber-300/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-2">
            Langkah {STEPS[step].n} · {STEPS[step].title}
          </span>
        </div>
        <div key={step} className="relative min-h-[22rem]">
          {step === 0 && <AskVisual />}
          {step === 1 && <ResearchVisual />}
          {step === 2 && <StrategyVisual />}
          {step === 3 && <ExecuteVisual />}
        </div>
      </div>
    </div>
  );
}

function AskVisual() {
  return (
    <div className="flex h-full min-h-[22rem] flex-col justify-end gap-3">
      <div style={at(100)} className={cn(IN, "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-[#0a6cff] to-[#12b8f5] px-4 py-3 text-sm")}>
        Penjualan sore kedai saya turun, bikinin strategi promo minggu ini dong.
      </div>
      <div style={at(500)} className={cn(IN, "ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white/75")}>
        <Paperclip className="size-3.5" /> menu-kopi-senja.pdf
      </div>
      <div style={at(900)} className={cn(IN, "mt-4 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 p-2 pl-4")}>
        <span className="flex-1 text-sm text-white/40">Tanya apa saja soal marketing…</span>
        <span className="relative flex size-9 items-center justify-center rounded-full bg-white/10 text-cyan-300">
          <span className="mq-motion absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
          <Mic className="size-4" />
        </span>
        <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-r from-[#0a6cff] to-[#12d0f5]">
          <Send className="size-4" />
        </span>
      </div>
      <p style={at(1200)} className={cn(IN, "text-center text-xs text-white/40")}>
        Ketik, lampirkan file, atau cukup bicara.
      </p>
    </div>
  );
}

function ResearchVisual() {
  const reads = [
    { icon: Target, label: "Brand Kit “Kopi Senja”", note: "menu, harga, gaya bahasa" },
    { icon: FileText, label: "menu-kopi-senja.pdf", note: "24 menu terbaca" },
    { icon: Globe, label: "Riset web terbaru", note: "4 kompetitor dalam 1 km" },
  ];
  const sources = ["Ulasan & promo kompetitor", "Harga kopi susu di sekitar", "Tren nongkrong sore 2026"];
  return (
    <div className="space-y-3">
      <div style={at(0)} className={cn(IN, "flex items-center gap-2 text-sm text-white/70")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_ICON} alt="" className="size-5" /> Sedang membaca & meriset…
      </div>
      {reads.map((r, i) => (
        <div
          key={r.label}
          style={at(250 + i * 450)} className={cn(IN, "flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5")}
        >
          <r.icon className="size-4 shrink-0 text-cyan-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{r.label}</p>
            <p className="text-xs text-white/50">{r.note}</p>
          </div>
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
            <Check className="size-3.5" />
          </span>
        </div>
      ))}
      <div style={at(1700)} className={cn(IN, "rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-3")}>
        <p className="text-sm">
          Temuan: kompetitor terdekat pasang <b className="text-cyan-300">diskon 30%</b> sejak 15 Okt, tepat saat penjualan sore kamu turun.
          <sup className="ml-0.5 text-cyan-300">[1]</sup>
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {sources.map((s, i) => (
            <span key={s} className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
              [{i + 1}] {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StrategyVisual() {
  const budget = [
    { label: "Reels & TikTok", pct: 50 },
    { label: "Story ads lokal", pct: 30 },
    { label: "Broadcast WA pelanggan", pct: 20 },
  ];
  return (
    <div className="space-y-3">
      <div style={at(0)} className={cn(IN, "rounded-xl border border-white/10 bg-white/5 p-4")}>
        <p className="text-xs uppercase tracking-widest text-white/50">Strategi minggu ini</p>
        <p className="mt-1 font-brand text-xl font-black">“Sore Produktif”</p>
        <p className="mt-1 text-sm text-white/70">Jangan perang harga. Jual suasana sore: colokan, wifi kencang, bundling kopi + snack.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div style={at(400)} className={cn(IN, "rounded-xl border border-white/10 bg-white/5 p-3")}>
          <p className="flex items-center gap-1.5 text-xs text-white/50">
            <Target className="size-3.5" /> Target
          </p>
          <p className="mt-1 text-sm font-medium">Mahasiswa & pekerja remote</p>
          <p className="text-xs text-white/50">15.00 – 18.00</p>
        </div>
        <div style={at(600)} className={cn(IN, "rounded-xl border border-white/10 bg-white/5 p-3")}>
          <p className="flex items-center gap-1.5 text-xs text-white/50">
            <BarChart3 className="size-3.5" /> Target hasil
          </p>
          <p className="mt-1 font-brand text-2xl font-black text-cyan-300">+25%</p>
          <p className="text-xs text-white/50">transaksi sore / minggu</p>
        </div>
      </div>
      <div style={at(800)} className={cn(IN, "rounded-xl border border-white/10 bg-white/5 p-4")}>
        <p className="mb-3 text-xs text-white/50">Pembagian budget Rp700 ribu</p>
        <div className="space-y-2.5">
          {budget.map((b, i) => (
            <div key={b.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span>{b.label}</span>
                <span className="text-white/60">{b.pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="mq-motion h-full origin-left animate-[mq-grow_0.9s_ease-out_both] rounded-full bg-gradient-to-r from-[#0a6cff] to-[#12d0f5]"
                  style={{ width: `${b.pct}%`, animationDelay: `${1000 + i * 200}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExecuteVisual() {
  const files = [
    { icon: CalendarDays, label: "Kalender 7 hari" },
    { icon: Presentation, label: "Rencana.pptx" },
    { icon: FileSpreadsheet, label: "Budget.xlsx" },
  ];
  const week = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
      <div style={at(0)} className={cn(IN, "overflow-hidden rounded-xl border border-white/10 bg-white text-[#050b1f]")}>
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold">
          <span className="size-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-700" /> kopisenja.bdg
        </div>
        <div className="relative flex aspect-square flex-col justify-end bg-[linear-gradient(135deg,#3b1d0e,#8a4b1f_55%,#f0a04b)] p-4 text-white">
          <span className="absolute right-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-[10px] backdrop-blur">1/5</span>
          <p className="font-brand text-2xl font-black leading-tight">Sore Produktif ☕</p>
          <p className="text-sm opacity-90">Kopi + snack, colokan di tiap meja.</p>
        </div>
        <div className="space-y-1 px-3 py-2.5 text-xs">
          <Heart className="size-4" />
          <p>
            <b>kopisenja.bdg</b> Deadline numpuk? Kerjain di sini aja, kopinya kami yang urus. Bundling sore mulai 15.00 ✨
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div style={at(400)} className={cn(IN, "rounded-xl border border-white/10 bg-white/5 p-3")}>
          <p className="mb-2 text-xs text-white/50">Jadwal posting</p>
          <div className="grid grid-cols-7 gap-1 text-center">
            {week.map((d, i) => (
              <div key={d} className="rounded-md bg-white/5 py-1.5">
                <p className="text-[10px] text-white/50">{d}</p>
                <span
                  className={cn(
                    "mx-auto mt-1 block size-2 rounded-full",
                    i === 5 ? "bg-white/15" : i % 2 ? "bg-pink-400" : "bg-cyan-300",
                  )}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-3 text-[10px] text-white/60">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-cyan-300" /> Reels
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-pink-400" /> Carousel
            </span>
          </div>
        </div>
        {files.map((f, i) => (
          <div
            key={f.label}
            style={at(700 + i * 250)} className={cn(IN, "flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm")}
          >
            <f.icon className="size-4 text-cyan-300" />
            <span className="flex-1">{f.label}</span>
            <span className="text-xs text-emerald-300">Siap</span>
          </div>
        ))}
      </div>
    </div>
  );
}
