import Link from "next/link";
import { ArrowRight, Bot, Check, FileOutput, Palette, Search, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/landing/border-beam";
import { CaseStudies } from "@/components/landing/case-studies";
import { FeatureExplorer } from "@/components/landing/feature-explorer";
import { HeroChat } from "@/components/landing/hero-chat";
import { HowItWorks } from "@/components/landing/how-it-works";
import { NeuralField } from "@/components/landing/neural-field";
import { QAdvantages } from "@/components/landing/q-advantages";
import { QuotePopup } from "@/components/landing/quote-popup";
import { Reveal } from "@/components/landing/reveal";
import { RotatingTagline } from "@/components/landing/rotating-tagline";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { getSession } from "@/lib/auth";
import { BRAND, BRAND_ICON } from "@/lib/brand";
import { isSupabaseConfigured } from "@/lib/env";

/** Kata-kata marketing yang berjalan di bagian bawah hero (dua baris, arah berlawanan). */
const wordsA = ["Brand awareness", "Positioning", "Storytelling", "Insight", "Engagement", "Loyalty"];
const wordsB = ["Konversi", "Copywriting", "Funnel", "ROAS", "Viral", "Repeat order"];

/** Bedanya Marqthink dengan AI chat umum. */
const compare = [
  { icon: Palette, topic: "Kenal brand kamu", other: "Harus jelasin ulang brand kamu di tiap chat.", ours: "Brand Kit & memori project: sekali isi, selalu ingat." },
  { icon: Search, topic: "Data & sumber", other: "Jawaban umum, sering tanpa sumber.", ours: "Riset web terbaru dengan link sumber, konteks pasar Indonesia." },
  { icon: FileOutput, topic: "Bentuk hasil", other: "Teks panjang yang harus dirapikan sendiri.", ours: "Siap pakai: PPT, Excel, kalender konten, desain Canva." },
  { icon: Wrench, topic: "Cara pakai", other: "Harus pintar menulis prompt.", ours: "24 Smart Tools: isi form singkat, langsung jadi." },
  { icon: Bot, topic: "Cara kerja", other: "Satu pertanyaan, satu jawaban.", ours: "Agent menjalankan beberapa tools sampai jadi paket kerja." },
];

export default async function LandingPage() {
  const { user } = isSupabaseConfigured() ? await getSession() : { user: null };
  const cta = user ? "/dashboard" : "/register";

  return (
    <div className="min-h-dvh overflow-x-clip">
      <SiteHeader loggedIn={Boolean(user)} />

      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative isolate overflow-hidden bg-[#050b1f] text-white">
        {/* Pop-up kata-kata marketing: hanya di bagian atas, ikut tergulung saat scroll */}
        <QuotePopup />
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(10,108,255,0.35),transparent_60%)]" />
        <div className="pointer-events-none absolute -bottom-40 -right-20 -z-10 size-[34rem] rounded-full bg-[radial-gradient(circle,rgba(18,208,245,0.22),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <NeuralField className="-z-10 opacity-70" />

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-14 pt-36 sm:pt-32 lg:grid-cols-[1.1fr_1fr]">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              <span className="size-1.5 animate-pulse rounded-full bg-cyan-300" /> Mulai gratis · upgrade mulai Rp60 ribu/bulan
            </span>
            <h1 className="mt-6 font-brand text-5xl font-black leading-[1.02] tracking-tight sm:text-7xl">
              Think like
              <br />
              <span className="mq-motion animate-[mq-shimmer_6s_linear_infinite] bg-[linear-gradient(90deg,#3b8bff,#12b8f5,#5ef0ff,#ffffff,#5ef0ff,#12b8f5,#3b8bff)] bg-[length:200%_auto] bg-clip-text text-transparent">
                a brand.
              </span>
            </h1>
            <p className="mt-5 text-lg font-medium text-white/90 sm:text-xl">Otak marketing untuk brand kamu.</p>
            <p className="mx-auto mt-3 max-w-xl text-white/60 lg:mx-0">
              Setiap brand butuh otak yang berpikir untuknya. {BRAND} meriset, menyusun strategi, dan mengeksekusi konten
              marketing kamu, khusus untuk pasar Indonesia.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-[#0a6cff] to-[#12d0f5] px-7 text-base text-white shadow-xl shadow-cyan-500/25 hover:opacity-90">
                <Link href={cta}>
                  Mulai gratis sekarang <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-white/20 bg-transparent px-7 text-base text-white hover:bg-white/10 hover:text-white">
                <a href="#studi-kasus">Lihat studi kasus</a>
              </Button>
            </div>
          </div>

          <div className="relative flex justify-center">
            {/* Emblem Q berputar di belakang demo */}
            <div className="pointer-events-none absolute -right-4 -top-24 hidden size-36 xl:-right-16 xl:block">
              <div className="mq-motion absolute inset-0 animate-[mq-orbit_14s_linear_infinite] rounded-full border border-dashed border-cyan-300/30" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRAND_ICON} alt="" className="mq-motion absolute inset-6 animate-[mq-float_5s_ease-in-out_infinite] drop-shadow-[0_0_30px_rgba(18,208,245,0.45)]" />
            </div>
            <BorderBeam className="w-full max-w-md shadow-2xl shadow-cyan-500/15">
              <HeroChat />
            </BorderBeam>
          </div>
        </div>

        {/* Kata-kata marketing berjalan: menyatu dengan hero */}
        <div aria-hidden className="relative pb-10 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
          <div className="mq-motion flex w-max animate-[mq-marquee_44s_linear_infinite] gap-8 whitespace-nowrap">
            {[...wordsA, ...wordsA].map((w, i) => (
              <span key={i} className="font-brand text-4xl font-black uppercase tracking-tight text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.28)] sm:text-6xl">
                {w}
                <span className="ml-8 text-cyan-300 [-webkit-text-stroke:0]">✦</span>
              </span>
            ))}
          </div>
          <div className="mq-motion mt-2 flex w-max animate-[mq-marquee-rev_50s_linear_infinite] gap-8 whitespace-nowrap">
            {[...wordsB, ...wordsB].map((w, i) => (
              <span key={i} className="bg-gradient-to-r from-[#3b8bff] to-[#5ef0ff] bg-clip-text font-brand text-4xl font-black uppercase tracking-tight text-transparent sm:text-6xl">
                {w}
                <span className="ml-8 text-white/20">●</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Keunggulan (Question · Quality · Quotient) */}
      <section id="keunggulan" className="scroll-mt-16 bg-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <Reveal className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Keunggulan</p>
            <h2 className="mt-3 font-brand text-3xl font-black tracking-tight sm:text-5xl">Tanya. Dapat hasil berkelas. Makin cerdas.</h2>
          </Reveal>
          <div className="mt-10">
            <QAdvantages />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Studi kasus */}
      <section id="studi-kasus" className="scroll-mt-16 border-y bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <Reveal className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Studi kasus</p>
            <h2 className="mt-3 font-brand text-3xl font-black tracking-tight sm:text-5xl">Masalah nyata, dibereskan AI.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Pilih yang paling mirip dengan kamu, lalu lihat apa yang dikerjakan {BRAND}.</p>
          </Reveal>
          <Reveal delay={120} className="mt-10">
            <CaseStudies />
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Cara kerja */}
      <section id="cara-kerja" className="scroll-mt-16 bg-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <Reveal className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Cara kerja</p>
            <h2 className="mt-3 font-brand text-3xl font-black tracking-tight sm:text-5xl">Tanya dulu, baru jualan.</h2>
          </Reveal>
          <Reveal delay={120} className="mt-12">
            <HowItWorks />
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Bedanya dengan AI chat biasa */}
      <section className="border-y bg-muted/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
          <Reveal className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Bedanya</p>
            <h2 className="mt-3 font-brand text-3xl font-black tracking-tight sm:text-5xl">Bukan AI chat biasa.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">AI chat umum menjawab pertanyaan. {BRAND} berpikir dan bekerja untuk brand kamu.</p>
          </Reveal>
          <div className="mt-12 overflow-hidden rounded-3xl border bg-card">
            <div className="hidden grid-cols-[0.8fr_1fr_1.2fr] border-b bg-muted/50 text-sm font-semibold sm:grid">
              <div className="p-4" />
              <div className="p-4 text-muted-foreground">AI chat umum</div>
              <div className="bg-primary/5 p-4 text-primary">{BRAND}</div>
            </div>
            {compare.map((c, i) => (
              <Reveal key={c.topic} delay={i * 90} className="border-b last:border-b-0">
                <div className="grid sm:grid-cols-[0.8fr_1fr_1.2fr]">
                  <div className="flex items-center gap-3 p-4 pb-2 font-semibold sm:pb-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <c.icon className="size-4" />
                    </span>
                    {c.topic}
                  </div>
                  <div className="flex items-start gap-2 px-4 py-2 text-sm text-muted-foreground sm:py-4">
                    <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" /> {c.other}
                  </div>
                  <div className="flex items-start gap-2 bg-primary/5 px-4 py-3 text-sm font-medium sm:py-4">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {c.ours}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Fitur */}
      <section id="fitur" className="scroll-mt-16 bg-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <Reveal className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Fitur</p>
            <h2 className="mt-3 font-brand text-3xl font-black tracking-tight sm:text-5xl">Satu otak, semua kerja marketing.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Klik fitur untuk melihat contoh hasilnya.</p>
          </Reveal>
          <div className="mt-14">
            <FeatureExplorer loggedIn={Boolean(user)} />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- CTA */}
      <section className="relative isolate overflow-hidden bg-[#050b1f] text-white">
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(10,108,255,0.35),transparent_60%)]" />
        <NeuralField className="-z-10 opacity-60" />
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <Reveal>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND_ICON} alt="" className="mq-motion mx-auto size-16 animate-[mq-float_5s_ease-in-out_infinite]" />
            <h2 className="mt-6 min-h-[2.5em] font-brand text-4xl font-black tracking-tight sm:min-h-[1.3em] sm:text-6xl">
              <RotatingTagline className="bg-gradient-to-r from-white via-[#9fe8ff] to-[#12d0f5] bg-clip-text text-transparent" />
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/60">Daftar gratis, tanpa kartu kredit. Upgrade kapan saja saat brand kamu siap tumbuh.</p>
            <Button asChild size="lg" className="mt-8 rounded-full bg-gradient-to-r from-[#0a6cff] to-[#12d0f5] px-8 text-base text-white shadow-xl shadow-cyan-500/25 hover:opacity-90">
              <Link href={cta}>
                Coba {BRAND} gratis <ArrowRight />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
