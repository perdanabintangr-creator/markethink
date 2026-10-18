"use client";

import { Fragment } from "react";
import { Send } from "lucide-react";
import { WA_GOAL_LABEL, type WhatsappOutput } from "@/lib/addons/schemas";
import { Bullets, CopyButton, SectionCard, useResultsI18n } from "../common";

/** Render format WhatsApp sederhana: *tebal*, _miring_. */
function WaText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") && p.length > 2 ? (
          <b key={i}>{p.slice(1, -1)}</b>
        ) : p.startsWith("_") && p.endsWith("_") && p.length > 2 ? (
          <i key={i}>{p.slice(1, -1)}</i>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export function WhatsappResult({ data }: { data: WhatsappOutput }) {
  const { t } = useResultsI18n();
  const groups = [...new Set(data.messages.map((m) => m.category))];
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <SectionCard key={g} title={t.labels.waGoal[g] ?? WA_GOAL_LABEL[g]}>
          <div className="grid gap-4 md:grid-cols-2">
            {data.messages
              .filter((m) => m.category === g)
              .map((m, i) => (
                <div key={i} className="flex flex-col rounded-xl bg-[#efeae2] p-3 dark:bg-[#0b141a] print:bg-white">
                  <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">{m.title}</p>
                  <div className="relative ml-auto max-w-[95%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-sm whitespace-pre-wrap text-zinc-900 shadow-sm dark:bg-[#005c4b] dark:text-zinc-50">
                    <WaText text={m.text} />
                    <span className="mt-1 block text-right text-[10px] text-zinc-500 dark:text-zinc-300">{t.whatsapp.time}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400">🕒 {m.when}</p>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">💡 {m.tip}</p>
                  <div className="mt-2 flex gap-2 print:hidden">
                    <CopyButton text={m.text} className="bg-background" />
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(m.text)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs hover:bg-accent"
                    >
                      <Send className="size-3.5" /> {t.whatsapp.openWa}
                    </a>
                  </div>
                </div>
              ))}
          </div>
        </SectionCard>
      ))}
      <SectionCard title={t.whatsapp.safe}>
        <Bullets items={data.broadcast_tips} />
      </SectionCard>
    </div>
  );
}
