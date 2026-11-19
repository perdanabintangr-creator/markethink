import { ArrowUpRight } from "lucide-react";
import { THEME_ACCENT, THEME_BG, type PromoTheme } from "@/lib/promos";

/** Pratinjau kartu promosi — tampilannya sama dengan slot di sidebar aplikasi (lebar ±232px). */
export function PromoPreview({
  title,
  subtitle,
  eyebrow,
  cta,
  theme,
  image,
  brand,
  sponsored,
}: {
  title: string;
  subtitle?: string | null;
  eyebrow?: string | null;
  cta: string;
  theme: PromoTheme;
  image?: string | null;
  brand?: string | null;
  sponsored?: boolean;
}) {
  return (
    <div className="relative h-[13.5rem] w-[14.5rem] shrink-0 overflow-hidden rounded-2xl text-white shadow-lg shadow-black/20 ring-1 ring-black/10">
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
        </>
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: THEME_BG[theme] }} />
          <span aria-hidden className="pointer-events-none absolute -right-5 -top-12 text-[10rem] font-black leading-none text-white/[0.05]">
            Q
          </span>
          <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
        </>
      )}
      <div className="relative flex h-full flex-col p-3.5">
        <div className="flex items-center justify-between gap-2">
          {eyebrow ? (
            <span
              className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: image ? undefined : THEME_ACCENT[theme] }}
            >
              {eyebrow}
            </span>
          ) : (
            <span />
          )}
          {sponsored && <span className="rounded-md bg-black/30 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wider text-white/75">Sponsor</span>}
        </div>
        <div className="mt-auto space-y-1.5">
          {brand && sponsored && <p className="text-[10.5px] font-medium text-white/60">{brand}</p>}
          <h3 className="line-clamp-3 text-[15px] font-bold leading-snug tracking-tight">{title || "Judul promosi"}</h3>
          {subtitle && <p className="line-clamp-2 text-[11.5px] leading-snug text-white/70">{subtitle}</p>}
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-900">
            {cta || "Lihat"} <ArrowUpRight className="size-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
