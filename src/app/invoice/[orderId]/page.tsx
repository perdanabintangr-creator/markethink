import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/auth";
import { BRAND_CONTACT } from "@/lib/brand";
import { invoiceRows, rupiah } from "@/lib/invoice";
import { loadInvoice } from "@/lib/payments/receipt";
import { createAdminClient } from "@/lib/supabase/admin";
import { PrintButton } from "./print-button";

export const metadata = { title: "Invoice", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Invoice / bukti bayar — hanya pemilik pembayaran yang bisa membuka. Bisa dicetak atau disimpan sebagai PDF. */
export default async function InvoicePage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { user } = await requireUser({ allowNotOnboarded: true });
  const inv = /^MTK-[PAB]-[a-z0-9-]+$/i.test(orderId) ? await loadInvoice(createAdminClient(), orderId, user.id) : null;
  if (!inv) notFound();
  const c = BRAND_CONTACT as { email: string; whatsapp: string; address: string; nib?: string };

  return (
    <div className="min-h-dvh bg-muted/40 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-2xl justify-end print:hidden">
        <PrintButton />
      </div>
      <article className="mx-auto max-w-2xl overflow-hidden rounded-2xl border bg-white text-[#0b1220] shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <div className="h-1.5 bg-gradient-to-r from-[#0a6cff] to-[#12d0f5]" />
        <div className="p-8 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <Logo />
              <p className="mt-3 max-w-xs text-xs leading-relaxed text-slate-500">
                {c.address}
                {c.nib && <><br />NIB {c.nib}</>}
                {c.email && <><br />{c.email}</>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold tracking-tight">INVOICE</p>
              <p className="mt-1 font-mono text-sm text-slate-600">{inv.orderId}</p>
              <span className="mt-2 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">LUNAS</span>
            </div>
          </div>

          <table className="mt-8 w-full text-sm">
            <tbody>
              {invoiceRows(inv)
                .filter(([k]) => k !== "Status" && k !== "No. invoice")
                .map(([k, v]) => (
                  <tr key={k} className="border-b border-slate-100">
                    <td className="w-40 py-3 align-top text-slate-500">{k}</td>
                    <td className="py-3 font-medium">{v}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-50 px-5 py-4">
            <span className="font-semibold">Total dibayar</span>
            <span className="text-2xl font-extrabold text-[#0a6cff]">{rupiah(inv.amount)}</span>
          </div>

          <p className="mt-8 text-xs leading-relaxed text-slate-500">
            Invoice ini sah tanpa tanda tangan karena dibuat otomatis oleh sistem Marqthink. Langganan tidak diperpanjang otomatis.
            Ketentuan pengembalian dana: marqthink.com/refund. Pertanyaan: marqthink.com/kontak.
          </p>
        </div>
      </article>
    </div>
  );
}
