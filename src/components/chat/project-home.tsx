"use client";

import Link from "next/link";
import { FileText, FolderOpen, MessageSquare, Palette, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/app/app-context";
import { chatText } from "@/lib/i18n/chat";

export interface ProjectHomeData {
  id: string;
  name: string;
  chats: { id: string; title: string; updated_at: string }[];
  fileCount: number;
  logoId?: string | null;
  colors: string[];
  brandFilled: boolean;
}

function when(iso: string, locale: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 86_400_000;
  if (diff < 1) return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (diff < 7) return d.toLocaleDateString(locale, { weekday: "long" });
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: diff > 300 ? "numeric" : undefined });
}

/** Halaman depan project (seperti Projects di ChatGPT/Claude): identitas project, kotak chat baru, & daftar chat di dalamnya. */
export function ProjectHome({ project, composer, extras }: { project: ProjectHomeData; composer: React.ReactNode; extras?: React.ReactNode }) {
  const c = chatText(useApp().lang);
  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-4 sm:py-12">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-primary/10 text-primary">
          {project.logoId ? (
            // eslint-disable-next-line @next/next/no-img-element -- file pribadi via /api/attachments
            <img src={`/api/attachments/${project.logoId}`} alt="" className="max-h-full max-w-full object-contain p-1" />
          ) : (
            <FolderOpen className="size-6" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.project}</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Palette className="size-3.5" />
              {project.brandFilled ? c.brandKitActive : c.brandKitEmpty}
              {project.colors.map((c) => (
                <span key={c} className="inline-block size-3 rounded-full ring-1 ring-black/10" style={{ background: c }} />
              ))}
            </span>
            <span className="inline-flex items-center gap-1">
              <FileText className="size-3.5" /> {c.knowledgeFiles(project.fileCount)}
            </span>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={`/workspaces/${project.id}`}>
            <Settings /> <span className="hidden sm:inline">{c.brandKitFiles}</span>
          </Link>
        </Button>
      </div>

      {composer}
      {extras}

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold">{c.chatsInProject}</h2>
        {project.chats.length ? (
          <ul className="divide-y rounded-xl border">
            {project.chats.map((ch) => (
              <li key={ch.id}>
                <Link href={`/chat/${ch.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent">
                  <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm">{ch.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{when(ch.updated_at, c.dateLocale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {c.noChatsInProject}
          </p>
        )}
      </section>
    </div>
  );
}
