"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { RESPONSE_STYLES } from "@/lib/ai/prompt-styles";
import { cn } from "@/lib/utils";
import { updatePersonalization } from "./actions";

const EXAMPLES = [
  "Selalu sertakan contoh caption siap posting.",
  "Target saya ibu muda 25–35 th di Jabodetabek.",
  "Hindari emoji berlebihan.",
  "Kalau membuat strategi, sertakan estimasi budget dalam Rupiah.",
];

export function PersonalizationForm({ style, instructions }: { style: string; instructions: string }) {
  const [state, action, pending] = useActionState(updatePersonalization, undefined);
  const [picked, setPicked] = useState(style);
  const [text, setText] = useState(instructions);
  useEffect(() => {
    if (state?.ok) toast.success("Personalisasi tersimpan — berlaku di chat berikutnya");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Gaya jawaban</legend>
        <input type="hidden" name="response_style" value={picked} />
        <div className="grid gap-2 sm:grid-cols-2">
          {RESPONSE_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPicked(s.id)}
              aria-pressed={picked === s.id}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                picked === s.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent",
              )}
            >
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.desc}</p>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="custom_instructions">Instruksi khusus untuk Markethink</Label>
        <p className="text-xs text-muted-foreground">
          Hal yang selalu perlu diperhatikan Markethink di <b>semua</b> chat. Untuk aturan per brand/klien, isi di Brand Kit project.
        </p>
        <Textarea
          id="custom_instructions"
          name="custom_instructions"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1500}
          rows={6}
          placeholder="Contoh: Saya social media officer brand skincare lokal. Jawab pakai bahasa santai, selalu kasih 3 opsi hook, dan sertakan hashtag."
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setText((t) => (t.trim() ? `${t.trim()}\n${ex}` : ex).slice(0, 1500))}
              className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              + {ex}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{text.length}/1.500</span>
        </div>
      </div>

      <div className="flex justify-end">
        <Button disabled={pending}>{pending && <Loader2 className="animate-spin" />} Simpan personalisasi</Button>
      </div>
    </form>
  );
}
