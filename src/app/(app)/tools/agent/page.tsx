import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateID } from "@/lib/addons/format";
import { quotaByAddon } from "@/lib/agent/server";
import { AgentStart } from "@/components/agent/agent-start";
import { ToolIcon } from "@/components/tools/tool-icon";
import type { AgentStep } from "@/lib/agent/catalog";

export const metadata = { title: "Markethink Agent" };
export const dynamic = "force-dynamic";

const HOW = [
  { t: "1. Ceritakan tujuanmu", d: "Satu kalimat cukup — mis. kampanye Ramadan, launching produk, naikkan repeat order." },
  { t: "2. Agent menyusun rencana", d: "Memilih Tools Pro yang dibutuhkan & urutannya, seperti Head of Marketing membagi tugas tim." },
  { t: "3. Dikerjakan berurutan", d: "Setiap hasil jadi bahan langkah berikutnya, jadi persona, strategi, dan konten saling nyambung." },
  { t: "4. Terima satu paket", d: "Semua hasil + PPT/Excel + ringkasan eksekutif & rencana eksekusi, siap dibahas di chat." },
];

export default async function AgentHome() {
  const { profile } = await requireUser();
  const admin = createAdminClient();
  const [quota, { data: runs }] = await Promise.all([
    quotaByAddon(admin, profile),
    admin.from("agent_runs").select("id, title, goal, status, plan, created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const locked = !Object.values(quota).some((n) => n > 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-8">
        <Link href="/tools" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Tools Pro
        </Link>
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ToolIcon id="agent" className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">
              Markethink Agent <span className="ml-1 align-middle rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">Baru</span>
            </h1>
            <p className="text-sm text-muted-foreground">Beri satu tujuan — Agent menjalankan beberapa Tools Pro berurutan sampai paket kerjanya lengkap.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HOW.map((h) => (
            <div key={h.t} className="rounded-xl border bg-card p-3">
              <p className="text-sm font-semibold">{h.t}</p>
              <p className="mt-1 text-xs text-muted-foreground">{h.d}</p>
            </div>
          ))}
        </div>

        {locked && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
            🔒 Markethink Agent memakai kuota Tools Pro. Beli add-on atau upgrade ke Pro/Promax untuk memakainya.{" "}
            <Link href="/tools" className="font-medium text-primary underline">
              Lihat pilihan
            </Link>
          </div>
        )}

        <AgentStart locked={locked} />

        {Boolean(runs?.length) && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Misi sebelumnya</h2>
            <div className="divide-y rounded-xl border bg-card">
              {runs!.map((r) => {
                const plan = (r.plan ?? []) as AgentStep[];
                const steps = plan.filter((p) => p.status !== "skipped");
                return (
                  <Link key={r.id} href={`/tools/agent/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent">
                    {r.status === "done" ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                    ) : r.status === "error" ? (
                      <CircleAlert className="size-4 shrink-0 text-destructive" />
                    ) : (
                      <Clock className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.title ?? r.goal}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {steps.map((p, i) => (
                          <ToolIcon key={i} id={p.tool} className="size-3" />
                        ))}
                        <span className="ml-1">
                          {steps.filter((p) => p.status === "ok").length}/{steps.length} langkah · {dateID(r.created_at as string)}
                        </span>
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
