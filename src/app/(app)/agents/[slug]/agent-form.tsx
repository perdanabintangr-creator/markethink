"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { AgentIcon } from "@/components/agent-icon";
import { pickTier, useApp } from "@/components/app/app-context";
import type { TierId } from "@/lib/ai/models.config";
import { PENDING_KEY, type Agent, type PendingAgentRun } from "@/lib/types";

export function AgentForm({ agent }: { agent: Omit<Agent, "instructions" | "is_active" | "sort_order"> }) {
  const router = useRouter();
  const { workspaces, allowedTiers } = useApp();
  const [tier, setTier] = useState<TierId>(() => pickTier(agent.default_tier, allowedTiers));
  const recommendedLocked = !allowedTiers.includes(agent.default_tier);
  const [workspaceId, setWorkspaceId] = useState<string>("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const lines = agent.input_schema
      .map((f) => {
        const v = String(form.get(f.name) ?? "").trim();
        return v ? `- **${f.label}:** ${v}` : null;
      })
      .filter(Boolean);
    const text = `Jalankan **${agent.name}** dengan brief berikut:\n\n${lines.join("\n")}`;
    const run: PendingAgentRun = {
      text,
      agentId: agent.id,
      agentName: agent.name,
      tier,
      outputCanvas: agent.output_canvas,
      workspaceId: workspaceId || null,
    };
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(run));
    router.push(workspaceId ? `/chat?workspace=${workspaceId}` : "/chat");
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/agents" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Semua agents
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <AgentIcon name={agent.icon} className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold">{agent.name}</h1>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          {agent.input_schema.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={f.name}>
                {f.label} {f.required && <span className="text-destructive">*</span>}
              </Label>
              {f.type === "textarea" ? (
                <Textarea id={f.name} name={f.name} required={f.required} placeholder={f.placeholder} rows={3} maxLength={3000} />
              ) : f.type === "select" ? (
                <NativeSelect id={f.name} name={f.name} required={f.required} defaultValue="">
                  <option value="" disabled>
                    Pilih…
                  </option>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </NativeSelect>
              ) : (
                <Input id={f.name} name={f.name} required={f.required} placeholder={f.placeholder} maxLength={300} />
              )}
            </div>
          ))}

          <div className="grid gap-4 rounded-xl border bg-muted/40 p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tier">Otak marketing</Label>
              <NativeSelect id="tier" value={tier} onChange={(e) => setTier(e.target.value as TierId)}>
                {(
                  [
                    ["junior", "Markethink Junior — cepat"],
                    ["senior", "Markethink Senior — seimbang"],
                    ["associate", "Markethink Associate — paling mendalam"],
                  ] as const
                ).map(([id, label]) => (
                  <option key={id} value={id} disabled={!allowedTiers.includes(id)}>
                    {label}
                    {allowedTiers.includes(id) ? "" : " (Pro 🔒)"}
                  </option>
                ))}
              </NativeSelect>
              {recommendedLocked && (
                <p className="text-xs text-muted-foreground">
                  Agent ini paling optimal dengan otak Pro. Di paket gratis hasilnya versi ringkas.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ws">Project</Label>
              <NativeSelect id="ws" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
                <option value="">Tanpa workspace</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <Button size="lg" className="w-full">
            <Sparkles /> Jalankan agent
          </Button>
        </form>
      </div>
    </div>
  );
}
