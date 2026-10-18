"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { WorkingShowcase } from "@/components/tools/working-showcase";
import { BrainPicker, useToolTier } from "@/components/tools/brain-picker";
import { agentExamples } from "@/lib/addons/i18n";
import { TOOL_CREDIT_ESTIMATE, quotaShare } from "@/lib/addons/format";
import { useApp } from "@/components/app/app-context";
import { cn } from "@/lib/utils";
import { chatText } from "@/lib/i18n/chat";

/** Form misi Agent: satu tujuan (+ info bisnis opsional) → rencana langkah. */
export function AgentStart({ locked }: { locked: boolean }) {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [busy, setBusy] = useState(false);
  const brain = useToolTier();
  const { credits, lang } = useApp();
  const c = chatText(lang);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (goal.trim().length < 15) return toast.error(c.goalTooShort);
    setBusy(true);
    try {
      const res = await fetch("/api/agent", { method: "POST", body: JSON.stringify({ goal, context, tier: brain.tier }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) return void toast.error(data.message ?? c.planFailed);
      router.push(`/tools/agent/${data.id}`);
    } catch {
      toast.error(c.offlineRetry);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="relative overflow-hidden rounded-2xl border bg-card p-4 sm:p-6">
      <label htmlFor="agent-goal" className="text-sm font-medium">
        {c.goalLabel}
      </label>
      <Textarea
        id="agent-goal"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        rows={4}
        maxLength={2000}
        disabled={locked || busy}
        className="mt-2 text-base"
        placeholder={c.goalPlaceholder}
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {agentExamples(lang).map((ex) => (
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
        <ChevronRight className={cn("size-4 transition-transform", showContext && "rotate-90")} /> {c.contextToggle}
      </button>
      {showContext && (
        <Textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={4}
          maxLength={3000}
          disabled={locked || busy}
          className="mt-2"
          placeholder={c.contextPlaceholder}
        />
      )}

      <div className="mt-4">
        <BrainPicker value={brain.tier} onChange={brain.setTier} allowed={brain.allowed} disabled={locked || busy} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          {c.planNote(quotaShare(TOOL_CREDIT_ESTIMATE[brain.tier], credits.monthLimit))}
        </p>
        <Button type="submit" disabled={locked || busy}>
          <Sparkles /> {c.buildPlan}
        </Button>
      </div>

      {busy && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 p-6 backdrop-blur-sm">
          <WorkingShowcase tool="agent" typical={35} title={c.planning} steps={c.planSteps} compact />
        </div>
      )}
    </form>
  );
}
