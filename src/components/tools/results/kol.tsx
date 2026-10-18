"use client";

import type { KolOutput } from "@/lib/addons/schemas";
import { Bullets, CopyButton, Pill, SectionCard, useResultsI18n } from "../common";

export function KolResult({ data }: { data: KolOutput }) {
  const { t: tr, f } = useResultsI18n();
  const t = tr.kol;
  const { numID, rupiah } = f;
  const b = t.brief;
  const briefText = [
    `${b.title} ${data.campaign_name}`,
    `${b.objective} ${data.objective}`,
    `${b.keyMessage} ${data.key_message}`,
    `${b.audience} ${data.audience}`,
    "",
    b.deliverables,
    ...data.deliverables.map((d) => `- ${d.qty}× ${d.format}: ${d.specs}`),
    "",
    b.talking,
    ...data.talking_points.map((x) => `- ${x}`),
    "",
    b.dos,
    ...data.dos.map((x) => `- ${x}`),
    b.donts,
    ...data.donts.map((x) => `- ${x}`),
    "",
    `${b.hashtag} ${data.hashtags.join(" ")}`,
    `CTA: ${data.cta}`,
    "",
    b.timeline,
    ...data.timeline.map((x) => `- ${x.when}: ${x.task}`),
  ].join("\n");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-primary uppercase">{t.creatorBrief}</p>
            <h2 className="text-xl font-bold">{data.campaign_name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{data.objective}</p>
          </div>
          <CopyButton text={briefText} label={t.copyBrief} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-primary/5 p-3">
            <p className="text-xs font-semibold text-primary">{t.keyMessage}</p>
            <p className="mt-1 text-sm">{data.key_message}</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <p className="text-xs font-semibold text-muted-foreground">{t.audience}</p>
            <p className="mt-1 text-sm">{data.audience}</p>
          </div>
        </div>
      </div>

      <SectionCard title={t.deliverables}>
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
        <SectionCard title={t.talking}>
          <Bullets items={data.talking_points} />
        </SectionCard>
        <SectionCard title={t.dos}>
          <Bullets items={data.dos} />
        </SectionCard>
        <SectionCard title={t.donts}>
          <Bullets items={data.donts} />
        </SectionCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title={t.timeline}>
          <ol className="relative space-y-3 border-l pl-4 text-sm">
            {data.timeline.map((x, i) => (
              <li key={i}>
                <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-primary" />
                <b>{x.when}</b> — {x.task}
              </li>
            ))}
          </ol>
        </SectionCard>
        <SectionCard title={t.kpi}>
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

      <SectionCard title={t.fee} hint={t.feeHint}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">{t.thTier}</th>
                <th>{t.thFollowers}</th>
                <th>{t.thFee}</th>
                <th className="text-right">{t.thCreators}</th>
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
                <td className="py-2">{t.total}</td>
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

      <SectionCard title={t.dm} hint={<CopyButton text={data.dm_template} />}>
        <p className="rounded-xl border bg-background p-3 text-sm whitespace-pre-wrap">{data.dm_template}</p>
      </SectionCard>

      <SectionCard title={t.contract}>
        <Bullets items={data.contract_points} />
      </SectionCard>
    </div>
  );
}
