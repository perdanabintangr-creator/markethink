"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Download,
  Eye,
  History,
  Link2,
  Loader2,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Markdown } from "@/components/chat/markdown";
import { downloadBlob, markdownToDocx, printHtml, slugify, tablesToCsv } from "@/lib/export";
import { cn } from "@/lib/utils";

interface Version {
  version: number;
  content: string;
  created_at: string;
}

export function CanvasPanel({ canvasId, onClose }: { canvasId: string; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [versions, setVersions] = useState<Version[]>([]);
  const [viewing, setViewing] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/canvas/${canvasId}`);
    if (res.ok) {
      const data = await res.json();
      setTitle(data.canvas.title);
      setShareToken(data.canvas.share_token);
      setVersions(data.versions);
      setViewing(data.versions[0]?.version ?? null);
      setContent(data.versions[0]?.content ?? "");
    }
    setLoading(false);
  }, [canvasId]);

  useEffect(() => {
    void load();
  }, [load]);

  const latest = versions[0];
  const dirty = latest ? content !== versions.find((v) => v.version === viewing)?.content : false;

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/canvas/${canvasId}/versions`, { method: "POST", body: JSON.stringify({ content }) });
    setSaving(false);
    if (!res.ok) return toast.error("Gagal menyimpan");
    const { version } = await res.json();
    const v = { version, content, created_at: new Date().toISOString() };
    setVersions((vs) => [v, ...vs]);
    setViewing(version);
    setMode("preview");
    toast.success(`Tersimpan sebagai versi ${version}`);
  }

  async function renameCanvas(next: string) {
    const value = next.trim();
    if (!value || value === title) return;
    setTitle(value);
    await fetch(`/api/canvas/${canvasId}`, { method: "PATCH", body: JSON.stringify({ title: value }) });
  }

  async function share() {
    const res = await fetch(`/api/canvas/${canvasId}/share`, { method: "POST" });
    if (!res.ok) return toast.error("Gagal membuat link");
    const { token } = await res.json();
    setShareToken(token);
    await navigator.clipboard.writeText(`${window.location.origin}/share/canvas/${token}`);
    toast.success("Link publik (read-only) disalin");
  }

  async function unshare() {
    await fetch(`/api/canvas/${canvasId}/share`, { method: "DELETE" });
    setShareToken(null);
    toast.success("Link publik dimatikan");
  }

  async function exportAs(kind: "md" | "docx" | "pdf" | "csv" | "copy") {
    const name = slugify(title);
    if (kind === "copy") {
      await navigator.clipboard.writeText(content);
      return toast.success("Tersalin");
    }
    if (kind === "md") return downloadBlob(new Blob([content], { type: "text/markdown;charset=utf-8" }), `${name}.md`);
    if (kind === "docx") return downloadBlob(await markdownToDocx(content, title), `${name}.docx`);
    if (kind === "csv") {
      const csv = tablesToCsv(content);
      if (!csv) return toast.error("Tidak ada tabel untuk di-export ke CSV");
      return downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${name}.csv`);
    }
    if (kind === "pdf") {
      if (mode !== "preview") setMode("preview");
      setTimeout(() => {
        const html = previewRef.current?.innerHTML ?? "";
        if (!printHtml(title, `<h1>${title.replace(/</g, "&lt;")}</h1>${html}`)) toast.error("Izinkan pop-up untuk export PDF");
      }, 50);
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-1 border-b px-3 py-2">
        <input
          key={title}
          defaultValue={title}
          onBlur={(e) => renameCanvas(e.target.value)}
          className="min-w-0 flex-1 truncate bg-transparent text-sm font-semibold outline-none"
          aria-label="Judul canvas"
        />
        <div className="flex rounded-lg border p-0.5">
          <button
            onClick={() => setMode("preview")}
            className={cn("rounded-md px-2 py-1 text-xs", mode === "preview" && "bg-accent")}
            aria-label="Preview"
          >
            <Eye className="size-3.5" />
          </button>
          <button
            onClick={() => setMode("edit")}
            className={cn("rounded-md px-2 py-1 text-xs", mode === "edit" && "bg-accent")}
            aria-label="Edit"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Versi">
              <History />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
            <DropdownMenuLabel>Riwayat versi</DropdownMenuLabel>
            {versions.map((v) => (
              <DropdownMenuItem
                key={v.version}
                onClick={() => {
                  setViewing(v.version);
                  setContent(v.content);
                }}
              >
                {v.version === viewing ? <Check /> : <span className="size-4" />}
                Versi {v.version}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(v.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Export">
              <Download />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportAs("copy")}><Copy /> Salin teks</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAs("md")}><Download /> Markdown (.md)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAs("docx")}><Download /> Word (.docx)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAs("pdf")}><Download /> PDF (cetak)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAs("csv")}><Download /> CSV (tabel)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={share}><Link2 /> {shareToken ? "Salin link publik" : "Buat link publik"}</DropdownMenuItem>
            {shareToken && <DropdownMenuItem onClick={unshare}><X /> Matikan link publik</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup canvas">
          <X />
        </Button>
      </div>

      {viewing !== null && latest && viewing !== latest.version && (
        <div className="border-b bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
          Melihat versi {viewing}. Simpan untuk menjadikannya versi terbaru.
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : mode === "edit" ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm outline-none"
            spellCheck={false}
          />
        ) : (
          <div ref={previewRef} className="p-4 sm:p-6">
            <Markdown>{content}</Markdown>
          </div>
        )}
      </div>

      {(dirty || (viewing !== null && latest && viewing !== latest.version)) && (
        <div className="flex justify-end gap-2 border-t p-2">
          <Button size="sm" variant="ghost" onClick={() => load()}>Batalkan</Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Simpan versi baru
          </Button>
        </div>
      )}
    </div>
  );
}
