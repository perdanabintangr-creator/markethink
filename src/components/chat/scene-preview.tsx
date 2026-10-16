"use client";

import { useEffect, useState } from "react";
import { Download, Eye, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FontRole, Scene, SceneItem } from "@/lib/deck/scene";

/**
 * Pratinjau deck Signature (Promax): menggambar Scene yang sama persis dengan file PPT/PDF —
 * posisi, font asli (public/fonts/deck), pemenggalan baris dan foto.
 */
export function ScenePreviewButton({
  sceneUrl,
  images,
  pdfUrl,
  pptxUrl,
  title,
}: {
  sceneUrl: string;
  images?: Record<string, string>;
  pdfUrl?: string;
  pptxUrl: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [scene, setScene] = useState<Scene | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || scene) return;
    let alive = true;
    fetch(sceneUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((s: Scene) => alive && setScene(s))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [open, scene, sceneUrl]);

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Eye /> Lihat
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-4rem)]">
          <DialogHeader className="border-b px-4 py-3 pr-12">
            <DialogTitle className="truncate text-base">{title}</DialogTitle>
            <DialogDescription className="text-xs">
              Pratinjau {scene ? `${scene.slides.length} slide` : "slide"}. PDF tampil persis seperti ini; di PowerPoint font khusus tampil bila terpasang (Google Slides
              otomatis).
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/40 p-3 sm:p-4">
            {scene ? (
              <>
                <SceneFonts scene={scene} />
                {scene.slides.map((sl, i) => (
                  <div key={i} className="mx-auto w-full max-w-3xl" style={{ containerType: "inline-size" }}>
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg shadow-sm ring-1 ring-black/5" style={{ background: `#${sl.bg}` }}>
                      {sl.items.map((it, k) => (
                        <Item key={k} it={it} scene={scene} images={images} />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                {failed ? "Pratinjau gagal dimuat — silakan unduh filenya." : <Loader2 className="size-5 animate-spin" />}
              </div>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t px-4 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Tutup
            </Button>
            {pdfUrl && (
              <Button asChild size="sm" variant="outline">
                <a href={`${pdfUrl}?download=1`}>
                  <FileText /> Unduh PDF
                </a>
              </Button>
            )}
            <Button asChild size="sm">
              <a href={`${pptxUrl}?download=1`}>
                <Download /> Unduh .pptx
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const fam = (file: string) => `mt-deck-${file}`;

function SceneFonts({ scene }: { scene: Scene }) {
  const files = [...new Set(Object.values(scene.fonts).map((f) => f.file))];
  return (
    <style>
      {files.map((f) => `@font-face{font-family:"${fam(f)}";src:url(/fonts/deck/${f}.woff) format("woff");font-display:block;}`).join("\n")}
    </style>
  );
}

function rgba(hex: string, o = 1) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${o})`;
}

function Item({ it, scene, images }: { it: SceneItem; scene: Scene; images?: Record<string, string> }) {
  const W = scene.w;
  const H = scene.h;
  const cq = (inch: number) => `${(inch / W) * 100}cqw`;
  const pt = (p: number) => cq(p / 72);
  if (it.t === "line") {
    return (
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <line x1={it.x1} y1={it.y1} x2={it.x2} y2={it.y2} stroke={rgba(it.color, it.o ?? 1)} strokeWidth={it.lw / 72} />
      </svg>
    );
  }
  const box: React.CSSProperties = { position: "absolute", left: `${(it.x / W) * 100}%`, top: `${(it.y / H) * 100}%`, width: `${(it.w / W) * 100}%`, height: `${(it.h / H) * 100}%` };
  switch (it.t) {
    case "rect":
    case "ellipse":
      return (
        <div
          style={{
            ...box,
            background: it.fill ? rgba(it.fill, it.fo ?? 1) : undefined,
            border: it.line ? `${pt(it.lw ?? 0.75)} solid ${rgba(it.line, it.lo ?? 1)}` : undefined,
            borderRadius: it.t === "ellipse" ? "50%" : it.r ? cq(it.r) : undefined,
          }}
        />
      );
    case "grad": {
      const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => {
        const s = t * t * (3 - 2 * t);
        return `${rgba(it.color, it.from + (it.to - it.from) * s)} ${t * 100}%`;
      });
      const dir = { right: "to right", left: "to left", down: "to bottom", up: "to top" }[it.dir];
      return <div style={{ ...box, background: `linear-gradient(${dir}, ${stops.join(", ")})` }} />;
    }
    case "img": {
      const src = images?.[it.key];
      if (!src) return null;
      // eslint-disable-next-line @next/next/no-img-element -- file pribadi via /api/attachments (bukan aset statis)
      return <img src={src} alt="" loading="lazy" style={{ ...box, objectFit: it.fit === "contain" ? "contain" : "cover" }} />;
    }
    case "text": {
      const f = scene.fonts[it.font as FontRole];
      return (
        <div
          style={{
            ...box,
            height: undefined,
            minHeight: box.height,
            display: "flex",
            flexDirection: "column",
            justifyContent: it.valign === "middle" ? "center" : it.valign === "bottom" ? "flex-end" : "flex-start",
            fontFamily: `"${fam(f.file)}", sans-serif`,
            fontSize: pt(it.size),
            lineHeight: it.lh,
            letterSpacing: it.ls ? pt(it.ls) : undefined,
            color: rgba(it.color, it.o ?? 1),
            textAlign: it.align ?? "left",
            whiteSpace: "pre",
          }}
        >
          {it.lines.map((l, k) => (
            <div key={k}>{l}</div>
          ))}
        </div>
      );
    }
  }
}
