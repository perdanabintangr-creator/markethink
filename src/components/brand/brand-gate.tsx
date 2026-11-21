import Link from "next/link";
import { Check, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GateReason } from "@/lib/brand/onboarding";

/** Panel saat Autopilot terkunci: data wajib belum lengkap atau Brand DNA belum di-ACC. */
export function BrandGate({
  reason,
  brandName,
  workspaceId,
  percent,
  missing,
  hasDraft,
}: {
  reason: Exclude<GateReason, null>;
  brandName: string | null;
  workspaceId: string | null;
  percent: number;
  missing: { label: string }[];
  hasDraft: boolean;
}) {
  const href = workspaceId ? `/autopilot/onboarding?ws=${workspaceId}` : "/autopilot/onboarding";
  const title =
    reason === "dna_not_approved"
      ? hasDraft
        ? "Brand DNA menunggu ACC kamu"
        : "Satu langkah lagi: susun Brand DNA"
      : reason === "no_brand"
        ? "Pilih atau buat brand dulu"
        : `Lengkapi profil ${brandName ?? "brand"} dulu`;
  const body =
    reason === "dna_not_approved"
      ? "Tim AI (Creative Director, Designer, Copywriter, Socmed Specialist) menyusun Brand DNA dari data & foto asli brand kamu. Autopilot terbuka setelah kamu meninjau dan ACC."
      : "Supaya konten benar-benar terasa milik brand kamu (warna, gaya foto, cara bicara), Autopilot terkunci sampai data wajib lengkap dan Brand DNA di-ACC.";
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 md:py-16">
      <div className="rounded-3xl border bg-card p-6 shadow-sm md:p-8">
        <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {reason === "dna_not_approved" ? <Sparkles className="size-6" /> : <Lock className="size-6" />}
        </div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        {reason !== "no_brand" && (
          <div className="mt-5">
            <div className="flex items-baseline justify-between text-sm">
              <span>Kelengkapan brand</span>
              <b className="tabular-nums">{percent}%</b>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500" style={{ width: `${percent}%` }} />
            </div>
            {missing.length > 0 ? (
              <ul className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                {missing.map((m) => (
                  <li key={m.label} className="flex items-center gap-1.5">
                    <Lock className="size-3.5" /> {m.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-600">
                <Check className="size-4" /> Data wajib lengkap
              </p>
            )}
          </div>
        )}
        <Button asChild className="mt-6 w-full sm:w-auto">
          <Link href={href}>{reason === "dna_not_approved" ? (hasDraft ? "Tinjau & ACC Brand DNA" : "Susun Brand DNA") : "Lengkapi Brand Onboarding"}</Link>
        </Button>
      </div>
    </div>
  );
}
