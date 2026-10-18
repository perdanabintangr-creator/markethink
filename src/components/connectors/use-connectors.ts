"use client";

import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { ConnectorId, ConnectorStatus } from "@/lib/connectors/apps";
import { connectorsText } from "@/lib/i18n/connectors";
import type { Lang } from "@/lib/i18n/dict";

/** Status aplikasi terhubung (satu permintaan per halaman, dibagi semua komponen). */

let state: ConnectorStatus[] | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function refreshConnectors() {
  inflight = fetch("/api/connectors", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { apps: [] }))
    .then((d: { apps?: ConnectorStatus[] }) => {
      state = d.apps ?? [];
    })
    .catch(() => {
      state = state ?? [];
    })
    .finally(() => {
      inflight = null;
      emit();
    });
  return inflight;
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (!state && !inflight) void refreshConnectors();
  return () => listeners.delete(l);
}

/** null = sedang dimuat. */
export function useConnectors(): ConnectorStatus[] | null {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => null,
  );
}

export function useConnector(id: ConnectorId): ConnectorStatus | null | undefined {
  const all = useConnectors();
  return all === null ? null : all.find((a) => a.id === id);
}

let noticeShown = false;

/** Setelah kembali dari Canva (?canva=connected|denied|error|disabled): tampilkan notifikasi lalu bersihkan URL. */
export function useConnectorReturnNotice(lang: Lang) {
  useEffect(() => {
    if (noticeShown) return;
    const url = new URL(window.location.href);
    const v = url.searchParams.get("canva");
    if (!v) return;
    noticeShown = true;
    const c = connectorsText(lang);
    if (v === "connected") toast.success(c.toastConnected);
    else if (v === "denied") toast(c.toastDenied);
    else if (v === "disabled") toast(c.toastDisabled);
    else toast.error(c.toastError);
    url.searchParams.delete("canva");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    void refreshConnectors();
  }, [lang]);
}
