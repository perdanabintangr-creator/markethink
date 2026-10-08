"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { BrandKit } from "@/lib/ai/prompt";
import { saveBrandKit } from "../actions";

const FIELDS: { key: keyof BrandKit; label: string; placeholder: string; long?: boolean }[] = [
  { key: "products", label: "Produk / jasa", placeholder: "Apa yang dijual, varian, harga", long: true },
  { key: "target_audience", label: "Target audience", placeholder: "Usia, lokasi, kebiasaan, pain point", long: true },
  { key: "brand_voice", label: "Brand voice", placeholder: "mis. santai, hangat, sedikit jenaka; hindari bahasa kaku" },
  { key: "usp", label: "USP", placeholder: "Kenapa orang harus pilih brand ini", long: true },
  { key: "competitors", label: "Kompetitor", placeholder: "Nama kompetitor & bedanya" },
  { key: "channels", label: "Channel aktif", placeholder: "IG, TikTok, Shopee, WhatsApp, website" },
  { key: "budget_range", label: "Budget range", placeholder: "mis. Rp5–15 juta/bulan" },
  { key: "notes", label: "Catatan lain", placeholder: "Do & don't, momen penting, dll", long: true },
];

export function BrandKitForm({ workspaceId, name, kit }: { workspaceId: string; name: string; kit: BrandKit }) {
  const [state, action, pending] = useActionState(saveBrandKit.bind(null, workspaceId), undefined);
  useEffect(() => {
    if (state?.ok) toast.success("Brand Kit tersimpan");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nama brand</Label>
        <Input id="name" name="name" defaultValue={name} required maxLength={80} />
      </div>
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={f.key}>{f.label}</Label>
          {f.long ? (
            <Textarea id={f.key} name={f.key} defaultValue={kit[f.key] ?? ""} placeholder={f.placeholder} rows={3} maxLength={2000} />
          ) : (
            <Input id={f.key} name={f.key} defaultValue={kit[f.key] ?? ""} placeholder={f.placeholder} maxLength={2000} />
          )}
        </div>
      ))}
      <Button disabled={pending}>{pending && <Loader2 className="animate-spin" />} Simpan Brand Kit</Button>
    </form>
  );
}
