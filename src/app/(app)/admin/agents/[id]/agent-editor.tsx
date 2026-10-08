"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { AGENT_ICON_NAMES } from "@/components/agent-icon";
import type { Agent } from "@/lib/types";
import { saveAgent } from "../../actions";

const EXAMPLE_SCHEMA = `[
  {"name":"brand","label":"Brand / produk","type":"text","required":true,"placeholder":"mis. Kopi Senja"},
  {"name":"goal","label":"Tujuan","type":"select","options":["Awareness","Penjualan"]},
  {"name":"context","label":"Konteks","type":"textarea"}
]`;

export function AgentEditor({ agent }: { agent: Agent | null }) {
  const [state, action, pending] = useActionState(saveAgent.bind(null, agent?.id ?? null), undefined);
  return (
    <form action={action} className="grid max-w-3xl gap-4">
      <h2 className="text-lg font-semibold">{agent ? `Edit: ${agent.name}` : "Agent baru"}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nama</Label>
          <Input id="name" name="name" defaultValue={agent?.name} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input id="slug" name="slug" defaultValue={agent?.slug} required pattern="[a-z0-9-]{2,60}" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Kategori</Label>
          <NativeSelect id="category" name="category" defaultValue={agent?.category ?? "strategi"}>
            {["strategi", "riset", "konten", "iklan", "umkm", "bisnis", "umum"].map((c) => <option key={c}>{c}</option>)}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="icon">Ikon</Label>
          <NativeSelect id="icon" name="icon" defaultValue={agent?.icon ?? "sparkles"}>
            {AGENT_ICON_NAMES.map((i) => <option key={i}>{i}</option>)}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="default_tier">Tier default</Label>
          <NativeSelect id="default_tier" name="default_tier" defaultValue={agent?.default_tier ?? "senior"}>
            <option value="junior">junior</option>
            <option value="senior">senior</option>
            <option value="associate">associate</option>
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sort_order">Urutan</Label>
          <Input id="sort_order" name="sort_order" type="number" defaultValue={agent?.sort_order ?? 100} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Deskripsi singkat</Label>
        <Input id="description" name="description" defaultValue={agent?.description} maxLength={300} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="instructions">Instruksi (system prompt agent)</Label>
        <Textarea id="instructions" name="instructions" defaultValue={agent?.instructions} rows={8} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="input_schema">Form input (JSON)</Label>
        <Textarea
          id="input_schema"
          name="input_schema"
          defaultValue={agent ? JSON.stringify(agent.input_schema, null, 2) : EXAMPLE_SCHEMA}
          rows={10}
          className="font-mono text-xs"
          required
        />
        <p className="text-xs text-muted-foreground">type: text | textarea | select (dengan options). name: huruf kecil & underscore.</p>
      </div>
      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="output_canvas" defaultChecked={agent?.output_canvas ?? false} /> Buka hasil di Canvas
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_active" defaultChecked={agent?.is_active ?? true} /> Aktif
        </label>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button disabled={pending} className="w-fit">{pending && <Loader2 className="animate-spin" />} Simpan agent</Button>
    </form>
  );
}
