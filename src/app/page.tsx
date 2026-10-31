import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Brain,
  CalendarDays,
  CircleHelp,
  Gauge,
  Megaphone,
  Mic,
  Palette,
  PenLine,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/landing/border-beam";
import { GlowCard } from "@/components/landing/glow-card";
import { HeroChat } from "@/components/landing/hero-chat";
import { NeuralField } from "@/components/landing/neural-field";
import { QuoteCarousel } from "@/components/landing/quote-carousel";
import { QuotientGauge } from "@/components/landing/quotient-gauge";
import { Reveal } from "@/components/landing/reveal";
import { RotatingTagline } from "@/components/landing/rotating-tagline";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { getSession } from "@/lib/auth";
import { BRAND, BRAND_ICON } from "@/lib/brand";
import { isSupabaseConfigured } from "@/lib/env";

/** Kata-kata marketing yang berjalan (dua baris, arah berlawanan). */
const wordsA = ["Brand awareness", "Positioning", "Storytelling", "Insight", "Engagement", "Loyalty"];
const wordsB = ["Konversi", "Copywriting", "Funnel", "ROAS", "Viral", "Repeat order"];

const personas = [
  { icon: Megaphone, label: "Marketing profesional & agency" },
  { icon: ShoppingBag, label: "Owner UMKM" },
  { icon: PenLine, label: "Freelancer & content creator" },
  { icon: Users, label: "Founder & sales" },
  { icon: BookOpen, label: "Mahasiswa" },
  { icon: CalendarDays, label: "Social media specialist" },
  { icon: Search, label: "Market researcher" },
];

/** Tiga makna huruf Q. */
const qMeanings = [
  {
    word: "Question",
    icon: CircleHelp,
    title: "Dimulai dari pertanyaan yang tepat",
    desc: "Marketing yang bagus selalu dimulai dari pertanyaan yang tepat. Di Marqthink, kamu cukup bertanya, AI yang menggali jawabannya.",
  },
  {
    word: "Quality",
    icon: ShieldCheck,
    title: "Standar kualitas konsultan",
    desc: "Strategi, riset, dan dokumen setara deliverable konsultan & agency: lengkap dengan sumber, angka, dan file PPT/Excel.",
  },
  {
    word: "Quotient",
    icon: Gauge,
    title: "Kecerdasan marketing kamu",
    desc: "Seperti IQ, Marqthink menaikkan “MQ”, Marketing Quotient brand kamu: makin sering dipakai, makin tajam keputusan marketingmu.",
  },
];

const steps = [
  { n: "01", title: "Tanya", desc: "Ceritakan kebutuhanmu dengan bahasa sehari-hari, bisa juga lewat suara." },
  { n: "02", title: "Riset", desc: "AI membaca Brand Kit, file, dan riset web terbaru dengan sumber." },
  { n: "03", title: "Strategi", desc: "Rencana, angle, dan angka yang masuk akal untuk brand kamu." },
  { n: "04", title: "Eksekusi", desc: "Caption, iklan, kalender, PPT, desain: siap dipakai hari ini." },
];

const features = [
  { icon: Brain, title: "Chat otak marketing", desc: "Ngobrol seperti dengan CMO, dijawab dengan konteks brand kamu." },
  { icon: Wrench, title: "24 Smart Tools", desc: "Marketing plan, riset kompetitor, copy iklan, kalender konten, audit IG, dan lainnya." },
  { icon: Bot, title: "Marqthink Agent", desc: "Satu tujuan, beberapa tools jalan otomatis sampai jadi paket kerja." },
  { icon: Search, title: "Riset web ber-sumber", desc: "Tren, harga, dan kompetitor terbaru dengan link sumber yang bisa dicek." },
  { icon: Palette, title: "Brand Kit per project", desc: "Logo, warna, gaya bahasa & produk: semua jawaban konsisten dengan brand." },
  { icon: CalendarDays, title: "Kalender konten", desc: "Jadwal posting otomatis, satu klik masuk Google Calendar." },
  { icon: Sparkles, title: "Desain & kirim ke Canva", desc: "Carousel, poster, foto produk studio, langsung lanjut edit di Canva." },
  { icon: Mic, title: "Ngobrol pakai suara", desc: "Diskusi strategi sambil jalan: bicara, AI menjawab dengan suara." },
];

export default async function LandingPage() {
  const { user } = isSupabaseConfigured() ? await getSession() : { user: null };
  const cta = user ? "/dashboard" : "/register";

  return (
    <div className="min-h-dvh overflow-x-hidden">
      <SiteHeader loggedIn={Boolean(user)} />

      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative isolate overflow-hidden bg-[#050b1f] text-white">
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(10,108,255,0.35),transparent_60%)]" />
        <div className="pointer-events-none absolute -bottom-40 -right-20 -z-10 size-[34rem] rounded-full bg-[radial-gradient(circle,rgba(18,208,245,0.22),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <NeuralField className="-z-10 opacity-70" />

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.1fr_1fr]">
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
                <a href="#kenapa">Kenapa {BRAND}?</a>
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

        {/* Persona berjalan */}
        <div className="relative border-t border-white/10 py-5 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
          <div className="mq-motion flex w-max animate-[mq-marquee_32s_linear_infinite] gap-3">
            {[...personas, ...personas].map((p, i) => (
              <span key={i} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/75">
                <p.icon className="size-4 text-cyan-300" /> {p.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Kata-kata marketing berjalan */}
      <section aria-hidden className="relative overflow-hidden border-b bg-background py-10 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
        <div className="mq-motion flex w-max animate-[mq-marquee_40s_linear_infinite] gap-10 whitespace-nowrap">
          {[...wordsA, ...wordsA].map((w, i) => (
            <span key={i} className="font-brand text-5xl font-black uppercase tracking-tight text-transparent [-webkit-text-stroke:1.5px_var(--color-border)] transition-colors hover:text-primary sm:text-7xl">
              {w}
              <span className="ml-10 text-primary [-webkit-text-stroke:0]">✦</span>
            </span>
          ))}
        </div>
        <div className="mq-motion mt-4 flex w-max animate-[mq-marquee-rev_46s_linear_infinite] gap-10 whitespace-nowrap">
          {[...wordsB, ...wordsB].map((w, i) => (
            <span key={i} className="bg-gradient-to-r from-[#0a6cff] to-[#12d0f5] bg-clip-text font-brand text-5xl font-black uppercase tracking-tight text-transparent sm:text-7xl">
              {w}
              <span className="ml-10 text-foreground/15">●</span>
            </span>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- Kenapa Marqthink: MARQ */}
      <section id="kenapa" className="scroll-mt-16 bg-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <Reveal className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Kenapa {BRAND}?</p>
            <h2 className="mt-3 font-brand text-3xl font-black tracking-tight sm:text-5xl">Setiap brand butuh otak yang berpikir untuknya.</h2>
          </Reveal>

          <Reveal delay={120} className="mx-auto mt-14 max-w-4xl">
            <div className="grid items-stretch gap-4 sm:grid-cols-2">
              <div className="group relative overflow-hidden rounded-3xl border bg-card p-7 transition-shadow hover:shadow-xl">
                <p className="font-brand text-6xl font-black tracking-tight sm:text-7xl">MARQ</p>
                <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">marque · bahasa Prancis</p>
                <p className="mt-2 text-lg">
                  Artinya <b>brand / merek</b>.
                </p>
                <span className="pointer-events-none absolute -bottom-8 -right-4 font-brand text-[9rem] font-black leading-none text-foreground/[0.04] transition-transform duration-500 group-hover:-translate-y-2">M</span>
              </div>
              <div className="group relative overflow-hidden rounded-3xl border bg-card p-7 transition-shadow hover:shadow-xl">
                <p className="bg-gradient-to-r from-[#0a6cff] to-[#12d0f5] bg-clip-text font-brand text-6xl font-black tracking-tight text-transparent sm:text-7xl">THINK</p>
                <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">cara berpikir</p>
                <p className="mt-2 text-lg">
                  Jadi <b>Marqthink = brand thinking</b>: cara berpikir sebuah brand.
                </p>
                <span className="pointer-events-none absolute -bottom-8 -right-4 font-brand text-[9rem] font-black leading-none text-primary/[0.06] transition-transform duration-500 group-hover:-translate-y-2">T</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Kenapa Marqthink: Q */}
      <section className="relative overflow-hidden border-y bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal className="text-center lg:text-left">
              <div className="relative mx-auto size-44 lg:mx-0">
                <div className="mq-motion absolute inset-0 animate-[mq-orbit_18s_linear_infinite] rounded-full border-2 border-dashed border-primary/25" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/marqthink-q-512.png" alt="Huruf Q Marqthink" className="mq-motion absolute inset-5 animate-[mq-float_6s_ease-in-out_infinite]" />
              </div>
              <h2 className="mt-8 font-brand text-3xl font-black tracking-tight sm:text-4xl">
                Kenapa huruf <span className="text-primary">Q</span>?
              </h2>
              <p className="mt-3 text-muted-foreground">Satu huruf, tiga lapis makna. Itulah cara Marqthink bekerja untuk brand kamu.</p>
            </Reveal>
            <div className="grid gap-4">
              {qMeanings.map((m, i) => (
                <Reveal key={m.word} delay={i * 120}>
                  <div className="group flex gap-5 rounded-3xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0a6cff] to-[#12d0f5] text-white shadow-lg shadow-primary/20 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
                      <m.icon className="size-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-brand text-2xl font-black tracking-tight">
                        <span className="text-primary">Q</span>
                        {m.word.slice(1)}
                      </p>
                      <p className="mt-0.5 font-semibold">{m.title}</p>
                      <p className="mt-1.5 text-sm text-muted-foreground">{m.desc}</p>
                    </div>
                    {m.word === "Quotient" && (
                      <div className="hidden shrink-0 sm:block">
                        <QuotientGauge />
                      </div>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Cara kerja */}
      <section id="cara-kerja" className="scroll-mt-16 bg-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <Reveal className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Cara kerja</p>
            <h2 className="mt-3 font-brand text-3xl font-black tracking-tight sm:text-5xl">Tanya dulu, baru jualan.</h2>
          </Reveal>
          <div className="relative mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="pointer-events-none absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent lg:block" />
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div className="relative h-full rounded-3xl border bg-card p-6">
                  <span className="relative z-10 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-[#0a6cff] to-[#12d0f5] font-brand text-sm font-black text-white shadow-lg shadow-primary/25">
                    {s.n}
                  </span>
                  <p className="mt-5 font-brand text-xl font-black">{s.title}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Kutipan marketing */}
      <section className="relative isolate overflow-hidden bg-[#050b1f] py-24 text-white sm:py-32">
        <NeuralField className="-z-10 opacity-50" density={0.00006} />
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(10,108,255,0.28),transparent_60%)]" />
        <div className="mx-auto max-w-6xl px-4">
          <p className="mb-10 text-center text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Kata mereka tentang marketing</p>
          <QuoteCarousel />
        </div>
      </section>

      {/* ---------------------------------------------------------------- Fitur */}
      <section id="fitur" className="scroll-mt-16 border-t bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <Reveal className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Fitur</p>
            <h2 className="mt-3 font-brand text-3xl font-black tracking-tight sm:text-5xl">Satu otak, semua kerja marketing.</h2>
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 4) * 90}>
                <GlowCard className="h-full p-6">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-5 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                </GlowCard>
              </Reveal>
            ))}
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
