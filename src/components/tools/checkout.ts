"use client";

import { preconnect } from "react-dom";
import { toast } from "sonner";

/** Halaman bayar gateway: disambung lebih awal supaya terbuka lebih cepat setelah tombol bayar ditekan. */
const GATEWAY_ORIGINS = ["https://app-prod.duitku.com", "https://app-sandbox.duitku.com", "https://app.midtrans.com", "https://web.mayar.id"];
export function warmPaymentPages() {
  for (const o of GATEWAY_ORIGINS) preconnect(o, { crossOrigin: "anonymous" });
}

/** Lapisan "sedang menyiapkan pembayaran" yang langsung muncul & bertahan sampai halaman bayar terbuka. */
function showOverlay(text: string) {
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.className = "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm";
  el.innerHTML = `<span class="size-9 animate-spin rounded-full border-4 border-primary/25 border-t-primary"></span><p class="text-sm font-medium"></p>`;
  el.querySelector("p")!.textContent = text;
  document.body.appendChild(el);
  return () => el.remove();
}

/** Mulai pembayaran: server menghitung harga lalu user diarahkan ke halaman bayar. false bila gagal. */
export async function startCheckout(kind: "plan" | "addon" | "bundle", id: string, failedMsg: string, openingMsg = "Menyiapkan halaman pembayaran…") {
  const hide = showOverlay(openingMsg);
  try {
    const res = await fetch("/api/pay/checkout", { method: "POST", body: JSON.stringify({ kind, id }) });
    const data = (await res.json().catch(() => null)) as { redirectUrl?: string } | null;
    if (!res.ok || !data?.redirectUrl) throw new Error("checkout");
    // Lapisan tetap tampil sampai browser pindah ke halaman bayar.
    window.location.assign(data.redirectUrl);
    return true;
  } catch {
    hide();
    toast.error(failedMsg);
    return false;
  }
}
