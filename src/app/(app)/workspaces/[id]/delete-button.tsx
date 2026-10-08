"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { deleteWorkspace } from "../actions";

export function DeleteWorkspaceButton({ workspaceId }: { workspaceId: string }) {
  const [pending, start] = useTransition();
  const [confirm, confirmDialog] = useConfirm();
  return (
    <>
      <Button
        variant="ghost"
        className="w-full text-destructive hover:text-destructive"
        disabled={pending}
        onClick={async () => {
          const ok = await confirm({
            title: "Hapus project ini?",
            description:
              "Brand Kit, file knowledge, dan memory project ini akan dihapus permanen. Chat-nya tetap tersimpan (pindah ke riwayat umum).",
            confirmLabel: "Hapus project",
            destructive: true,
          });
          if (ok) start(() => deleteWorkspace(workspaceId));
        }}
      >
        <Trash2 /> Hapus project
      </Button>
      {confirmDialog}
    </>
  );
}
