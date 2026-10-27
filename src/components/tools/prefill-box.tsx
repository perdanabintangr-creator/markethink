"use client";

import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useResultLang } from "./common";

const TEXT = {
  id: {
    title: "Ceritakan singkat, biar AI yang isi formnya",
    ph: "mis. Saya jual frame foto box estetik Rp150rb di Bandung lewat Instagram & Shopee, target anak muda yang suka foto studio. Mau naikkan penjualan bulan depan.",
    fill: "Isi otomatis",
    done: (n: number) => `${n} kolom terisi. Cek & lengkapi dulu sebelum menjalankan.`,
    none: "Belum ada yang bisa diisi dari cerita itu. Coba tambahkan produk, harga, atau target pembeli.",
    failed: "Gagal mengisi otomatis. Coba lagi.",
  },
  en: {
    title: "Describe it briefly and let AI fill in the form",
    ph: "e.g. I sell aesthetic photo-booth frames for Rp150k in Bandung via Instagram & Shopee, targeting young people who love studio photos. I want more sales next month.",
    fill: "Auto-fill",
    done: (n: number) => `${n} fields filled. Review & complete them before running.`,
    none: "Nothing could be filled from that. Try adding the product, price, or target buyers.",
    failed: "Auto-fill failed. Please try again.",
  },
};

/** Isi nilai ke form yang tidak dikontrol React (input/select/textarea & grup checkbox chips), lalu sorot sebentar. */
function applyToForm(form: HTMLFormElement, values: Record<string, unknown>) {
  let n = 0;
  for (const [name, value] of Object.entries(values)) {
    const nodes = Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${CSS.escape(name)}"]`));
    if (!nodes.length) continue;
    if (nodes[0] instanceof HTMLInputElement && nodes[0].type === "checkbox") {
      const list = (Array.isArray(value) ? value : [value]).map(String);
      for (const el of nodes as HTMLInputElement[]) el.checked = list.includes(el.value);
    } else {
      const el = nodes[0];
      if (el instanceof HTMLSelectElement && ![...el.options].some((o) => o.value === String(value))) continue;
      el.value = String(value);
    }
    n++;
    const target = (nodes[0].closest("label") ?? nodes[0]) as HTMLElement;
    target.classList.add("ring-2", "ring-primary/60", "rounded-lg");
    setTimeout(() => target.classList.remove("ring-2", "ring-primary/60"), 2500);
  }
  return n;
}

export function PrefillBox({ tool, formRef }: { tool: string; formRef: React.RefObject<HTMLFormElement | null> }) {
  const lang = useResultLang();
  const P = TEXT[lang === "en" ? "en" : "id"];
  const [story, setStory] = useState("");
  const [busy, setBusy] = useState(false);

  async function fill() {
    if (story.trim().length < 10 || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tools/${tool}/prefill`, { method: "POST", body: JSON.stringify({ story }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.values) return toast.error(data?.message ?? P.failed);
      const n = formRef.current ? applyToForm(formRef.current, data.values) : 0;
      if (n) toast.success(P.done(n));
      else toast(P.none);
    } catch {
      toast.error(P.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
        <Wand2 className="size-4 text-primary" /> {P.title}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          maxLength={2000}
          rows={2}
          placeholder={P.ph}
          className="min-h-16 flex-1 resize-y rounded-lg border bg-background p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="button" onClick={() => void fill()} disabled={busy || story.trim().length < 10} className="shrink-0 self-end sm:self-stretch">
          {busy ? <Loader2 className="animate-spin" /> : <Wand2 />} {P.fill}
        </Button>
      </div>
    </div>
  );
}
