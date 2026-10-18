"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/app/app-context";
import { connectUrlFor } from "@/lib/connectors/apps";
import { connectorsText } from "@/lib/i18n/connectors";
import { AppIcon } from "./app-icon";
import { refreshConnectors, useConnector } from "./use-connectors";

const currentPath = () => `${window.location.pathname}${window.location.search}`;

/** Arahkan ke halaman izin Canva; setelah selesai kembali ke halaman ini. */
export function goConnectCanva() {
  window.location.href = connectUrlFor("canva", currentPath());
}

/** Tombol kecil "Edit di Canva" di kartu hasil (PPT, carousel, gambar). Tersembunyi bila integrasi Canva belum aktif. */
export function EditInCanvaButton({ attachmentId, title, size = "sm" }: { attachmentId: string | null; title?: string; size?: "sm" | "xs" }) {
  const { lang } = useApp();
  const c = connectorsText(lang);
  const status = useConnector("canva");
  const [busy, setBusy] = useState(false);
  const [editUrl, setEditUrl] = useState<string | null>(null);

  if (!attachmentId || !status?.enabled) return null;
  const cls = size === "xs" ? "h-7 px-2 text-[11px]" : undefined;

  if (editUrl) {
    return (
      <Button asChild size="sm" variant="outline" className={cls}>
        <a href={editUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink /> {c.openInCanva}
        </a>
      </Button>
    );
  }

  async function send() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/connectors/canva/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId, title, returnPath: currentPath() }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; editUrl?: string; needsConnect?: boolean; connectUrl?: string; error?: string };
      if (data.ok && data.editUrl) {
        const url = data.editUrl;
        setEditUrl(url);
        toast.success(c.sentToCanva, {
          description: c.sentToCanvaDesc(title ?? ""),
          action: { label: c.openInCanva, onClick: () => window.open(url, "_blank", "noopener,noreferrer") },
        });
        return;
      }
      if (data.needsConnect) {
        // Belum terhubung: langsung ke halaman izin Canva, lalu kembali ke halaman ini.
        void refreshConnectors();
        toast(c.needsConnectDesc);
        if (data.connectUrl?.startsWith("/api/connectors/")) window.location.href = data.connectUrl;
        else goConnectCanva();
        return;
      }
      toast.error(data.error ?? c.canvaFailed);
    } catch {
      toast.error(c.errors.network);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={send} disabled={busy} className={cls} title={c.editInCanva}>
      {busy ? <Loader2 className="animate-spin" /> : <AppIcon id="canva" className="size-4 text-[9px]" />}
      {busy ? c.sendingToCanva : c.editInCanva}
    </Button>
  );
}
