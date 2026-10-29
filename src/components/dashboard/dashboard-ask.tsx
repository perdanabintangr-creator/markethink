"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { workspaceUiText } from "@/lib/i18n/workspace-ui";
import type { Lang } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

/** Kotak tanya di Dashboard: membuka chat baru dan langsung mengirim pertanyaannya. */
export function DashboardAsk({ lang, researchAllowed }: { lang: Lang; researchAllowed: boolean }) {
  const t = workspaceUiText(lang);
  const router = useRouter();
  const [text, setText] = useState("");
  const [research, setResearch] = useState(false);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const q = text.trim();
    if (!q) return;
    router.push(`/chat?prompt=${encodeURIComponent(q)}${research ? "&research=1" : ""}`);
  }

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-2 pl-3 shadow-xs transition-shadow focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring/30">
      <div className="flex items-start gap-2.5">
        <span className="mt-1.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary-2 text-white">
          <Sparkles className="size-3.5" />
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
          }}
          rows={1}
          maxLength={4000}
          placeholder={t.askPlaceholder}
          className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none [field-sizing:content] placeholder:text-muted-foreground"
        />
      </div>
      <div className="mt-1 flex items-center gap-2 pl-8">
        {researchAllowed && (
          <button
            type="button"
            onClick={() => setResearch((v) => !v)}
            aria-pressed={research}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground",
              research && "border-primary/50 bg-primary/10 text-primary",
            )}
          >
            <Globe className="size-3.5" /> {t.research}
          </button>
        )}
        <div className="flex-1" />
        <Button type="submit" size="sm" disabled={!text.trim()}>
          <Send /> {t.send}
        </Button>
      </div>
    </form>
  );
}
