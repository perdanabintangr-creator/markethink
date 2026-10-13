"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { recordAddonSale, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { PAYMENT_METHODS, rupiah } from "@/lib/backoffice-format";

const today = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

/** Catat pembelian add-on untuk satu pelanggan. Nominal otomatis = harga × bulan (bisa diubah). */
export function AddonSaleForm({ userId, addons }: { userId: string; addons: { id: string; name: string; price: number }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(recordAddonSale, undefined);
  const [addon, setAddon] = useState(addons[0]?.id ?? "");
  const [months, setMonths] = useState(1);
  const price = addons.find((a) => a.id === addon)?.price ?? 0;
  const [amount, setAmount] = useState(String(price));
  const edited = useRef(false);

  useEffect(() => {
    if (!edited.current) setAmount(String(price * months));
  }, [price, months]);
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.ok);
      edited.current = false;
      setMonths(1);
      setAmount(String(price));
    } else if (state?.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <input type="hidden" name="user_id" value={userId} />
      <div className="space-y-1.5">
        <Label>Add-on</Label>
        <NativeSelect name="addon_id" value={addon} onChange={(e) => setAddon(e.target.value)}>
          {addons.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({rupiah(a.price)})
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label>Durasi</Label>
        <NativeSelect name="months" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
          {[1, 3, 6, 12].map((m) => (
            <option key={m} value={m}>
              {m} bulan
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label>Nominal (Rp)</Label>
        <Input
          name="amount"
          inputMode="numeric"
          value={amount}
          onChange={(e) => {
            edited.current = true;
            setAmount(e.target.value.replace(/\D/g, ""));
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Metode bayar</Label>
        <NativeSelect name="method" defaultValue="Transfer bank">
          {PAYMENT_METHODS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label>Tanggal bayar</Label>
        <Input name="paid_at" type="date" defaultValue={today()} max={today()} />
      </div>
      <div className="space-y-1.5">
        <Label>Catatan</Label>
        <Input name="note" maxLength={500} placeholder="opsional" />
      </div>
      <div className="sm:col-span-3">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Aktifkan add-on & catat penjualan
        </Button>
      </div>
    </form>
  );
}
