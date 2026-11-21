"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Loader2, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { uploadFile, UPLOAD_ERRORS } from "@/lib/upload-client";

export interface ProductItem {
  id: string;
  name: string;
  sku: string | null;
  price: string | null;
  description: string | null;
  photo_paths: string[];
  active: boolean;
  updated_at: string;
}

const T = {
  id: {
    title: "Produk (SKU)",
    sub: "Daftarkan produk kamu. Tim AI membuat konten bergiliran per produk dan memakai foto aslinya (kemasan, logo & tulisan tidak diubah).",
    add: "Tambah produk",
    empty: "Belum ada produk. Tambahkan produk supaya konten promosi menampilkan produk asli kamu.",
    name: "Nama produk",
    sku: "SKU (opsional)",
    price: "Harga (opsional)",
    desc: "Keunggulan / deskripsi singkat",
    photos: "Foto produk (maks 3, foto HP biasa sudah cukup)",
    active: "Ikut ditampilkan di konten",
    save: "Simpan",
    cancel: "Batal",
    saved: "Produk tersimpan",
    deleted: "Produk dihapus",
    err: "Gagal menyimpan. Coba lagi.",
    off: "Tidak ditampilkan",
    count: (n: number) => `${n} produk`,
  },
  en: {
    title: "Products (SKU)",
    sub: "Add your products. The AI team rotates content per product and uses the real photos (packaging, logo & text unchanged).",
    add: "Add product",
    empty: "No products yet. Add products so promo content shows your real items.",
    name: "Product name",
    sku: "SKU (optional)",
    price: "Price (optional)",
    desc: "Key benefits / short description",
    photos: "Product photos (max 3, phone photos are fine)",
    active: "Include in content",
    save: "Save",
    cancel: "Cancel",
    saved: "Product saved",
    deleted: "Product deleted",
    err: "Couldn't save. Please try again.",
    off: "Hidden",
    count: (n: number) => `${n} products`,
  },
};

type Draft = { id?: string; name: string; sku: string; price: string; description: string; active: boolean; files: File[]; keepPhotos: number };
const EMPTY: Draft = { name: "", sku: "", price: "", description: "", active: true, files: [], keepPhotos: 0 };
const input = "h-10 w-full rounded-lg border bg-background px-3 text-sm";

export function ProductsSection({ lang, workspaceId, products }: { lang: "id" | "en"; workspaceId: string | null; products: ProductItem[] }) {
  const t = T[lang];
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function save() {
    if (!draft?.name.trim()) return;
    setBusy("save");
    const ids: string[] = [];
    for (const f of draft.files.slice(0, 3)) {
      const r = await uploadFile<{ id: string }>(f, { scope: "chat" });
      if ("error" in r) toast.error(UPLOAD_ERRORS[r.error] ?? r.message ?? t.err);
      else ids.push(r.id);
    }
    const res = await fetch("/api/autopilot/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: draft.id,
        name: draft.name,
        sku: draft.sku || null,
        price: draft.price || null,
        description: draft.description || null,
        active: draft.active,
        attachmentIds: ids,
        replacePhotos: Boolean(draft.id && ids.length && draft.keepPhotos === 0),
        workspaceId: draft.id ? undefined : workspaceId,
      }),
    });
    setBusy(null);
    if (!res.ok) return void toast.error(t.err);
    toast.success(t.saved);
    setDraft(null);
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(id);
    await fetch(`/api/autopilot/products/${id}`, { method: "DELETE" });
    setBusy(null);
    toast.success(t.deleted);
    router.refresh();
  }

  return (
    <section className="mt-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Package className="size-4 text-primary" /> {t.title}
            {products.length > 0 && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{t.count(products.length)}</span>}
          </h2>
          <p className="text-sm text-muted-foreground">{t.sub}</p>
        </div>
        {!draft && (
          <Button size="sm" className="rounded-full" onClick={() => setDraft({ ...EMPTY })}>
            <Plus /> {t.add}
          </Button>
        )}
      </div>

      {draft && (
        <div className="mb-4 grid gap-3 rounded-xl border bg-muted/30 p-4 md:grid-cols-2">
          <input className={input} placeholder={t.name} value={draft.name} maxLength={120} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className={input} placeholder={t.sku} value={draft.sku} maxLength={60} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
            <input className={input} placeholder={t.price} value={draft.price} maxLength={60} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          </div>
          <textarea className={cn(input, "h-auto py-2 md:col-span-2")} rows={2} placeholder={t.desc} value={draft.description} maxLength={600} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <div className="md:col-span-2">
            <p className="mb-1.5 text-xs text-muted-foreground">{t.photos}</p>
            <div className="flex flex-wrap gap-2">
              {draft.id &&
                draft.keepPhotos > 0 &&
                Array.from({ length: draft.keepPhotos }, (_, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={`old-${i}`} src={`/api/autopilot/products/${draft.id}/photo/${i}`} alt="" className="size-20 rounded-lg object-cover ring-1 ring-black/10" />
                ))}
              {draft.files.map((f, i) => (
                <div key={i} className="relative size-20 overflow-hidden rounded-lg ring-1 ring-black/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(f)} alt="" className="size-full object-cover" />
                  <button onClick={() => setDraft({ ...draft, files: draft.files.filter((_, k) => k !== i) })} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white" aria-label="hapus">
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {draft.files.length + draft.keepPhotos < 3 && (
                <button onClick={() => file.current?.click()} className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border bg-background text-[11px] text-muted-foreground hover:bg-accent">
                  <ImagePlus className="size-5" />
                </button>
              )}
              {draft.id && draft.keepPhotos > 0 && (
                <button onClick={() => setDraft({ ...draft, keepPhotos: 0 })} className="self-end text-xs text-muted-foreground underline">
                  {lang === "en" ? "Replace photos" : "Ganti semua foto"}
                </button>
              )}
              <input
                ref={file}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                hidden
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
                  setDraft((d) => (d ? { ...d, files: [...d.files, ...list].slice(0, 3 - d.keepPhotos) } : d));
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} /> {t.active}
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>
              {t.cancel}
            </Button>
            <Button onClick={save} disabled={!draft.name.trim() || !!busy}>
              {busy === "save" && <Loader2 className="animate-spin" />} {t.save}
            </Button>
          </div>
        </div>
      )}

      {products.length === 0 && !draft ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className={cn("flex gap-3 rounded-xl border p-3", !p.active && "opacity-60")}>
              <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                {p.photo_paths.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/autopilot/products/${p.id}/photo/0?v=${encodeURIComponent(p.updated_at)}`} alt="" className="size-full object-cover" />
                ) : (
                  <Package className="m-auto mt-5 size-6 text-muted-foreground/50" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">{[p.sku, p.price].filter(Boolean).join(" · ") || "—"}</p>
                {!p.active && <p className="text-[11px] text-muted-foreground">{t.off}</p>}
              </div>
              <div className="flex shrink-0 flex-col">
                <button
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="edit"
                  onClick={() => setDraft({ id: p.id, name: p.name, sku: p.sku ?? "", price: p.price ?? "", description: p.description ?? "", active: p.active, files: [], keepPhotos: p.photo_paths.length })}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive" aria-label="hapus" onClick={() => remove(p.id)} disabled={busy === p.id}>
                  {busy === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
