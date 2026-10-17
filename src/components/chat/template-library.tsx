"use client";

import { useState } from "react";
import { LayoutTemplate } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { TEMPLATE_GROUPS, groupForRole, localizeTemplate, type Template } from "@/lib/templates";
import { chatText } from "@/lib/i18n/chat";
import type { Lang } from "@/lib/i18n/dict";

export type { Template };

/** Tombol "Template" → dialog berisi template per peran; memilih template mengisi kotak chat. */
export function TemplateButton({ lang, role, onPick }: { lang: Lang; role?: string | null; onPick: (t: Template) => void }) {
  const c = chatText(lang);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(() => groupForRole(role));
  const group = TEMPLATE_GROUPS.find((g) => g.id === tab) ?? TEMPLATE_GROUPS[0];
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 sm:text-sm"
      >
        <LayoutTemplate className="size-3.5 sm:size-4" /> {c.template}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[88dvh] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-4 py-3 pr-12">
            <DialogTitle className="text-base">{c.templateTitle}</DialogTitle>
            <DialogDescription className="text-xs">{c.templateDesc}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-1 overflow-x-auto border-b px-3 py-2">
            {TEMPLATE_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setTab(g.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-sm transition-colors",
                  g.id === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {lang === "en" ? g.labelEn : g.label}
              </button>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 gap-2 overflow-y-auto p-3 sm:grid-cols-2">
            {group.items.map((item) => localizeTemplate(item, lang)).map((it) => (
              <button
                key={it.title}
                type="button"
                onClick={() => {
                  onPick(it);
                  setOpen(false);
                }}
                className="rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <p className="text-sm font-semibold">{it.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{it.desc}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
