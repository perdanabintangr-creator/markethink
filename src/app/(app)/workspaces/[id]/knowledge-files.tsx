"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteWorkspaceFile } from "../actions";
import { UPLOAD_ERRORS, uploadFile } from "@/lib/upload-client";

interface FileRow {
  id: string;
  name: string;
  size: number;
  status: string;
  error: string | null;
  chunk_count: number;
}


export function KnowledgeFiles({ workspaceId, files }: { workspaceId: string; files: FileRow[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    for (const file of Array.from(list)) {
      const data = await uploadFile<{ chunks: number }>(file, { scope: "workspace", workspaceId });
      if ("error" in data) toast.error(`${file.name}: ${UPLOAD_ERRORS[data.error] ?? data.message ?? "gagal diproses"}`);
      else toast.success(`${file.name} siap dipakai (${data.chunks} bagian)`);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept=".pdf,.docx,.xlsx,.pptx,.txt,.md,.csv,.json" multiple hidden onChange={(e) => upload(e.target.files)} />
      <Button variant="outline" className="w-full" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload file
      </Button>
      <ul className="space-y-1.5">
        {files.map((f) => (
          <li key={f.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{f.name}</span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {f.status === "ready" ? (
                  <><CheckCircle2 className="size-3 text-green-600" /> {f.chunk_count} bagian</>
                ) : f.status === "error" ? (
                  <><AlertCircle className="size-3 text-destructive" /> {f.error ?? "gagal"}</>
                ) : (
                  <><Loader2 className="size-3 animate-spin" /> diproses</>
                )}
                · {(f.size / 1024).toFixed(0)} KB
              </span>
            </span>
            <button
              className="rounded p-1 text-muted-foreground hover:text-destructive"
              aria-label="Hapus file"
              onClick={() => {
                if (!confirm(`Hapus ${f.name}?`)) return;
                startTransition(async () => {
                  await deleteWorkspaceFile(f.id);
                  router.refresh();
                });
              }}
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
