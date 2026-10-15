"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { WorkingShowcase } from "@/components/tools/working-showcase";
import { BrainPicker, useToolTier } from "@/components/tools/brain-picker";
import { AGENT_EXAMPLES } from "@/lib/agent/catalog";
import { cn } from "@/lib/utils";

const PLAN_STEPS = ["Memahami tujuanmu", "Memetakan pekerjaan tim marketing", "Memilih Tools Pro yang dibutuhkan", "Mengatur urutan kerja", "Mengecek kuota"];

/** Form misi Agent: satu tujuan (+ info bisnis opsional) → rencana langkah. */
export function AgentStart({ locked }: { locked: boolean }) {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [busy, setBusy] = useState(false);
  const brain = useToolTier();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (goal.trim().length < 15) return toast.error("Ceritakan tujuannya sedikit lebih lengkap, ya.");
    setBusy(true);
    try {
      const res = await fetch("/api/agent", { method: "POST", body: JSON.stringify({ goal, context, tier: brain.tier }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) return void toast.error(data.message ?? "Agent gagal menyusun rencana. Coba lagi.");
      router.push(`/tools/agent/${data.id}`);
    } catch {
      toast.error("Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="relative overflow-hidden rounded-2xl border bg-card p-4 sm:p-6">
      <label htmlFor="agent-goal" className="text-sm font-medium">
        Apa yang mau kamu capai?
      </label>
      <Textarea
        id="agent-goal"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        rows={4}
        maxLength={2000}
        disabled={locked || busy}
        className="mt-2 text-base"
        placeholder="mis. Siapkan kampanye Ramadan untuk toko hijab online saya, target perempuan 20–35 tahun, budget iklan Rp5 juta."
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {AGENT_EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={locked || busy}
            onClick={() => setGoal(ex)}
            className="max-w-full truncate rounded-full border px-3 py-1 text-left text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowContext((v) => !v)}
        className="mt-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className={cn("size-4 transition-transform", showContext && "rotate-90")} /> Info bisnis (opsional, bikin hasil lebih tajam)
      </button>
      {showContext && (
        <Textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={4}
          maxLength={3000}
          disabled={locked || busy}
          className="mt-2"
          placeholder={"mis.\n- Brand: Aisyah Hijab, jualan di Shopee & Instagram\n- Harga Rp89–149 ribu, pembeli kebanyakan mahasiswi & pekerja muda\n- Kompetitor: Elzatta, Buttonscarves\n- Kendala: follower banyak tapi jarang beli"}
        />
      )}

      <div className="mt-4">
        <BrainPicker value={brain.tier} onChange={brain.setTier} canDirector={brain.canDirector} disabled={locked || busy} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Agent menyusun rencana dulu — kamu bisa cek & buang langkah sebelum dijalankan. Setiap langkah memakai 1 kuota tool-nya.
        </p>
        <Button type="submit" disabled={locked || busy}>
          <Sparkles /> Susun rencana
        </Button>
      </div>

      {busy && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 p-6 backdrop-blur-sm">
          <WorkingShowcase tool="agent" typical={35} title="Agent sedang menyusun rencana…" steps={PLAN_STEPS} compact />
        </div>
      )}
    </form>
  );
}
