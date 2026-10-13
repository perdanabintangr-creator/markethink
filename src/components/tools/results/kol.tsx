"use client";

import type { KolOutput } from "@/lib/addons/schemas";
import { Bullets, CopyButton, Pill, SectionCard, numID, rupiah } from "../common";

export function KolResult({ data }: { data: KolOutput }) {
  const briefText = [
    `BRIEF KAMPANYE: ${data.campaign_name}`,
    `Tujuan: ${data.objective}`,
    `Pesan utama: ${data.key_message}`,
    `Audiens: ${data.audience}`,
    "",
    "DELIVERABLES:",
    ...data.deliverables.map((d) => `- ${d.qty}× ${d.format}: ${d.specs}`),
    "",
    "TALKING POINTS:",
    ...data.talking_points.map((t) => `- ${t}`),
    "",
    "LAKUKAN:",
    ...data.dos.map((t) => `- ${t}`),
    "JANGAN:",
    ...data.donts.map((t) => `- ${t}`),
    "",
    `Hashtag: ${data.hashtags.join(" ")}`,
    `CTA: ${data.cta}`,
    "",
    "TIMELINE:",
    ...data.timeline.map((t) => `- ${t.when}: ${t.task}`),
  ].join("\n");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-primary uppercase">Brief kreator</p>
            <h2 className="text-xl font-bold">{data.campaign_name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{data.objective}</p>
          </div>
          <CopyButton text={briefText} label="Salin brief" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-primary/5 p-3">
            <p className="text-xs font-semibold text-primary">PESAN UTAMA</p>
            <p className="mt-1 text-sm">{data.key_message}</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <p className="text-xs font-semibold text-muted-foreground">AUDIENS</p>
            <p className="mt-1 text-sm">{data.audience}</p>
          </div>
        </div>
      </div>

      <SectionCard title="🎬 Deliverables">
        <div className="grid gap-2 sm:grid-cols-2">
          {data.deliverables.map((d, i) => (
            <div key={i} className="rounded-xl border bg-background p-3 text-sm">
              <p className="font-semibold">
                {d.qty}× {d.format}
              </p>
              <p className="mt-1 text-muted-foreground">{d.specs}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard title="🗣️ Talking points">
          <Bullets items={data.talking_points} />
        </SectionCard>
        <SectionCard title="✅ Lakukan">
          <Bullets items={data.dos} />
        </SectionCard>
        <SectionCard title="⛔ Jangan">
          <Bullets items={data.donts} />
        </SectionCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="📅 Timeline">
          <ol className="relative space-y-3 border-l pl-4 text-sm">
            {data.timeline.map((t, i) => (
              <li key={i}>
                <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-primary" />
                <b>{t.when}</b> — {t.task}
              </li>
            ))}
          </ol>
        </SectionCard>
        <SectionCard title="🎯 KPI">
          <div className="grid grid-cols-2 gap-2">
            {data.kpis.map((k, i) => (
              <div key={i} className="rounded-xl border bg-background p-3">
                <p className="text-xs text-muted-foreground">{k.metric}</p>
                <p className="font-semibold">{k.target}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.hashtags.map((h) => (
              <Pill key={h} tone="primary">
                {h.startsWith("#") ? h : `#${h}`}
              </Pill>
            ))}
          </div>
          <p className="mt-2 text-sm">
            <b>CTA:</b> {data.cta}
          </p>
        </SectionCard>
      </div>

      <SectionCard title="💰 Estimasi fee kreator" hint="Perkiraan pasar — sesuaikan dengan rate card kreator">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Tier</th>
                <th>Followers</th>
                <th>Fee / konten</th>
                <th className="text-right">Kreator</th>
              </tr>
            </thead>
            <tbody className="divide-y tabular-nums">
              {data.fee_estimate.rows.map((r, i) => (
                <tr key={i}>
                  <td className="py-2 font-medium">{r.tier}</td>
                  <td>{r.followers}</td>
                  <td>
                    {rupiah(r.fee_min)} – {rupiah(r.fee_max)}
                  </td>
                  <td className="text-right">{numID(r.qty, 0)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2">Total</td>
                <td />
                <td>
                  {rupiah(data.fee_estimate.total_min)} – {rupiah(data.fee_estimate.total_max)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{data.fee_estimate.note}</p>
      </SectionCard>

      <SectionCard title="✉️ Template DM ajakan kerja sama" hint={<CopyButton text={data.dm_template} />}>
        <p className="rounded-xl border bg-background p-3 text-sm whitespace-pre-wrap">{data.dm_template}</p>
      </SectionCard>

      <SectionCard title="📝 Poin perjanjian">
        <Bullets items={data.contract_points} />
      </SectionCard>
    </div>
  );
}
