import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { getSession } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { isSupabaseConfigured, resolveAppUrl } from "@/lib/env";

const TITLE = "AI Marketing Indonesia: Panduan Memakai AI untuk Marketing Bisnis";
const DESC =
  "Panduan praktis AI marketing untuk UMKM, marketer, dan agency di Indonesia: apa itu AI marketing, contoh pemakaian (riset, caption, iklan, kalender konten), cara memulai, dan tools yang bisa dipakai, termasuk Marqthink.";

export const metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/ai-marketing-indonesia" },
  openGraph: { title: TITLE, description: DESC, type: "article" },
};

const sections: { h: string; body: React.ReactNode }[] = [
  {
    h: "Apa itu AI marketing?",
    body: (
      <>
        <p>
          AI marketing adalah pemakaian kecerdasan buatan (AI) untuk membantu pekerjaan marketing: meriset pasar dan kompetitor,
          memahami calon pembeli, menyusun strategi, menulis konten, sampai merencanakan jadwal posting dan menghitung budget iklan.
          AI tidak menggantikan pemilik bisnis atau marketer, tetapi mempercepat pekerjaan yang biasanya memakan waktu berjam-jam.
        </p>
        <p>
          Untuk bisnis di Indonesia, AI marketing paling terasa manfaatnya bila AI memahami bahasa, kebiasaan, dan platform yang dipakai
          pembeli lokal: Instagram, TikTok, WhatsApp, Shopee, dan Tokopedia.
        </p>
      </>
    ),
  },
  {
    h: "Contoh pemakaian AI marketing untuk bisnis Indonesia",
    body: (
      <ul>
        <li><b>Riset kompetitor & harga</b>: mencari tahu promo, harga, dan ulasan kompetitor terbaru lengkap dengan sumbernya.</li>
        <li><b>Caption & konten media sosial</b>: membuat caption, hook video pendek, dan ide konten sesuai gaya bahasa brand.</li>
        <li><b>Copy iklan</b>: menulis beberapa variasi iklan Meta, TikTok, atau Google untuk diuji A/B.</li>
        <li><b>Kalender konten</b>: menyusun jadwal posting satu bulan lengkap dengan tema dan jam tayang.</li>
        <li><b>Strategi & presentasi</b>: marketing plan, persona pembeli, sampai deck pitching untuk klien atau atasan.</li>
        <li><b>Hitung budget iklan</b>: memperkirakan biaya per order dan budget harian yang masuk akal.</li>
      </ul>
    ),
  },
  {
    h: "Cara memulai AI marketing (untuk pemula)",
    body: (
      <ol>
        <li><b>Tuliskan profil brand</b>: produk, harga, target pembeli, dan gaya bahasa. Semakin jelas, semakin tepat hasil AI.</li>
        <li><b>Mulai dari satu masalah nyata</b>, misalnya “penjualan sore turun” atau “butuh ide konten minggu ini”.</li>
        <li><b>Minta AI meriset dulu</b> sebelum memberi saran, dan pastikan ada sumber yang bisa dicek.</li>
        <li><b>Uji hasilnya kecil-kecilan</b>: posting beberapa konten atau iklan dengan budget kecil, lalu lihat angkanya.</li>
        <li><b>Ulangi tiap minggu</b>: evaluasi, tanya lagi ke AI, perbaiki. Konsistensi lebih penting daripada sekali besar.</li>
      </ol>
    ),
  },
  {
    h: "Hal yang perlu diperhatikan",
    body: (
      <ul>
        <li>Selalu cek ulang angka, harga, dan klaim yang ditulis AI sebelum dipublikasikan.</li>
        <li>Pakai data yang masih baru; tren dan harga pasar cepat berubah.</li>
        <li>Jangan memasukkan data rahasia (password, data kartu, data pribadi pelanggan) ke aplikasi AI mana pun.</li>
        <li>AI membantu berpikir dan bekerja lebih cepat, keputusan akhir tetap di tangan kamu.</li>
      </ul>
    ),
  },
  {
    h: `${BRAND}: AI marketing Indonesia untuk brand kamu`,
    body: (
      <>
        <p>
          {BRAND} adalah aplikasi AI marketing buatan Indonesia. Cukup bertanya dengan bahasa sehari-hari, {BRAND} meriset dengan sumber
          terbaru, menyusun strategi, lalu membuat hasil siap pakai: caption, copy iklan, kalender konten, file PPT/Excel, sampai desain
          yang bisa dilanjutkan di Canva. {BRAND} juga mengingat Brand Kit kamu sehingga jawabannya konsisten dengan brand.
        </p>
        <p>
          Ada paket gratis untuk mencoba, dan paket berbayar mulai Rp60.000 per bulan. Lihat detailnya di <Link href="/harga">halaman Harga</Link>.
        </p>
      </>
    ),
  },
];

export default async function AiMarketingIndonesiaPage() {
  const { user } = isSupabaseConfigured() ? await getSession() : { user: null };
  const base = resolveAppUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: TITLE,
    description: DESC,
    inLanguage: "id-ID",
    mainEntityOfPage: `${base}/ai-marketing-indonesia`,
    author: { "@type": "Organization", name: BRAND, url: `${base}/` },
    publisher: { "@type": "Organization", name: BRAND, logo: { "@type": "ImageObject", url: `${base}/brand/marqthink-q-512.png` } },
    datePublished: "2026-11-14",
    dateModified: "2026-11-14",
  };
  return (
    <div className="min-h-dvh overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader loggedIn={Boolean(user)} />
      <article className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Panduan</p>
        <h1 className="mt-3 font-brand text-3xl font-black leading-tight tracking-tight sm:text-5xl">AI Marketing Indonesia</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Panduan singkat memakai AI untuk marketing bisnis di Indonesia: dari riset sampai konten siap posting.
        </p>
        <div className="prose prose-neutral mt-10 max-w-none dark:prose-invert">
          {sections.map((s) => (
            <section key={s.h}>
              <h2>{s.h}</h2>
              {s.body}
            </section>
          ))}
        </div>
        <div className="mt-12 rounded-2xl border bg-muted/40 p-6 text-center">
          <p className="font-brand text-xl font-black">Coba AI marketing untuk brand kamu</p>
          <p className="mt-1 text-sm text-muted-foreground">Daftar gratis, tanpa kartu kredit.</p>
          <Button asChild className="mt-4 rounded-full bg-gradient-to-r from-[#0a6cff] to-[#12d0f5] text-white hover:opacity-90">
            <Link href={user ? "/dashboard" : "/register"}>
              Coba {BRAND} gratis <ArrowRight />
            </Link>
          </Button>
        </div>
      </article>
      <SiteFooter />
    </div>
  );
}
