"use client";

import Link from "next/link";
import { AlertTriangle, CalendarClock, Download, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Part {
  toolCallId?: string;
  state?: "input-streaming" | "input-available" | "output-available" | "output-error";
  output?: Record<string, unknown> & { ok?: boolean; error?: string };
}

const DAYS = { id: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
const DESIGN: Record<string, string> = { glossy: "Glossy 3D", bold: "Bold", photo: "Photo", classic: "Classic" };

/** Kartu hasil tool `instagram_post`: pratinjau slide studio + jadwal + status pemeriksaan, tombol ke halaman ACC. */
export function InstagramPostResult({ part, streaming, lang }: { part: Part; streaming: boolean; lang: "id" | "en" }) {
  const en = lang === "en";
  if (part.state === "output-error") return <Err msg={en ? "Couldn't create the Instagram post." : "Gagal membuat konten Instagram."} />;
  if (part.state !== "output-available" || !part.output)
    return (
      <div className="flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary">
        {streaming ? <Loader2 className="size-3.5 animate-spin" /> : <Rocket className="size-3.5" />}
        {part.state === "input-streaming" ? (en ? "Writing the slides…" : "Menulis slide…") : en ? "Designing & creating the main visual…" : "Mendesain & membuat visual utama…"}
      </div>
    );
  const o = part.output;
  if (!o.ok) return <Err msg={String(o.error ?? "")} />;
  const previews = (o.previews as string[]) ?? [];
  const fails = (o.fails as string[]) ?? [];
  const date = String(o.date);
  const d = new Date(`${date}T00:00:00Z`);
  const when = `${DAYS[lang][d.getUTCDay()]}, ${d.getUTCDate()}/${d.getUTCMonth() + 1} · ${String(o.time)}`;
  return (
    <div className="max-w-xl overflow-hidden rounded-xl border bg-card">
      <div className="flex gap-2 overflow-x-auto bg-[#0A0F23] p-3">
        {previews.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt={`Slide ${i + 1}`} loading="lazy" className="aspect-[4/5] shrink-0 rounded-md object-cover ring-1 ring-white/10" style={{ width: previews.length === 1 ? 220 : 150 }} />
        ))}
      </div>
      <div className="space-y-2 border-t px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">{DESIGN[String(o.design)] ?? String(o.design)}</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <CalendarClock className="size-3.5" /> {when}
          </span>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400">{en ? "Awaiting approval" : "Menunggu ACC"}</span>
        </div>
        <p className="truncate text-sm font-semibold">{String(o.title)}</p>
        {fails.map((f) => (
          <p key={f} className="flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="size-3" /> {f}
          </p>
        ))}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm" className="rounded-full">
            <Link href="/autopilot">
              <Rocket /> {en ? "Review & approve" : "Cek & ACC di Autopilot"}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <a href={`/api/autopilot/posts/${String(o.postId)}/download`}>
              <Download /> {en ? "Download" : "Unduh"}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return <p className="w-fit rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{msg}</p>;
}
