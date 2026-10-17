"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { BrandKit } from "@/lib/ai/prompt";
import { MOOD_IDS, MOOD_LABELS } from "@/lib/deck/moods";
import { UPLOAD_ERRORS, uploadFile } from "@/lib/upload-client";
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

      <fieldset className="space-y-4 rounded-xl border p-4">
        <legend className="px-1 text-sm font-semibold">Identitas visual</legend>
        <p className="-mt-2 text-xs text-muted-foreground">Otomatis dipakai di PPT, carousel & gambar yang dibuat di project ini.</p>
        <LogoField initial={kit.logo_id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField name="color_primary" label="Warna utama" initial={kit.color_primary} />
          <ColorField name="color_secondary" label="Warna kedua" initial={kit.color_secondary} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="design_mood">Gaya desain</Label>
            <select
              id="design_mood"
              name="design_mood"
              defaultValue={kit.design_mood ?? ""}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Otomatis (sesuai topik)</option>
              {MOOD_IDS.map((m) => (
                <option key={m} value={m}>
                  {MOOD_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="social_handle">Akun media sosial</Label>
            <Input id="social_handle" name="social_handle" defaultValue={kit.social_handle ?? ""} placeholder="@namabrand" maxLength={60} />
          </div>
        </div>
      </fieldset>

      <Button disabled={pending}>{pending && <Loader2 className="animate-spin" />} Simpan Brand Kit</Button>
    </form>
  );
}

function ColorField({ name, label, initial }: { name: string; label: string; initial?: string }) {
  const [value, setValue] = useState(initial ?? "");
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} (pilih)`}
          value={valid ? value : "#2F7BFF"}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1"
        />
        <Input id={name} name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder="#2F7BFF" maxLength={7} />
      </div>
    </div>
  );
}

/** Upload logo (PNG transparan paling bagus) — disimpan sebagai lampiran, id-nya masuk Brand Kit. */
function LogoField({ initial }: { initial?: string }) {
  const [logoId, setLogoId] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function onPick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Logo harus berupa gambar (PNG/JPG/WebP).");
    setBusy(true);
    const res = await uploadFile<{ id: string }>(file, { scope: "chat" });
    setBusy(false);
    if ("error" in res) return toast.error(res.message ?? UPLOAD_ERRORS[res.error] ?? "Gagal upload logo.");
    setLogoId(res.id);
    toast.success("Logo terunggah — klik Simpan Brand Kit.");
  }
  return (
    <div className="space-y-1.5">
      <Label>Logo</Label>
      <input type="hidden" name="logo_id" value={logoId} />
      <div className="flex items-center gap-3">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:12px_12px]">
          {logoId ? (
            // eslint-disable-next-line @next/next/no-img-element -- file pribadi via /api/attachments
            <img src={`/api/attachments/${logoId}`} alt="Logo brand" className="max-h-full max-w-full object-contain" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" />
          )}
        </div>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} {logoId ? "Ganti logo" : "Upload logo"}
        </Button>
        {logoId && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setLogoId("")}>
            <X /> Hapus
          </Button>
        )}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      </div>
      <p className="text-xs text-muted-foreground">Paling bagus PNG transparan.</p>
    </div>
  );
}
