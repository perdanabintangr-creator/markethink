"use client";

import { toast } from "sonner";

/** Mulai pembayaran Midtrans: server menghitung harga lalu user diarahkan ke halaman bayar. false bila gagal. */
export async function startCheckout(kind: "plan" | "addon" | "bundle", id: string, failedMsg: string) {
  const res = await fetch("/api/pay/checkout", { method: "POST", body: JSON.stringify({ kind, id }) });
  const data = (await res.json().catch(() => null)) as { redirectUrl?: string } | null;
  if (!res.ok || !data?.redirectUrl) {
    toast.error(failedMsg);
    return false;
  }
  window.location.href = data.redirectUrl;
  return true;
}
