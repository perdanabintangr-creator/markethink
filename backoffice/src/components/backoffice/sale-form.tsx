"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { recordSale, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { PAYMENT_METHODS, rupiah } from "@/lib/backoffice-format";

const MONTHS = [1, 3, 6, 12];
const today = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

/**
 * Form catat penjualan manual. Nominal otomatis = harga paket × durasi (bisa diubah, mis. ada diskon).
 * Tanpa `userId` → isi email pelanggan.
 */
export function SaleForm({ userId, prices, defaultPlan = "pro" }: { userId?: string; prices: Record<string, number>; defaultPlan?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(recordSale, undefined);
  const [plan, setPlan] = useState(defaultPlan === "promax" ? "promax" : "pro");
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState(String((prices[plan] ?? 0) * 1));
  const edited = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!edited.current) setAmount(String((prices[plan] ?? 0) * months));
  }, [plan, months, prices]);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.ok);
      edited.current = false;
      formRef.current?.reset();
      setMonths(1);
      setAmount(String(prices[plan] ?? 0));
    } else if (state?.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-2">
      {userId ? (
        <input type="hidden" name="user_id" value={userId} />
      ) : (
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="sale-email">Email pelanggan</Label>
          <Input id="sale-email" name="email" type="email" required placeholder="email akun Markethink pelanggan" />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="sale-plan">Paket</Label>
        <NativeSelect id="sale-plan" name="plan_id" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="pro">Pro</option>
          <option value="promax">Promax</option>
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sale-months">Durasi</Label>
        <NativeSelect id="sale-months" name="months" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
          {MONTHS.map((m) => (
            <option key={m} value={m}>{m} bulan</option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sale-amount">Nominal dibayar (Rp)</Label>
        <Input
          id="sale-amount"
          name="amount"
          inputMode="numeric"
          required
          value={amount}
          onChange={(e) => {
            edited.current = true;
            setAmount(e.target.value.replace(/\D/g, ""));
          }}
        />
        <p className="text-xs text-muted-foreground">
          {rupiah(amount || 0)}
          {!prices[plan] && " · harga paket belum diatur (menu Penjualan)"}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sale-method">Metode bayar</Label>
        <NativeSelect id="sale-method" name="method" defaultValue="Transfer bank">
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sale-date">Tanggal bayar</Label>
        <Input id="sale-date" name="paid_at" type="date" defaultValue={today()} max={today()} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sale-note">Catatan (opsional)</Label>
        <Input id="sale-note" name="note" maxLength={500} placeholder="mis. no. invoice, kode promo" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Simpan penjualan & aktifkan paket
        </Button>
      </div>
    </form>
  );
}
