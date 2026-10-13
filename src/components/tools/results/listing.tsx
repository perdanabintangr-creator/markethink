"use client";

import { useState } from "react";
import { PLATFORM_LABEL, TITLE_LIMIT, type ListingOutput } from "@/lib/addons/schemas";
import { cn } from "@/lib/utils";
import { Bullets, CopyButton, Pill, SectionCard } from "../common";

export function ListingResult({ data }: { data: ListingOutput }) {
  const [tab, setTab] = useState(0);
  const l = data.listings[tab] ?? data.listings[0];
  const keywords = [...data.keywords].sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">{data.summary}</div>

      {l && (
        <SectionCard title="Listing siap tempel">
          <div className="mb-4 flex flex-wrap gap-1.5 print:hidden">
            {data.listings.map((x, i) => (
              <button
                key={x.platform}
                type="button"
                onClick={() => setTab(i)}
                className={cn("rounded-full border px-3 py-1 text-sm", i === tab ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent")}
              >
                {PLATFORM_LABEL[x.platform]}
              </button>
            ))}
          </div>
          {data.listings.map((x, i) => (
            <div key={x.platform} className={cn("space-y-4", i !== tab && "hidden print:block print:mt-6")}>
              <p className="hidden text-sm font-semibold print:block">{PLATFORM_LABEL[x.platform]}</p>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">JUDUL</span>
                  <div className="flex items-center gap-2">
                    <Pill tone={x.title.length <= TITLE_LIMIT[x.platform] ? "good" : "warn"}>
                      {x.title.length}/{TITLE_LIMIT[x.platform]} karakter
                    </Pill>
                    <CopyButton text={x.title} />
                  </div>
                </div>
                <p className="rounded-lg border bg-background p-3 font-medium">{x.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{x.title_reason}</p>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">DESKRIPSI</span>
                  <CopyButton text={x.description} />
                </div>
                <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-background p-3 text-sm print:max-h-none">{x.description}</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">KEUNGGULAN</span>
                  <Bullets items={x.highlights} className="mt-2" />
                </div>
                {x.hashtags.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">HASHTAG</span>
                      <CopyButton text={x.hashtags.join(" ")} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {x.hashtags.map((h) => (
                        <Pill key={h} tone="primary">
                          {h.startsWith("#") ? h : `#${h}`}
                        </Pill>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </SectionCard>
      )}

      {data.before_after && (
        <SectionCard title="Sebelum vs sesudah">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <p className="text-xs font-medium text-red-600 dark:text-red-400">SEBELUM</p>
              <p className="mt-1 text-sm">{data.before_after.before}</p>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">SESUDAH</p>
              <p className="mt-1 text-sm font-medium">{data.before_after.after}</p>
            </div>
          </div>
          <Bullets items={data.before_after.improvements} className="mt-3" />
        </SectionCard>
      )}

      <SectionCard title="Kata kunci yang dicari pembeli" hint="Urut dari prioritas tertinggi">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Kata kunci</th>
                <th>Jenis</th>
                <th>Prioritas</th>
                <th>Dipakai di</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {keywords.map((k) => (
                <tr key={k.keyword}>
                  <td className="py-2 font-medium">{k.keyword}</td>
                  <td>
                    <Pill tone={k.type === "utama" ? "primary" : "muted"}>{k.type}</Pill>
                  </td>
                  <td>
                    <div className="flex gap-0.5" aria-label={`Prioritas ${k.priority} dari 5`}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className={cn("h-2 w-4 rounded-sm", i <= k.priority ? "bg-primary" : "bg-muted")} />
                      ))}
                    </div>
                  </td>
                  <td className="text-xs text-muted-foreground">{k.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard title="📸 Tips foto produk">
          <Bullets items={data.photo_tips} />
        </SectionCard>
        <SectionCard title="🏷️ Tips harga & promo">
          <Bullets items={data.price_tips} />
        </SectionCard>
      </div>
    </div>
  );
}
