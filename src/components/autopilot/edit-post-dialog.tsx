"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AutopilotText } from "@/lib/i18n/autopilot";
import type { Slide } from "@/lib/autopilot/slides";
import type { ApPost } from "./autopilot-view";

const input = "w-full rounded-lg border bg-background px-3 py-2 text-sm";

/** Edit caption, jadwal, teks slide, atau naskah Reel. */
export function EditPostDialog({ t, post, today, onClose, onSaved }: { t: AutopilotText; post: ApPost; today: string; onClose: () => void; onSaved: (p: ApPost) => void }) {
  const [caption, setCaption] = useState(post.caption);
  const [date, setDate] = useState(post.post_date);
  const [time, setTime] = useState(post.post_time);
  const [script, setScript] = useState(post.script ?? "");
  const [slides, setSlides] = useState<Slide[]>(post.slides);
  const [saving, setSaving] = useState(false);

  const setSlide = (i: number, patch: Partial<Slide>) => setSlides((list) => list.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);

  async function save() {
    setSaving(true);
    const body: Record<string, unknown> = { action: "update" };
    if (caption !== post.caption) body.caption = caption;
    if (date !== post.post_date) body.postDate = date;
    if (time !== post.post_time) body.postTime = time;
    if (post.kind === "reel" && script !== (post.script ?? "")) body.script = script;
    if (post.kind !== "reel" && JSON.stringify(slides) !== JSON.stringify(post.slides)) body.slides = slides;
    if (Object.keys(body).length === 1) return onClose();
    try {
      const res = await fetch(`/api/autopilot/posts/${post.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error ?? "generic"));
      let saved = data.post as ApPost;
      // Deskripsi visual cover berubah → buat gambar baru (dihitung ke batas 3× per konten).
      const newVisual = slides[0]?.visual?.trim();
      if (post.design !== "classic" && newVisual && newVisual !== (post.slides[0]?.visual ?? "").trim() && (post.image_regens ?? 0) < 3) {
        toast.message(t.regening);
        const r2 = await fetch(`/api/autopilot/posts/${post.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "regen_image", visual: newVisual }) });
        const d2 = await r2.json().catch(() => ({}));
        if (r2.ok) saved = d2.post as ApPost;
        else toast.error((t.errors as Record<string, string>)[String(d2.error)] ?? t.errors.generic);
      }
      onSaved(saved);
    } catch (e) {
      const k = e instanceof Error ? e.message : "generic";
      toast.error((t.errors as Record<string, string>)[k] ?? t.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.editTitle}</DialogTitle>
          <DialogDescription>{t.editHint}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-muted-foreground">
              {t.date}
              <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={`${input} mt-1`} />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              {t.time}
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${input} mt-1`} />
            </label>
          </div>

          {post.kind !== "reel" &&
            slides.map((s, i) => (
              <fieldset key={i} className="space-y-2 rounded-xl border p-3">
                <legend className="px-1 text-xs font-semibold">
                  {t.slideN(i + 1)} · <span className="font-normal text-muted-foreground">{s.type}</span>
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={s.title ?? ""} onChange={(e) => setSlide(i, { title: e.target.value })} placeholder={t.fTitle} className={input} maxLength={120} />
                  <input value={s.accent ?? ""} onChange={(e) => setSlide(i, { accent: e.target.value })} placeholder={t.fAccent} className={input} maxLength={120} />
                </div>
                {(s.type === "point" ? ["body"] : s.type === "list" ? [] : ["sub"]).map((k) => (
                  <textarea
                    key={k}
                    value={(s[k as "sub" | "body"] as string | undefined) ?? ""}
                    onChange={(e) => setSlide(i, { [k]: e.target.value })}
                    placeholder={k === "body" ? t.fBody : t.fSub}
                    rows={2}
                    maxLength={260}
                    className={input}
                  />
                ))}
                {s.type === "list" && (
                  <textarea value={(s.items ?? []).join("\n")} onChange={(e) => setSlide(i, { items: lines(e.target.value).slice(0, 6) })} placeholder={t.fItems} rows={4} className={input} />
                )}
                {s.type === "poll" && (
                  <textarea value={(s.options ?? []).join("\n")} onChange={(e) => setSlide(i, { options: lines(e.target.value).slice(0, 3) })} placeholder={t.fOptions} rows={3} className={input} />
                )}
                {i === 0 && post.design !== "classic" && (s.visual !== undefined || s.image) && (
                  <label className="block text-xs text-muted-foreground">
                    {t.fVisual}
                    <textarea value={s.visual ?? ""} onChange={(e) => setSlide(i, { visual: e.target.value })} rows={2} maxLength={400} className={`${input} mt-1`} />
                    <span className="mt-1 block">{t.visualHint}</span>
                  </label>
                )}
                {s.type === "cta" && <input value={s.button ?? ""} onChange={(e) => setSlide(i, { button: e.target.value })} placeholder={t.fButton} className={input} maxLength={40} />}
              </fieldset>
            ))}

          {post.kind === "reel" && (
            <label className="block text-xs font-medium text-muted-foreground">
              {t.script}
              <textarea value={script} onChange={(e) => setScript(e.target.value)} rows={10} maxLength={4000} className={`${input} mt-1 font-mono text-xs`} />
            </label>
          )}

          <label className="block text-xs font-medium text-muted-foreground">
            {t.caption}
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={8} maxLength={2200} className={`${input} mt-1`} />
            <span className="mt-1 block text-right tabular-nums">{caption.length}/2200</span>
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} {t.saveChanges}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
