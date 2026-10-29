"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, FileText, FolderOpen, Globe, Image as ImageIcon, Lightbulb, MessageSquareText, X } from "lucide-react";
import { workspaceUiText } from "@/lib/i18n/workspace-ui";
import type { Lang } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

interface ContextData {
  project: { id: string; name: string; kit: Record<string, string> } | null;
  files: { name: string; mime: string }[];
  fileCount: number;
  memories: string[];
  memoryCount: number;
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Panel kanan di chat (gaya aplikasi SaaS): apa saja yang "dibaca" AI di ruang chat ini. */
export function ContextPanel({
  lang,
  workspaceId,
  brainLabel,
  research,
  refreshKey,
  onClose,
}: {
  lang: Lang;
  workspaceId: string | null;
  brainLabel: string;
  research: boolean;
  /** Berubah setelah AI selesai menjawab → memory terbaru dimuat ulang. */
  refreshKey: number;
  onClose: () => void;
}) {
  const t = workspaceUiText(lang);
  const [data, setData] = useState<ContextData | null>(null);

  useEffect(() => {
    let alive = true;
    void fetch(`/api/chat-context${workspaceId ? `?workspace=${workspaceId}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ContextData | null) => alive && d && setData(d))
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, [workspaceId, refreshKey]);

  const kit = data?.project?.kit ?? {};
  const kitRows: [string, string | undefined][] = [
    [t.kitProducts, kit.products],
    [t.kitTarget, kit.target_audience],
    [t.kitVoice, kit.brand_voice],
    [t.kitUsp, kit.usp],
    [t.kitChannels, kit.channels],
    [t.kitHandle, kit.social_handle],
  ];
  const colors = [kit.color_primary, kit.color_secondary].filter((c): c is string => Boolean(c && HEX.test(c)));
  const kitEmpty = !kitRows.some(([, v]) => v) && !colors.length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b px-4">
        <p className="text-sm font-semibold">{t.context}</p>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={t.hideContext}>
          <X className="size-4" />
        </button>
      </div>
      <div className={cn("flex-1 space-y-5 overflow-y-auto p-4 text-sm transition-opacity", !data && "opacity-60")}>
        <Section icon={FolderOpen} title={t.ctxProject}>
          {workspaceId && data?.project ? (
            <>
              <p className="font-medium">{data.project.name}</p>
              {kitEmpty ? (
                <p className="mt-1 text-xs text-muted-foreground">{t.ctxKitEmpty}</p>
              ) : (
                <dl className="mt-2 space-y-1.5">
                  {kitRows.map(([label, value]) =>
                    value ? (
                      <div key={label} className="grid grid-cols-[5.5rem_1fr] gap-2 text-xs">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="line-clamp-2 break-words">{value}</dd>
                      </div>
                    ) : null,
                  )}
                  {colors.length > 0 && (
                    <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2 text-xs">
                      <dt className="text-muted-foreground">{t.kitColors}</dt>
                      <dd className="flex gap-1.5">
                        {colors.map((c) => (
                          <span key={c} title={c} className="size-5 rounded-md border" style={{ background: c }} />
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
              <Link href={`/workspaces/${data.project.id}`} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                {t.ctxEditKit}
              </Link>
            </>
          ) : (
            <>
              <p className="font-medium">{t.ctxGeneral}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.ctxGeneralHint}</p>
            </>
          )}
        </Section>

        {workspaceId && (
          <Section icon={FileText} title={t.ctxFiles(data?.fileCount ?? 0)}>
            {data?.files.length ? (
              <ul className="space-y-1">
                {data.files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    {f.mime.startsWith("image/") ? <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" /> : <FileText className="size-3.5 shrink-0 text-muted-foreground" />}
                    <span className="truncate">{f.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">{t.ctxFilesEmpty}</p>
            )}
            <Link href={`/workspaces/${workspaceId}`} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
              {t.ctxManageFiles}
            </Link>
          </Section>
        )}

        <Section icon={Lightbulb} title={t.ctxMemory(data?.memoryCount ?? 0)}>
          {data?.memories.length ? (
            <ul className="space-y-1.5">
              {data.memories.map((m, i) => (
                <li key={i} className="line-clamp-3 rounded-md bg-muted/60 px-2 py-1.5 text-xs">
                  {m}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">{t.ctxMemoryEmpty}</p>
          )}
          <Link href="/settings?tab=memori" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
            {t.ctxManageMemory}
          </Link>
        </Section>

        <Section icon={MessageSquareText} title={t.ctxSession}>
          <dl className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <Brain className="size-3.5" /> {t.ctxBrain}
              </dt>
              <dd className="font-medium">{brainLabel}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <Globe className="size-3.5" /> {t.ctxResearch}
              </dt>
              <dd className={cn("font-medium", research ? "text-primary" : "text-muted-foreground")}>{research ? t.on : t.off}</dd>
            </div>
          </dl>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {title}
      </h3>
      {children}
    </section>
  );
}
