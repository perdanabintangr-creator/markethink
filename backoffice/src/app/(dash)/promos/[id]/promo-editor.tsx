"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { PromoPreview } from "@/components/backoffice/promo-preview";
import { PLAN_IDS, PLAN_NAMES, PROMO_THEMES, THEME_LABEL, type PromoRow, type PromoTheme } from "@/lib/promos";
import { savePromo, type PromoActionState } from "../../../promo-actions";

/** ISO → nilai input datetime-local dalam WIB. */
function isoToWib(iso: string | null) {
  if (!iso) return "";
  return new Date(Date.parse(iso) + 7 * 3_600_000).toISOString().slice(0, 16);
}

export function PromoEditor({ promo }: { promo: PromoRow | null }) {
  const [state, action, pending] = useActionState<PromoActionState, FormData>(savePromo.bind(null, promo?.id ?? null), undefined);
  const [f, setF] = useState({
    title: promo?.title ?? "",
    subtitle: promo?.subtitle ?? "",
    eyebrow: promo?.eyebrow ?? "",
    cta: promo?.cta_label ?? "Lihat",
    theme: (promo?.theme ?? "midnight") as PromoTheme,
    brand: promo?.brand ?? "",
    sponsored: promo?.sponsored ?? false,
  });
  const [preview, setPreview] = useState<string | null>(promo?.image_url ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((v) => ({ ...v, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_auto]">
      <div className="grid max-w-2xl gap-4">
        <div>
          <Link href="/promos" className="text-sm text-muted-foreground hover:text-foreground">
            ← Promosi sidebar
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{promo ? "Edit promosi" : "Promosi baru"}</h1>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Judul (maks 80 karakter)</Label>
          <Input id="title" name="title" value={f.title} onChange={set("title")} maxLength={80} required placeholder="mis. Setiap jawaban dicek Tim Otak" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subtitle">Deskripsi singkat (opsional, maks 160)</Label>
          <Input id="subtitle" name="subtitle" value={f.subtitle} onChange={set("subtitle")} maxLength={160} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="eyebrow">Label kecil di atas (opsional)</Label>
            <Input id="eyebrow" name="eyebrow" value={f.eyebrow} onChange={set("eyebrow")} maxLength={30} placeholder="mis. Baru, Promo" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cta_label">Teks tombol</Label>
            <Input id="cta_label" name="cta_label" value={f.cta} onChange={set("cta")} maxLength={30} required />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="link_url">Link tombol</Label>
          <Input id="link_url" name="link_url" defaultValue={promo?.link_url ?? ""} required placeholder="/pricing atau https://brand-sponsor.com" />
          <p className="text-xs text-muted-foreground">Diawali “/” untuk halaman Marqthink (dibuka di tab yang sama), atau “https://” untuk situs lain (tab baru).</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="theme">Tema warna (bila tanpa gambar)</Label>
            <NativeSelect id="theme" name="theme" value={f.theme} onChange={set("theme")}>
              {PROMO_THEMES.map((t) => (
                <option key={t} value={t}>
                  {THEME_LABEL[t]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="image">Gambar latar (opsional, 600×400 px, maks 2 MB)</Label>
            <Input
              id="image"
              name="image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setRemoveImage(false);
                setPreview(file ? URL.createObjectURL(file) : (promo?.image_url ?? null));
              }}
            />
            {promo?.image_url && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="remove_image"
                  checked={removeImage}
                  onChange={(e) => {
                    setRemoveImage(e.target.checked);
                    setPreview(e.target.checked ? null : promo.image_url);
                  }}
                />
                Hapus gambar (pakai tema warna)
              </label>
            )}
          </div>
        </div>

        <fieldset className="space-y-2 rounded-xl border p-3">
          <legend className="px-1 text-sm font-medium">Sponsor</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="sponsored" checked={f.sponsored} onChange={set("sponsored")} />
            Ini promosi brand lain (tampil label “Sponsor”)
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="brand">Nama brand</Label>
            <Input id="brand" name="brand" value={f.brand} onChange={set("brand")} maxLength={60} placeholder="mis. Kedai Kopi Senja" />
          </div>
        </fieldset>

        <fieldset className="space-y-2 rounded-xl border p-3">
          <legend className="px-1 text-sm font-medium">Siapa yang melihat</legend>
          <div className="flex flex-wrap gap-4">
            {PLAN_IDS.map((id) => (
              <label key={id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="plans" value={id} defaultChecked={!promo?.plans || promo.plans.includes(id)} />
                {PLAN_NAMES[id]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="starts_at">Mulai tayang (WIB, opsional)</Label>
            <Input id="starts_at" name="starts_at" type="datetime-local" defaultValue={isoToWib(promo?.starts_at ?? null)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ends_at">Selesai tayang (WIB, opsional)</Label>
            <Input id="ends_at" name="ends_at" type="datetime-local" defaultValue={isoToWib(promo?.ends_at ?? null)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sort_order">Urutan (kecil = duluan)</Label>
            <Input id="sort_order" name="sort_order" type="number" defaultValue={promo?.sort_order ?? 10} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={promo?.active ?? true} />
          Aktif
        </label>

        {state?.error && <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{state.error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Simpan promosi
          </Button>
          <Button asChild type="button" variant="ghost">
            <Link href="/promos">Batal</Link>
          </Button>
        </div>
      </div>

      <div className="space-y-2 lg:sticky lg:top-6 lg:self-start">
        <p className="text-sm font-medium">Pratinjau</p>
        <PromoPreview
          title={f.title}
          subtitle={f.subtitle}
          eyebrow={f.eyebrow}
          cta={f.cta}
          theme={f.theme}
          image={preview}
          brand={f.brand}
          sponsored={f.sponsored}
        />
        <p className="max-w-[14.5rem] text-xs text-muted-foreground">Tampilan sama dengan kartu di sidebar aplikasi (ganti otomatis tiap 6 detik).</p>
      </div>
    </form>
  );
}
