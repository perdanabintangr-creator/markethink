"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Brain, CalendarDays, Check, Loader2, Mic, Palette, Search, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GlowCard } from "@/components/landing/glow-card";
import { Reveal } from "@/components/landing/reveal";
import { BRAND_ICON } from "@/lib/brand";
import { cn } from "@/lib/utils";

const IN = "mq-motion animate-[mq-in_0.45s_ease-out_both]";
const at = (ms: number) => ({ animationDelay: `${ms}ms` });

type Feature = {
  id: string;
  icon: typeof Brain;
  title: string;
  desc: string;
  ask: string;
  href: string;
  preview: () => React.ReactNode;
};

const FEATURES: Feature[] = [
  {
    id: "chat",
    icon: Brain,
    title: "Chat otak marketing",
    desc: "Ngobrol seperti dengan CMO, dijawab dengan konteks brand kamu.",
    ask: "Kenapa engagement IG saya turun bulan ini?",
    href: "/chat",
    preview: () => (
      <AiList
        items={[
          "Jam posting bergeser ke 21.00, padahal audiens kamu paling aktif 12.00 & 19.00.",
          "4 dari 6 konten terakhir hard selling, tanpa konten edukasi atau hiburan.",
          "Saran: pola 3 edukasi : 1 jualan, dan uji hook di 3 detik pertama Reels.",
        ]}
      />
    ),
  },
  {
    id: "tools",
    icon: Wrench,
    title: "24 Smart Tools",
    desc: "Marketing plan, riset kompetitor, copy iklan, kalender konten, audit IG, dan lainnya.",
    ask: "Pilih tool, isi form singkat 1 menit, hasil lengkap langsung jadi.",
    href: "/tools",
    preview: () => (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {["Marketing plan", "Riset kompetitor", "Copy iklan", "Kalender konten", "Audit Instagram", "Kalkulator iklan", "Persona audiens", "Skrip video", "Listing marketplace"].map((t, i) => (
          <div key={t} style={at(i * 70)} className={cn(IN, "flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-xs font-medium")}>
            <Sparkles className="size-3.5 shrink-0 text-primary" /> {t}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "agent",
    icon: Bot,
    title: "Marqthink Agent",
    desc: "Satu tujuan, beberapa tools jalan otomatis sampai jadi paket kerja.",
    ask: "Tujuan: launching sambal kemasan baru bulan depan.",
    href: "/tools/agent",
    preview: () => (
      <ol className="space-y-2">
        {["Riset pasar sambal kemasan", "Persona pembeli", "Strategi peluncuran", "Kalender konten 30 hari", "Copy iklan peluncuran"].map((s, i, arr) => (
          <li key={s} style={at(i * 300)} className={cn(IN, "flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-sm")}>
            {i < arr.length - 1 ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                <Check className="size-3.5" />
              </span>
            ) : (
              <Loader2 className="size-5 animate-spin text-primary" />
            )}
            <span className="flex-1">{s}</span>
            <span className="text-xs text-muted-foreground">{i < arr.length - 1 ? "Selesai" : "Berjalan"}</span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    id: "research",
    icon: Search,
    title: "Riset web ber-sumber",
    desc: "Tren, harga, dan kompetitor terbaru dengan link sumber yang bisa dicek.",
    ask: "Berapa harga rata-rata skincare serum lokal sekarang?",
    href: "/chat?research=1",
    preview: () => (
      <div className="space-y-2">
        <div style={at(0)} className={cn(IN, "rounded-xl border bg-card p-3 text-sm")}>
          Serum lokal populer dijual di kisaran <b>Rp45–120 ribu</b>
          <sup className="text-primary">[1]</sup>, dengan segmen terlaris di <b>Rp60–90 ribu</b>
          <sup className="text-primary">[2]</sup>.
        </div>
        {["Data harga marketplace", "Artikel tren skincare 2026", "Ulasan produk kompetitor"].map((s, i) => (
          <div key={s} style={at(300 + i * 150)} className={cn(IN, "flex items-center gap-2 text-xs text-muted-foreground")}>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">[{i + 1}]</span> {s}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "brandkit",
    icon: Palette,
    title: "Brand Kit per project",
    desc: "Logo, warna, gaya bahasa & produk: semua jawaban konsisten dengan brand.",
    ask: "Sekali isi Brand Kit, semua jawaban AI otomatis ikut gaya brand kamu.",
    href: "/workspaces",
    preview: () => (
      <div style={at(0)} className={cn(IN, "rounded-xl border bg-card p-4")}>
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-700 font-brand text-lg font-black text-white">KS</span>
          <div>
            <p className="font-semibold">Kopi Senja</p>
            <p className="text-xs text-muted-foreground">Kedai kopi · Bandung</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {["#3b1d0e", "#8a4b1f", "#f0a04b", "#fff4e6"].map((c) => (
            <span key={c} className="h-8 flex-1 rounded-lg border" style={{ background: c }} />
          ))}
        </div>
        <div className="mt-4 grid gap-1.5 text-sm">
          <p>
            <span className="text-muted-foreground">Gaya bahasa:</span> santai, akrab, panggil “kak”
          </p>
          <p>
            <span className="text-muted-foreground">Produk unggulan:</span> Kopi susu gula aren, Croffle
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "calendar",
    icon: CalendarDays,
    title: "Kalender konten",
    desc: "Jadwal posting otomatis, satu klik masuk Google Calendar.",
    ask: "Bikinin jadwal posting IG & TikTok untuk 2 minggu.",
    href: "/tools/calendar",
    preview: () => (
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} style={at(i * 50)} className={cn(IN, "min-h-16 rounded-lg border bg-card p-1.5")}>
            <p className="text-[10px] text-muted-foreground">{i + 1}</p>
            {i % 3 !== 2 && (
              <span className={cn("mt-1 block truncate rounded px-1 py-0.5 text-[9px] font-medium", i % 2 ? "bg-pink-500/12 text-pink-700 dark:text-pink-300" : "bg-slate-500/15 text-slate-700 dark:text-slate-200")}>
                {i % 2 ? "IG" : "TikTok"}
              </span>
            )}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "design",
    icon: Sparkles,
    title: "Desain & kirim ke Canva",
    desc: "Carousel, poster, foto produk studio, langsung lanjut edit di Canva.",
    ask: "Buatkan carousel IG 3 slide: tips memilih biji kopi.",
    href: "/chat?draft=" + encodeURIComponent("Buatkan carousel Instagram 5 slide tentang [topik] untuk [brand], target [audiens]."),
    preview: () => (
      <div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["3 tips pilih", "biji kopi ☕"],
            ["1. Cek tanggal", "roasting"],
            ["Simpan &", "follow!"],
          ].map(([a, b], i) => (
            <div
              key={a}
              style={at(i * 200)}
              className={cn(IN, "flex aspect-[4/5] flex-col justify-end rounded-xl bg-[linear-gradient(160deg,#3b1d0e,#8a4b1f_60%,#f0a04b)] p-2.5 text-white")}
            >
              <p className="font-brand text-sm font-black leading-tight">{a}</p>
              <p className="text-xs opacity-90">{b}</p>
            </div>
          ))}
        </div>
        <div style={at(700)} className={cn(IN, "mt-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium")}>
          <Palette className="size-3.5 text-primary" /> Edit lanjut di Canva
        </div>
      </div>
    ),
  },
  {
    id: "voice",
    icon: Mic,
    title: "Ngobrol pakai suara",
    desc: "Diskusi strategi sambil jalan: bicara, AI menjawab dengan suara.",
    ask: "“Ide promo buat tanggal kembar 12.12 apa ya?”",
    href: "/chat",
    preview: () => (
      <div className="space-y-3">
        <div className="flex h-16 items-center justify-center gap-1 rounded-xl border bg-card">
          {Array.from({ length: 28 }, (_, i) => (
            <span
              key={i}
              className="mq-motion h-10 w-1 origin-center animate-[mq-wave_1.1s_ease-in-out_infinite] rounded-full bg-gradient-to-t from-[#0a6cff] to-[#12d0f5]"
              style={{ animationDelay: `${(i % 7) * 120}ms` }}
            />
          ))}
        </div>
        <AiList items={["Flash sale jam 12.12 siang, 12 menit saja.", "Bundling “paket berdua” untuk dibagi ke teman."]} />
      </div>
    ),
  },
];

function AiList({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.map((t, i) => (
        <div key={t} style={at(i * 250)} className={cn(IN, "flex gap-2.5 rounded-xl border bg-card p-3 text-sm")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND_ICON} alt="" className="mt-0.5 size-4 shrink-0" />
          {t}
        </div>
      ))}
    </div>
  );
}

/** Kartu fitur: klik → contoh nyata fitur tsb + tombol langsung mencoba. */
export function FeatureExplorer({ loggedIn }: { loggedIn: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const f = FEATURES.find((x) => x.id === openId) ?? null;
  const tryHref = (href: string) => (loggedIn ? href : `/register?next=${encodeURIComponent(href)}`);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((x, i) => (
          <Reveal key={x.id} delay={(i % 4) * 90}>
            <button type="button" onClick={() => setOpenId(x.id)} className="block h-full w-full rounded-3xl text-left focus-visible:outline-2 focus-visible:outline-primary">
              <GlowCard className="flex h-full flex-col p-6">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <x.icon className="size-5" />
                </span>
                <h3 className="mt-5 font-semibold">{x.title}</h3>
                <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{x.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Lihat contoh <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </GlowCard>
            </button>
          </Reveal>
        ))}
      </div>

      <Dialog open={f !== null} onOpenChange={(v) => !v && setOpenId(null)}>
        <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
          {f && (
            <>
              <DialogHeader className="border-b bg-muted/40 p-6 pb-5">
                <div className="flex items-center gap-3 pr-6">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0a6cff] to-[#12d0f5] text-white shadow-lg shadow-primary/25">
                    <f.icon className="size-5" />
                  </span>
                  <div className="min-w-0 text-left">
                    <DialogTitle className="font-brand text-lg font-black">{f.title}</DialogTitle>
                    <DialogDescription>{f.desc}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div key={f.id} className="space-y-4 p-6">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contoh</p>
                  <div className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-gradient-to-r from-[#0a6cff] to-[#12b8f5] px-4 py-2.5 text-sm text-white">{f.ask}</div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hasilnya</p>
                  {f.preview()}
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:justify-end">
                {!loggedIn && (
                  <Button asChild variant="ghost">
                    <Link href="/harga">Lihat harga</Link>
                  </Button>
                )}
                <Button asChild className="bg-gradient-to-r from-[#0a6cff] to-[#12d0f5] text-white hover:opacity-90">
                  <Link href={tryHref(f.href)}>
                    {loggedIn ? "Buka fitur ini" : "Coba gratis sekarang"} <ArrowRight />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
