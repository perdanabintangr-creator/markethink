"use client";

import Link from "next/link";
import { FileText, FolderOpen, MessageSquare, Palette, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ProjectHomeData {
  id: string;
  name: string;
  chats: { id: string; title: string; updated_at: string }[];
  fileCount: number;
  logoId?: string | null;
  colors: string[];
  brandFilled: boolean;
}

function when(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 86_400_000;
  if (diff < 1) return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (diff < 7) return d.toLocaleDateString("id-ID", { weekday: "long" });
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: diff > 300 ? "numeric" : undefined });
}

/** Halaman depan project (seperti Projects di ChatGPT/Claude): identitas project, kotak chat baru, & daftar chat di dalamnya. */
export function ProjectHome({ project, composer, extras }: { project: ProjectHomeData; composer: React.ReactNode; extras?: React.ReactNode }) {
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
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Project</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Palette className="size-3.5" />
              {project.brandFilled ? "Brand Kit aktif" : "Brand Kit belum diisi"}
              {project.colors.map((c) => (
                <span key={c} className="inline-block size-3 rounded-full ring-1 ring-black/10" style={{ background: c }} />
              ))}
            </span>
            <span className="inline-flex items-center gap-1">
              <FileText className="size-3.5" /> {project.fileCount} file knowledge
            </span>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={`/workspaces/${project.id}`}>
            <Settings /> <span className="hidden sm:inline">Brand Kit & file</span>
          </Link>
        </Button>
      </div>

      {composer}
      {extras}

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold">Chat di project ini</h2>
        {project.chats.length ? (
          <ul className="divide-y rounded-xl border">
            {project.chats.map((c) => (
              <li key={c.id}>
                <Link href={`/chat/${c.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent">
                  <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm">{c.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{when(c.updated_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Belum ada chat. Mulai chat pertama di atas — semua chat di sini otomatis memakai Brand Kit & file project ini.
          </p>
        )}
      </section>
    </div>
  );
}
