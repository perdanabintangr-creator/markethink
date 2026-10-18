"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useApp } from "@/components/app/app-context";
import { CONNECTOR_APPS, type ConnectorStatus } from "@/lib/connectors/apps";
import { connectorsText } from "@/lib/i18n/connectors";
import { AppIcon } from "./app-icon";
import { goConnectCanva } from "./canva-button";
import { refreshConnectors, useConnectorReturnNotice } from "./use-connectors";

/** Pengaturan → Aplikasi terhubung: hubungkan / putuskan Canva. */
export function ConnectedApps({ statuses }: { statuses: ConnectorStatus[] }) {
  const { lang } = useApp();
  const c = connectorsText(lang);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  useConnectorReturnNotice(lang);

  async function disconnect() {
    if (!(await confirm({ title: c.disconnect, description: c.disconnectConfirm, confirmLabel: c.disconnect, destructive: true }))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/connectors/canva/disconnect", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      toast.success(c.toastDisconnected);
      void refreshConnectors();
      router.refresh();
    } catch {
      toast.error(c.toastError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="divide-y rounded-xl border">
      {CONNECTOR_APPS.map((app) => {
        const s = statuses.find((x) => x.id === app.id);
        return (
          <div key={app.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <AppIcon id={app.icon} className="size-9 text-sm" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {app.name}
                  {s?.enabled && (
                    <span
                      className={
                        s.connected
                          ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
                          : "rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                      }
                    >
                      {s.connected ? c.connected : c.notConnected}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {!s?.enabled ? c.notConfigured : s.connected && s.accountName ? c.connectedAs(s.accountName) : c.canvaDesc}
                </p>
              </div>
            </div>
            {s?.enabled && (
              <div className="shrink-0">
                {s.connected ? (
                  <Button size="sm" variant="outline" onClick={disconnect} disabled={busy}>
                    {busy && <Loader2 className="animate-spin" />} {c.disconnect}
                  </Button>
                ) : (
                  <Button size="sm" onClick={goConnectCanva}>
                    {c.connect}
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {confirmDialog}
    </div>
  );
}
