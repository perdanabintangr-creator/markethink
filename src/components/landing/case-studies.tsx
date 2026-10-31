"use client";

import { useState } from "react";
import { Check, FileText, Megaphone, PenLine, ShoppingBag, Store } from "lucide-react";
import { BRAND_ICON } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Studi kasus (skenario penggunaan): masalah → yang ditanyakan → yang dikerjakan AI → yang didapat. */
const CASES = [
  {
    id: "umkm",
    icon: Store,
    tab: "Owner UMKM",
    who: "Kedai kopi, Bandung",
    problem: "Penjualan jam sore turun 2 minggu terakhir. Belum tahu penyebabnya, apalagi solusinya.",
    ask: "Penjualan sore kedai saya turun, bikinin strategi promo minggu ini dong.",
    work: [
      "Cek kompetitor dalam radius 1 km: ada yang baru pasang diskon 30%",
      "Baca menu & harga dari Brand Kit kedai",
      "Susun promo “Sore Produktif” tanpa perang harga",
      "Tulis caption & skrip Reels sesuai gaya bahasa brand",
    ],
    get: ["Rencana promo 7 hari", "3 skrip Reels", "7 caption siap posting", "Kalender konten"],
  },
  {
    id: "olshop",
    icon: ShoppingBag,
    tab: "Online shop",
    who: "Brand fashion di Shopee & TikTok Shop",
    problem: "Biaya iklan terus naik, tapi order tidak ikut naik. Bingung iklan mana yang harus dimatikan.",
    ask: "Iklan saya boncos, ROAS cuma 1,4. Apa yang salah dan harus diapakan?",
    work: [
      "Diagnosa iklan: hook lemah & target terlalu luas",
      "Hitung budget harian & batas biaya per order yang aman",
      "Tulis 5 variasi copy iklan untuk diuji A/B",
      "Perbaiki judul & deskripsi listing agar mudah dicari",
    ],
    get: ["Diagnosa iklan", "5 copy iklan A/B", "Kalkulator budget (Excel)", "Judul listing SEO"],
  },
  {
    id: "agency",
    icon: Megaphone,
    tab: "Agency & konsultan",
    who: "Agency digital, 6 orang",
    problem: "Besok pitching ke calon klien skincare. Tim belum sempat riset pasar dan menyusun deck.",
    ask: "Siapkan bahan pitching untuk brand skincare lokal, target Gen Z, besok jam 10.",
    work: [
      "Riset pasar & 5 kompetitor terbaru, lengkap dengan sumber",
      "Bangun persona audiens Gen Z beserta insight-nya",
      "Rancang ide kampanye 3 bulan + estimasi budget",
      "Susun semuanya jadi deck presentasi",
    ],
    get: ["Deck pitching (PPT)", "Analisis kompetitor", "Persona audiens", "Rencana kampanye 3 bulan"],
  },
  {
    id: "creator",
    icon: PenLine,
    tab: "Content creator",
    who: "Creator kuliner, 40 ribu followers",
    problem: "Kehabisan ide konten dan jadwal posting berantakan, padahal harus konsisten tiap hari.",
    ask: "Bikinin ide konten sebulan yang lagi tren, plus jadwal posting-nya.",
    work: [
      "Cari tren & topik kuliner yang sedang naik minggu ini",
      "Pilih 30 ide sesuai niche & gaya kamu",
      "Tulis hook pembuka dan skrip video pendek",
      "Atur jadwal posting di jam ramai penonton",
    ],
    get: ["30 ide konten", "Kalender 30 hari", "Skrip & hook video", "Caption + hashtag"],
  },
];

export function CaseStudies() {
  const [active, setActive] = useState(CASES[0].id);
  const c = CASES.find((x) => x.id === active) ?? CASES[0];

  return (
    <div>
      <div role="tablist" aria-label="Pilih studi kasus" className="flex flex-wrap justify-center gap-2">
        {CASES.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={x.id === active}
            onClick={() => setActive(x.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
              x.id === active
                ? "border-transparent bg-gradient-to-r from-[#0a6cff] to-[#12d0f5] text-white shadow-lg shadow-primary/25"
                : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            <x.icon className="size-4" /> {x.tab}
          </button>
        ))}
      </div>

      <div key={c.id} role="tabpanel" className="mt-8 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        {/* Masalah & pertanyaan */}
        <div className="mq-motion flex animate-[mq-in_0.5s_ease-out_both] flex-col rounded-3xl border bg-card p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">{c.who}</p>
          <p className="mt-3 text-sm font-semibold text-muted-foreground">Masalahnya</p>
          <p className="mt-1 text-lg font-medium leading-snug">{c.problem}</p>
          <div className="mt-auto pt-6">
            <p className="mb-2 text-sm font-semibold text-muted-foreground">Yang ditanyakan ke AI</p>
            <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-gradient-to-r from-[#0a6cff] to-[#12b8f5] px-4 py-3 text-sm text-white shadow-lg shadow-primary/20">
              {c.ask}
            </div>
          </div>
        </div>

        {/* Kerja AI & hasil */}
        <div className="relative overflow-hidden rounded-3xl bg-[#050b1f] p-6 text-white sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[radial-gradient(circle,rgba(18,208,245,0.25),transparent_65%)]" />
          <div className="relative flex items-center gap-2 text-sm font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND_ICON} alt="" className="size-6" /> Yang dikerjakan AI
          </div>
          <ol className="relative mt-4 space-y-3">
            {c.work.map((w, i) => (
              <li
                key={w}
                style={{ animationDelay: `${200 + i * 260}ms` }}
                className="mq-motion flex animate-[mq-in_0.45s_ease-out_both] items-start gap-3 text-sm text-white/85"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300">
                  <Check className="size-3.5" />
                </span>
                {w}
              </li>
            ))}
          </ol>
          <p className="relative mt-6 text-sm font-semibold">Yang kamu dapat</p>
          <div className="relative mt-3 grid grid-cols-2 gap-2">
            {c.get.map((g, i) => (
              <div
                key={g}
                style={{ animationDelay: `${1300 + i * 140}ms` }}
                className="mq-motion flex animate-[mq-in_0.45s_ease-out_both] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm"
              >
                <FileText className="size-4 shrink-0 text-cyan-300" />
                <span className="min-w-0">{g}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Contoh skenario penggunaan. Hasil tiap brand bisa berbeda.</p>
    </div>
  );
}
