import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  FileText,
  Globe,
  Megaphone,
  PenLine,
  Search,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { getTiers, PLAN_LABEL } from "@/lib/ai/models.config";

const features = [
  { icon: Brain, title: "Chat otak marketing", desc: "Ngobrol seperti dengan CMO: strategi, analisis, dan copy — dijawab dengan konteks brand kamu." },
  { icon: Search, title: "Riset Web ber-sitasi", desc: "Tren, data pasar, dan kompetitor dengan sumber bernomor yang bisa diklik." },
  { icon: Sparkles, title: "16+ Marketing Agents", desc: "Campaign plan, buyer persona, SWOT, ads copy, script TikTok, copy marketplace, dan lainnya." },
  { icon: BookOpen, title: "Projects per brand", desc: "Satu project per brand/klien: Brand Kit, dokumen & memory terpisah — jawaban fokus ke project itu saja." },
  { icon: FileText, title: "Canvas", desc: "Output panjang terbuka di panel editor dengan versioning & export DOCX, PDF, Markdown, CSV." },
  { icon: CalendarDays, title: "Content Calendar", desc: "Kalender konten rapi dalam tabel, siap export ke spreadsheet." },
];

const personas = [
  { icon: Megaphone, label: "Marketing profesional & agency" },
  { icon: ShoppingBag, label: "Owner UMKM" },
  { icon: BookOpen, label: "Mahasiswa" },
  { icon: PenLine, label: "Freelancer & content creator" },
  { icon: Users, label: "Founder & sales" },
];

export default async function LandingPage() {
  const { user } = isSupabaseConfigured() ? await getSession() : { user: null };
  const tiers = getTiers();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm"><Link href="/chat">Buka App</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm"><Link href="/login">Masuk</Link></Button>
                <Button asChild size="sm"><Link href="/register">Coba Gratis</Link></Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_60%)]" />
        <div className="mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium">
            <Sparkles className="size-3.5 text-primary" /> Beta gratis — kuota harian untuk semua user
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Otak marketing kamu,{" "}
            <span className="bg-gradient-to-r from-[#6d5dfc] to-[#c04cfd] bg-clip-text text-transparent">berbasis AI</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Dari ide sampai eksekusi: riset → strategi → konten → kalender → KPI. Chat seperti ChatGPT, riset ber-sitasi
            seperti Perplexity — tapi semuanya dikhususkan untuk marketing di Indonesia.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg"><Link href={user ? "/chat" : "/register"}>Mulai gratis sekarang</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="#fitur">Lihat fitur</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex flex-wrap justify-center gap-2">
          {personas.map((p) => (
            <span key={p.label} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
              <p.icon className="size-4 text-primary" /> {p.label}
            </span>
          ))}
        </div>
      </section>

      <section id="fitur" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Semua yang kamu butuhkan untuk marketing</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Pilih level otak marketing</h2>
          <p className="mt-2 text-center text-muted-foreground">Ganti kapan saja dari model selector.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((t, i) => (
              <div key={t.id} className={`rounded-2xl border bg-card p-6 ${i === 1 ? "ring-2 ring-primary" : ""}`}>
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  {Array.from({ length: i + 1 }).map((_, k) => <BarChart3 key={k} className="size-4" />)}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{t.label}</h3>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {PLAN_LABEL[t.minPlan]}
                  </span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">{t.tagline.id}</p>
                <p className="mt-3 text-sm">{t.description.id}</p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {t.skills.id.map((s) => (
                    <li key={s}>✓ {s}</li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">{t.creditCost} kredit / pesan</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <Globe className="mx-auto size-8 text-primary" />
        <h2 className="mt-4 text-2xl font-bold sm:text-3xl">Siap bikin marketing yang lebih tajam?</h2>
        <p className="mt-2 text-muted-foreground">Daftar beta gratis — tanpa kartu kredit.</p>
        <Button asChild size="lg" className="mt-6"><Link href={user ? "/chat" : "/register"}>Coba Markethink</Link></Button>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Markethink</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:underline">Syarat Layanan</Link>
            <Link href="/privacy" className="hover:underline">Kebijakan Privasi</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
