"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { autopilotText } from "@/lib/i18n/autopilot";
import type { ApWorkspace } from "./autopilot-view";
import { ContentPackages, type ComboOfferView, type ContentOfferView } from "./content-packages";

/** Belum punya paket Autopilot Konten: penjelasan + contoh slide memakai warna & logo brand pelanggan + pilihan paket konten. */
export function AutopilotUpsell({
  lang,
  workspaces,
  offers,
}: {
  lang: "id" | "en";
  workspaces: ApWorkspace[];
  offers: { plans: ContentOfferView[]; combos: ComboOfferView[] };
}) {
  const t = autopilotText(lang);
  const [ws, setWs] = useState(workspaces[0]?.id ?? "");
  const q = ws ? `?ws=${ws}` : "";
  const name = workspaces.find((w) => w.id === ws)?.name;
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:pt-10">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0A0F23] p-6 text-white sm:p-10">
          <div className="pointer-events-none absolute -right-24 -top-32 size-[460px] rounded-full bg-[radial-gradient(circle,rgba(10,132,255,0.55),rgba(10,61,255,0.18)_45%,transparent_70%)]" />
          <div className="pointer-events-none absolute -bottom-40 -left-20 size-[360px] rounded-full bg-[radial-gradient(circle,rgba(0,229,255,0.2),transparent_65%)]" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                <Sparkles className="size-3.5" /> {t.title} · {t.badge}
              </div>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                {t.upsellTitle.split(" ").slice(0, -2).join(" ")}{" "}
                <span className="bg-gradient-to-r from-[#3D7BFF] via-[#0A84FF] to-[#00E5FF] bg-clip-text text-transparent">{t.upsellTitle.split(" ").slice(-2).join(" ")}</span>
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{t.upsellSub}</p>
              <ul className="mt-5 space-y-2">
                {t.upsellPoints.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-white/85">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded bg-gradient-to-br from-[#0A3DFF] to-[#00E5FF]">
                      <Check className="size-3" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 h-11 rounded-full px-6">
                <Link href="#paket-konten">{t.upsellCta}</Link>
              </Button>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2 text-xs text-white/55">
                <span>{name ? t.sampleOf(name) : t.previewLabel}</span>
                {workspaces.length > 1 && (
                  <select value={ws} onChange={(e) => setWs(e.target.value)} className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white">
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id} className="text-black">
                        {w.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((n) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={`${ws}-${n}`} src={`/api/autopilot/sample/${n}${q}`} alt={`Slide ${n}`} className="aspect-[4/5] w-full rounded-xl object-cover shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)] ring-1 ring-white/10" />
                ))}
              </div>
            </div>
          </div>
        </section>
        <div className="mt-10">
          <ContentPackages lang={lang} plans={offers.plans} combos={offers.combos} current={null} />
        </div>
      </div>
    </div>
  );
}
