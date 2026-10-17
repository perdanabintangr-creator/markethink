"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Copy, ExternalLink, FileText, Loader2, MessageSquare, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useApp } from "@/components/app/app-context";
import { settingsText } from "@/lib/i18n/settings";
import { revokeShare } from "./actions";

export interface SharedItem {
  kind: "chat" | "canvas";
  id: string;
  title: string;
  token: string;
  updated_at: string;
}

export function SharedLinks({ items }: { items: SharedItem[] }) {
  const t = settingsText(useApp().lang);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const urlOf = (it: SharedItem) => `${location.origin}/share/${it.kind === "canvas" ? "canvas/" : ""}${it.token}`;

  function revoke(it?: SharedItem) {
    setBusy(it?.id ?? "all");
    start(async () => {
      await revokeShare(it ? it.kind : "all", it?.id);
      toast.success(it ? t.linkRevoked : t.allLinksRevoked);
      setBusy(null);
    });
  }

  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        {t.noSharedLinks}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {confirmDialog}
      <ul className="divide-y rounded-xl border">
        {items.map((it) => (
          <li key={`${it.kind}-${it.id}`} className="flex items-center gap-3 px-3 py-2.5">
            {it.kind === "chat" ? <MessageSquare className="size-4 shrink-0 text-muted-foreground" /> : <FileText className="size-4 shrink-0 text-muted-foreground" />}
            <div className="min-w-0 flex-1">
              <Link href={it.kind === "chat" ? `/chat/${it.id}` : `/share/canvas/${it.token}`} className="block truncate text-sm hover:underline">
                {it.title}
              </Link>
              <p className="text-xs text-muted-foreground">
                {it.kind === "chat" ? t.kindChat : t.kindDoc} · {new Date(it.updated_at).toLocaleDateString(t.locale, { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={t.copyLink}
              onClick={() => navigator.clipboard.writeText(urlOf(it)).then(() => toast.success(t.linkCopied))}
            >
              <Copy />
            </Button>
            <Button asChild size="icon" variant="ghost" aria-label={t.openLink}>
              <a href={`/share/${it.kind === "canvas" ? "canvas/" : ""}${it.token}`} target="_blank" rel="noreferrer">
                <ExternalLink />
              </a>
            </Button>
            <Button type="button" size="icon" variant="ghost" aria-label={t.revokeLink} disabled={pending} onClick={() => revoke(it)}>
              {busy === it.id ? <Loader2 className="animate-spin" /> : <Unlink />}
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={async () => {
            if (await confirm({ title: t.revokeAllTitle, description: t.revokeAllDesc, confirmLabel: t.revokeAllConfirm })) revoke();
          }}
        >
          {busy === "all" && <Loader2 className="animate-spin" />} {t.revokeAll}
        </Button>
      </div>
    </div>
  );
}
