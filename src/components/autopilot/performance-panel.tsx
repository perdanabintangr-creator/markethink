"use client";

import { Bookmark, Eye, MessageCircle, Share2, TrendingUp } from "lucide-react";
import { engagementScore, formatOf, type MediaStat } from "@/lib/autopilot/performance";

const fmt = (n: number) => (n >= 10_000 ? `${(n / 1000).toFixed(0)}rb` : n >= 1000 ? `${(n / 1000).toFixed(1)}rb` : String(n));

/** Ringkasan performa Instagram 30 hari + 3 post terbaik (dipakai juga oleh AI untuk konten berikutnya). */
export function PerformancePanel({ rows, lang }: { rows: MediaStat[]; lang: "id" | "en" }) {
  if (rows.length < 3) return null;
  const en = lang === "en";
  const sum = (k: "reach" | "saved" | "shares" | "comments") => rows.reduce((a, r) => a + (r[k] ?? 0), 0);
  const top = [...rows].sort((a, b) => engagementScore(b) - engagementScore(a)).slice(0, 3);
  const stats = [
    { icon: Eye, label: en ? "Reach" : "Jangkauan", v: sum("reach") },
    { icon: Bookmark, label: en ? "Saves" : "Simpan", v: sum("saved") },
    { icon: Share2, label: en ? "Shares" : "Share", v: sum("shares") },
    { icon: MessageCircle, label: en ? "Comments" : "Komentar", v: sum("comments") },
  ];
  return (
    <section className="mt-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="size-4 text-primary" /> {en ? "Last 30 days performance" : "Performa 30 hari terakhir"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {en ? `${rows.length} posts · the AI team learns from this for next week` : `${rows.length} post · tim AI belajar dari sini untuk minggu depan`}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-muted/50 p-3">
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <s.icon className="size-3.5" /> {s.label}
            </p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{fmt(s.v)}</p>
          </div>
        ))}
      </div>
      <p className="mb-2 mt-4 text-xs font-medium text-muted-foreground">{en ? "Top posts" : "Post terbaik"}</p>
      <ol className="space-y-1.5">
        {top.map((m, i) => (
          <li key={m.ig_media_id} className="flex items-center gap-3 text-sm">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
            <a href={m.permalink ?? undefined} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate hover:underline">
              {(m.caption ?? "").split("\n")[0] || "—"}
            </a>
            <span className="shrink-0 text-xs capitalize text-muted-foreground">{formatOf(m)}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {fmt(m.reach)} · {fmt(m.saved)} {en ? "saves" : "simpan"}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
