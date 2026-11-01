import { Check, FileSpreadsheet, Link2, Presentation, Target } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { BRAND_ICON } from "@/lib/brand";

const IN = "mq-motion animate-[mq-in_0.5s_ease-out_both]";

/** Tiga keunggulan (Question · Quality · Quotient) disampaikan sebagai manfaat, bukan filosofi. */
export function QAdvantages() {
  return (
    <div className="relative">
      <Reveal className="mx-auto mb-12 flex w-fit items-center gap-3 rounded-full border bg-card px-4 py-2 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_ICON} alt="" className="size-7" />
        <span className="text-sm font-semibold tracking-wide">
          Question <span className="text-muted-foreground/50">·</span> Quality <span className="text-muted-foreground/50">·</span> Quotient
        </span>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card delay={0} label="Question" title="Cukup bertanya" desc="Tidak perlu jago marketing atau pintar menulis prompt. Ceritakan saja masalahmu, AI bantu memperjelas sampai ketemu jawabannya.">
          <div className="space-y-2">
            <div className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-gradient-to-r from-[#0a6cff] to-[#12b8f5] px-3 py-2 text-sm text-white">
              Mau naikin penjualan, mulai dari mana?
            </div>
            <div className="flex gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRAND_ICON} alt="" className="mt-1 size-4 shrink-0" />
              <div className="rounded-2xl rounded-tl-md bg-muted px-3 py-2 text-sm">Boleh tahu dulu: jual apa, ke siapa, dan budget-nya berapa?</div>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-6">
              {["Kopi susu", "Mahasiswa", "Rp1 jt/bulan"].map((c) => (
                <span key={c} className="rounded-full border bg-card px-2.5 py-1 text-xs">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </Card>

        <Card delay={120} label="Quality" title="Hasil setara konsultan" desc="Bukan jawaban asal. Strategi lengkap dengan data, angka, dan sumber, siap dipresentasikan ke atasan, klien, atau investor.">
          <div className="space-y-2">
            {[
              { icon: Link2, t: "Ada sumber data yang bisa dicek" },
              { icon: Target, t: "Ada angka & target yang terukur" },
              { icon: Presentation, t: "Siap presentasi: PPT" },
              { icon: FileSpreadsheet, t: "Siap dihitung ulang: Excel" },
            ].map((x) => (
              <div key={x.t} className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2 text-sm">
                <x.icon className="size-4 shrink-0 text-primary" />
                <span className="flex-1">{x.t}</span>
                <Check className="size-4 text-emerald-500" />
              </div>
            ))}
          </div>
        </Card>

        <Card delay={240} label="Quotient" title="Makin dipakai, makin pintar" desc="AI mengingat brand, produk, dan pelangganmu. Semakin sering dipakai, jawabannya makin tajam dan makin terasa “kamu banget”.">
          <div className="rounded-xl border bg-card p-3">
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="font-medium">AI kenal brand kamu</span>
              <span className="text-primary">tumbuh terus</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="mq-motion h-full w-[88%] origin-left animate-[mq-grow_2.4s_ease-out_both] rounded-full bg-gradient-to-r from-[#0a6cff] to-[#12d0f5]" />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Target: mahasiswa", "Gaya: santai, pakai “kak”", "Terlaris: kopi aren", "Jam ramai: 15.00", "Kompetitor: 4 kedai"].map((m, i) => (
                <span key={m} style={{ animationDelay: `${400 + i * 250}ms` }} className={`${IN} rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary`}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ label, title, desc, delay, children }: { label: string; title: string; desc: string; delay: number; children: React.ReactNode }) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 sm:p-7">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-10 select-none font-brand text-[11rem] font-black leading-none text-primary/[0.06] transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-6"
        >
          Q
        </span>
        <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-primary">{label}</p>
        <h3 className="relative mt-2 font-brand text-2xl font-black tracking-tight">{title}</h3>
        <p className="relative mt-2 text-sm text-muted-foreground">{desc}</p>
        <div className="relative mt-6 flex-1 rounded-2xl bg-muted/50 p-3">{children}</div>
      </div>
    </Reveal>
  );
}
