"use client";

import { useState } from "react";
import { Download, Eye, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resolveDeckTheme, type DeckTheme } from "@/lib/deck-theme";
import { fitDeckToImages } from "@/lib/deck-fit";

/** Bentuk isi deck dari input tool create_presentation (longgar — data lama bisa tidak lengkap). */
interface Slide {
  layout?: string;
  kicker?: string;
  title?: string;
  subtitle?: string;
  bullets?: string[];
  cards?: { title?: string; text?: string }[];
  stats?: { value?: string; label?: string; note?: string }[];
  chart?: { type?: string; labels?: string[]; series?: { name?: string; values?: number[] }[]; unit?: string };
  steps?: { title?: string; text?: string }[];
  columns?: { heading?: string; bullets?: string[] }[];
  table?: { headers?: string[]; rows?: string[][] };
  quote?: string;
  attribution?: string;
  gallery?: { caption?: string }[];
  takeaway?: string;
  source?: string;
}
export interface DeckInput {
  title?: string;
  subtitle?: string;
  theme?: string;
  brand_color?: string;
  cover_image_prompt?: string;
  slides?: Slide[];
}

/** Tombol "Lihat" → pratinjau semua slide di browser sebelum mengunduh .pptx (semua paket). */
export function DeckPreviewButton({
  deck,
  images,
  downloadUrl,
}: {
  deck: DeckInput;
  images?: Record<string, string>;
  downloadUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const t = resolveDeckTheme({ theme: deck.theme, brand_color: deck.brand_color });
  // Sama seperti file: slide tanpa foto (sesuai paket) memakai layout teks. Deck lama (tanpa data foto) apa adanya.
  const slides = images
    ? fitDeckToImages({ ...deck, slides: deck.slides ?? [] }, (k) => Boolean(images[k])).slides
    : (deck.slides ?? []);
  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Eye /> Lihat
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-4rem)]">
          <DialogHeader className="border-b px-4 py-3 pr-12">
            <DialogTitle className="truncate text-base">{deck.title ?? "Presentasi"}</DialogTitle>
            <DialogDescription className="text-xs">
              Pratinjau {slides.length + 1} slide. Detail desain di PowerPoint / Google Slides bisa sedikit berbeda.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/40 p-3 sm:p-4">
            <SlideFrame t={t} n={1}>
              <Cover deck={deck} t={t} image={images?.cover} />
            </SlideFrame>
            {slides.map((s, i) => (
              <SlideFrame key={i} t={t} n={i + 2}>
                <SlideBody s={s} t={t} image={images?.[String(i)]} gallery={[0, 1, 2].map((k) => images?.[`${i}-g${k}`])} />
                <SoWhat s={s} t={t} />
              </SlideFrame>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t px-4 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Tutup
            </Button>
            <Button asChild size="sm">
              <a href={downloadUrl}>
                <Download /> Unduh .pptx
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const hex = (c: string) => `#${c}`;

/** Bingkai 16:9; ukuran teks memakai satuan cqw agar proporsional di layar HP maupun laptop. */
function SlideFrame({ t, n, children }: { t: DeckTheme; n: number; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl" style={{ containerType: "inline-size" }}>
      <div
        className="relative aspect-video w-full overflow-hidden rounded-lg shadow-sm ring-1 ring-black/5"
        style={{ background: hex(t.bg), color: hex(t.text), fontSize: "1.6cqw", lineHeight: 1.35 }}
      >
        {children}
        <span className="absolute bottom-[2.5%] right-[3%] opacity-50" style={{ fontSize: "1.2cqw", color: hex(t.muted) }}>
          {n}
        </span>
      </div>
    </div>
  );
}

function Photo({ src, t, className }: { src?: string; t: DeckTheme; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- file pribadi via /api/attachments (bukan aset statis)
  if (src) return <img src={src} alt="" className={`h-full w-full object-cover ${className ?? ""}`} loading="lazy" />;
  return (
    <div className={`flex h-full w-full items-center justify-center ${className ?? ""}`} style={{ background: hex(t.surface2), color: hex(t.muted) }}>
      <ImageIcon style={{ width: "4cqw", height: "4cqw" }} />
    </div>
  );
}

function Title({ s, t }: { s: Slide; t: DeckTheme }) {
  return (
    <div>
      {s.kicker && (
        <p className="font-semibold uppercase tracking-wide" style={{ color: hex(t.accent), fontSize: "1.25cqw" }}>
          {s.kicker}
        </p>
      )}
      <p className="font-bold leading-tight" style={{ fontSize: "3.1cqw" }}>
        {s.title}
      </p>
      {s.subtitle && (
        <p className="mt-[0.6cqw]" style={{ color: hex(t.muted), fontSize: "1.6cqw" }}>
          {s.subtitle}
        </p>
      )}
    </div>
  );
}

function Bullets({ items, t }: { items?: string[]; t: DeckTheme }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-[0.9cqw]">
      {items.map((b, i) => (
        <li key={i} className="flex gap-[1cqw]">
          <span className="mt-[0.6cqw] shrink-0 rounded-full" style={{ width: "0.9cqw", height: "0.9cqw", background: hex(t.accent) }} />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

function Cover({ deck, t, image }: { deck: DeckInput; t: DeckTheme; image?: string }) {
  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col justify-center gap-[1.5cqw] p-[5%]">
        <span className="rounded-full" style={{ width: "6cqw", height: "0.8cqw", background: hex(t.accent) }} />
        <p className="font-bold leading-tight" style={{ fontSize: "4.4cqw" }}>
          {deck.title}
        </p>
        {deck.subtitle && <p style={{ color: hex(t.muted), fontSize: "1.9cqw" }}>{deck.subtitle}</p>}
      </div>
      {image ? (
        <div className="w-[45%]">
          <Photo src={image} t={t} />
        </div>
      ) : (
        <>
          <span className="absolute -right-[8%] -top-[20%] size-[45%] rounded-full opacity-20" style={{ background: hex(t.accent) }} />
          <span className="absolute -bottom-[25%] right-[12%] size-[35%] rounded-full opacity-15" style={{ background: hex(t.accent2) }} />
        </>
      )}
    </div>
  );
}

function SlideBody({ s, t, image, gallery }: { s: Slide; t: DeckTheme; image?: string; gallery: (string | undefined)[] }) {
  const pad = "p-[4.5%]";
  const card = { background: hex(t.surface) };
  switch (s.layout) {
    case "section":
      return (
        <div className="flex h-full">
          <div className={`flex flex-1 flex-col justify-center ${pad}`} style={{ background: hex(t.accent), color: hex(t.onAccent) }}>
            {s.kicker && <p style={{ fontSize: "1.4cqw", opacity: 0.8 }}>{s.kicker}</p>}
            <p className="font-bold leading-tight" style={{ fontSize: "4cqw" }}>
              {s.title}
            </p>
            {s.subtitle && <p style={{ fontSize: "1.7cqw", opacity: 0.85 }}>{s.subtitle}</p>}
          </div>
          {image && (
            <div className="w-[42%]">
              <Photo src={image} t={t} />
            </div>
          )}
        </div>
      );
    case "agenda":
      return (
        <div className={`flex h-full flex-col gap-[2cqw] ${pad}`}>
          <Title s={s} t={t} />
          <ol className="grid grid-cols-2 gap-[1.2cqw]">
            {(s.bullets ?? []).map((b, i) => (
              <li key={i} className="flex items-center gap-[1.2cqw] rounded-md p-[1.2cqw]" style={card}>
                <span className="font-bold" style={{ color: hex(t.accent), fontSize: "2.2cqw" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ol>
        </div>
      );
    case "cards":
    case "product":
      return (
        <div className={`flex h-full gap-[3%] ${pad}`}>
          {s.layout === "product" && (
            <div className="w-[38%] overflow-hidden rounded-md">
              <Photo src={image} t={t} />
            </div>
          )}
          <div className="flex flex-1 flex-col justify-center gap-[2cqw]">
            <Title s={s} t={t} />
            <div className={`grid gap-[1.2cqw] ${(s.cards?.length ?? 0) > 3 || s.layout === "product" ? "grid-cols-2" : "grid-cols-3"}`}>
              {(s.cards ?? []).map((c, i) => (
                <div key={i} className="rounded-md p-[1.4cqw]" style={card}>
                  <span className="mb-[0.8cqw] block rounded-full" style={{ width: "2.4cqw", height: "2.4cqw", background: hex(t.accent), opacity: 0.85 }} />
                  <p className="font-semibold" style={{ fontSize: "1.7cqw" }}>
                    {c.title}
                  </p>
                  <p style={{ color: hex(t.muted), fontSize: "1.35cqw" }}>{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    case "stats":
      return (
        <div className={`flex h-full flex-col gap-[2.2cqw] ${pad}`}>
          <Title s={s} t={t} />
          <div className="grid gap-[1.2cqw]" style={{ gridTemplateColumns: `repeat(${Math.max(2, s.stats?.length ?? 2)}, minmax(0,1fr))` }}>
            {(s.stats ?? []).map((st, i) => (
              <div key={i} className="rounded-md p-[1.6cqw]" style={card}>
                <p className="font-bold" style={{ color: hex(t.accent), fontSize: "4.4cqw" }}>
                  {st.value}
                </p>
                <p className="font-medium">{st.label}</p>
                {st.note && <p style={{ color: hex(t.muted), fontSize: "1.2cqw" }}>{st.note}</p>}
              </div>
            ))}
          </div>
          <Bullets items={s.bullets} t={t} />
        </div>
      );
    case "chart":
      return <ChartSlide s={s} t={t} />;
    case "timeline":
      return (
        <div className={`flex h-full flex-col gap-[2.5cqw] ${pad}`}>
          <Title s={s} t={t} />
          <div className="grid gap-[1.2cqw]" style={{ gridTemplateColumns: `repeat(${Math.max(3, s.steps?.length ?? 3)}, minmax(0,1fr))` }}>
            {(s.steps ?? []).map((st, i) => (
              <div key={i}>
                <div className="mb-[1cqw] h-[0.5cqw] rounded-full" style={{ background: i === 0 ? hex(t.accent) : hex(t.surface2) }} />
                <p className="font-bold" style={{ color: hex(t.accent) }}>
                  {String(i + 1).padStart(2, "0")} · {st.title}
                </p>
                <p style={{ color: hex(t.muted), fontSize: "1.35cqw" }}>{st.text}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "comparison":
      return (
        <div className={`flex h-full flex-col gap-[2cqw] ${pad}`}>
          <Title s={s} t={t} />
          <div className="grid flex-1 grid-cols-2 gap-[1.5cqw]">
            {(s.columns ?? []).slice(0, 2).map((c, i) => (
              <div
                key={i}
                className="rounded-md p-[1.6cqw]"
                style={i === 1 ? { background: hex(t.accent), color: hex(t.onAccent) } : card}
              >
                <p className="mb-[1cqw] font-bold" style={{ fontSize: "1.9cqw" }}>
                  {c.heading}
                </p>
                <ul className="space-y-[0.7cqw]">
                  {(c.bullets ?? []).map((b, k) => (
                    <li key={k}>• {b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );
    case "table":
      return (
        <div className={`flex h-full flex-col gap-[2cqw] ${pad}`}>
          <Title s={s} t={t} />
          <table className="w-full border-collapse" style={{ fontSize: "1.4cqw" }}>
            <thead>
              <tr style={{ background: hex(t.accent), color: hex(t.onAccent) }}>
                {(s.table?.headers ?? []).map((h, i) => (
                  <th key={i} className="px-[1cqw] py-[0.7cqw] text-left font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(s.table?.rows ?? []).map((r, i) => (
                <tr key={i} style={{ background: i % 2 ? "transparent" : hex(t.surface) }}>
                  {r.map((c, k) => (
                    <td key={k} className="px-[1cqw] py-[0.6cqw]">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "quote":
      return (
        <div className={`flex h-full flex-col justify-center gap-[1.5cqw] ${pad}`}>
          <p className="font-bold leading-none" style={{ color: hex(t.accent), fontSize: "8cqw" }}>
            “
          </p>
          <p className="font-semibold leading-snug" style={{ fontSize: "3cqw" }}>
            {s.quote ?? s.title}
          </p>
          {s.attribution && <p style={{ color: hex(t.muted) }}>— {s.attribution}</p>}
        </div>
      );
    case "image_text":
      return (
        <div className="flex h-full">
          <div className="w-[45%]">
            <Photo src={image} t={t} />
          </div>
          <div className={`flex flex-1 flex-col justify-center gap-[2cqw] ${pad}`}>
            <Title s={s} t={t} />
            <Bullets items={s.bullets} t={t} />
          </div>
        </div>
      );
    case "gallery":
      return (
        <div className={`flex h-full flex-col gap-[2cqw] ${pad}`}>
          <Title s={s} t={t} />
          <div className="grid flex-1 gap-[1.2cqw]" style={{ gridTemplateColumns: `repeat(${Math.max(2, s.gallery?.length ?? 2)}, minmax(0,1fr))` }}>
            {(s.gallery ?? []).map((g, k) => (
              <div key={k} className="flex min-h-0 flex-col gap-[0.6cqw]">
                <div className="min-h-0 flex-1 overflow-hidden rounded-md">
                  <Photo src={gallery[k]} t={t} />
                </div>
                <p style={{ fontSize: "1.3cqw", color: hex(t.muted) }}>{g.caption}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "closing":
      return (
        <div className="flex h-full">
          <div className={`flex flex-1 flex-col justify-center gap-[2cqw] ${pad}`}>
            <p className="font-bold" style={{ fontSize: "4.4cqw" }}>
              {s.title}
            </p>
            {s.subtitle && <p style={{ color: hex(t.muted), fontSize: "1.8cqw" }}>{s.subtitle}</p>}
            <Bullets items={s.bullets} t={t} />
          </div>
          {image && (
            <div className="w-[40%]">
              <Photo src={image} t={t} />
            </div>
          )}
        </div>
      );
    default: {
      const items = s.bullets ?? [];
      if (image)
        return (
          <div className="flex h-full">
            <div className={`flex flex-1 flex-col gap-[2.2cqw] ${pad}`}>
              <Title s={s} t={t} />
              <Bullets items={items} t={t} />
            </div>
            <div className="w-[38%]">
              <Photo src={image} t={t} />
            </div>
          </div>
        );
      // Tanpa foto: judul + garis aksen, poin dalam kartu bernomor (1 kolom bila ≤3 poin, 2 kolom bila lebih).
      return (
        <div className={`flex h-full flex-col justify-center gap-[2.2cqw] ${pad}`}>
          <div>
            <Title s={s} t={t} />
            <span className="mt-[1.2cqw] block rounded-full" style={{ width: "6cqw", height: "0.5cqw", background: hex(t.accent) }} />
          </div>
          <div className={`grid gap-[1.1cqw] ${items.length > 3 ? "grid-cols-2" : "grid-cols-1"}`}>
            {items.map((b, i) => (
              <div key={i} className="flex items-start gap-[1.2cqw] rounded-md p-[1.3cqw]" style={card}>
                <span
                  className="flex shrink-0 items-center justify-center rounded-full font-bold"
                  style={{ width: "2.6cqw", height: "2.6cqw", background: hex(t.accent), color: hex(t.onAccent), fontSize: "1.3cqw" }}
                >
                  {i + 1}
                </span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }
}

function ChartSlide({ s, t }: { s: Slide; t: DeckTheme }) {
  const labels = s.chart?.labels ?? [];
  const series = (s.chart?.series ?? []).slice(0, 3);
  const max = Math.max(1, ...series.flatMap((x) => x.values ?? []));
  const colors = [t.accent, t.accent2, t.muted];
  const pie = s.chart?.type === "pie" || s.chart?.type === "doughnut";
  const total = (series[0]?.values ?? []).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="flex h-full gap-[3%] p-[4.5%]">
      <div className="flex w-[34%] flex-col gap-[2cqw]">
        <Title s={s} t={t} />
        <Bullets items={s.bullets} t={t} />
      </div>
      <div className="flex flex-1 flex-col justify-end rounded-md p-[2cqw]" style={{ background: hex(t.surface) }}>
        {pie ? (
          <div className="space-y-[1cqw]">
            {labels.map((l, i) => {
              const v = series[0]?.values?.[i] ?? 0;
              return (
                <div key={i}>
                  <div className="flex justify-between" style={{ fontSize: "1.3cqw" }}>
                    <span>{l}</span>
                    <span className="font-semibold">{Math.round((v / total) * 100)}%</span>
                  </div>
                  <div className="h-[1.2cqw] rounded-full" style={{ background: hex(t.surface2) }}>
                    <div className="h-full rounded-full" style={{ width: `${(v / total) * 100}%`, background: hex(i % 2 ? t.accent2 : t.accent) }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="flex flex-1 items-end gap-[1.5cqw]">
              {labels.map((l, i) => (
                <div key={i} className="flex h-full flex-1 items-end justify-center gap-[0.4cqw]">
                  {series.map((x, k) => (
                    <div
                      key={k}
                      className="flex-1 rounded-t-sm"
                      style={{ height: `${((x.values?.[i] ?? 0) / max) * 100}%`, background: hex(colors[k]), minHeight: "0.3cqw" }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-[0.8cqw] flex gap-[1.5cqw]" style={{ fontSize: "1.15cqw", color: hex(t.muted) }}>
              {labels.map((l, i) => (
                <span key={i} className="flex-1 truncate text-center">
                  {l}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Kotak "so what" & sumber data (sama seperti di file .pptx). */
function SoWhat({ s, t }: { s: Slide; t: DeckTheme }) {
  const fullSlide = ["section", "quote", "image_text", "closing", "agenda"].includes(s.layout ?? "");
  if (fullSlide || (!s.takeaway && !s.source)) return null;
  return (
    <div className="absolute inset-x-[4.5%] bottom-[7%] space-y-[0.5cqw]">
      {s.takeaway && (
        <div
          className="flex items-center gap-[1cqw] rounded-md py-[1cqw] pl-[1.6cqw] pr-[1cqw]"
          style={{ background: `${hex(t.accent)}1f`, borderLeft: `0.6cqw solid ${hex(t.accent)}` }}
        >
          <span className="font-bold tracking-wider" style={{ color: hex(t.accent), fontSize: "1.1cqw" }}>
            SO WHAT
          </span>
          <span className="font-semibold" style={{ fontSize: "1.5cqw" }}>
            {s.takeaway}
          </span>
        </div>
      )}
      {s.source && (
        <p className="italic" style={{ color: hex(t.muted), fontSize: "1cqw" }}>
          Sumber: {s.source}
        </p>
      )}
    </div>
  );
}
