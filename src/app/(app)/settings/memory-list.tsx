"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { addMemory, clearMemories, deleteMemory, updateMemory } from "./actions";

interface Memory {
  id: string;
  content: string;
  source: string;
  /** Nama project bila memory ini milik project tertentu. */
  project?: string | null;
}

export function MemoryList({ memories }: { memories: Memory[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const [confirm, confirmDialog] = useConfirm();

  return (
    <div className="space-y-3">
      <form action={addMemory} className="flex gap-2">
        <Input name="content" placeholder="Tambah memory, mis. 'Saya suka jawaban singkat pakai bullet'" maxLength={300} required />
        <Button variant="outline" size="icon" aria-label="Tambah"><Plus /></Button>
      </form>
      <ul className="divide-y rounded-xl border">
        {memories.map((m) => (
          <li key={m.id} className="flex items-center gap-2 p-3 text-sm">
            {editing === m.id ? (
              <>
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={300} className="h-8" autoFocus />
                <button
                  aria-label="Simpan"
                  onClick={() => start(async () => { await updateMemory(m.id, draft); setEditing(null); })}
                  className="rounded p-1 hover:bg-accent"
                >
                  <Check className="size-4" />
                </button>
                <button aria-label="Batal" onClick={() => setEditing(null)} className="rounded p-1 hover:bg-accent">
                  <X className="size-4" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1">
                  {m.content}
                  {m.project && (
                    <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{m.project}</span>
                  )}
                </span>
                <span className="text-[11px] text-muted-foreground">{m.source === "auto" ? "otomatis" : "manual"}</span>
                <button
                  aria-label="Edit"
                  onClick={() => { setEditing(m.id); setDraft(m.content); }}
                  className="rounded p-1 text-muted-foreground hover:bg-accent"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  aria-label="Hapus"
                  disabled={pending}
                  onClick={() => start(() => deleteMemory(m.id))}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </>
            )}
          </li>
        ))}
        {!memories.length && <li className="p-4 text-sm text-muted-foreground">Belum ada memory.</li>}
      </ul>
      {memories.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={pending}
          onClick={async () => {
            const ok = await confirm({
              title: "Hapus semua memory?",
              description: "Semua yang diingat AI tentang kamu (termasuk memory tiap project) akan dihapus permanen.",
              confirmLabel: "Hapus semua",
              destructive: true,
            });
            if (ok) start(() => clearMemories());
          }}
        >
          Hapus semua memory
        </Button>
      )}
      {confirmDialog}
    </div>
  );
}
