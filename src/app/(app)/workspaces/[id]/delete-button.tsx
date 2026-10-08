"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteWorkspace } from "../actions";

export function DeleteWorkspaceButton({ workspaceId }: { workspaceId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      className="w-full text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("Hapus project beserta Brand Kit, file knowledge, dan memory project ini? Chat-nya tetap tersimpan (pindah ke riwayat umum).")) return;
        start(() => deleteWorkspace(workspaceId));
      }}
    >
      <Trash2 /> Hapus project
    </Button>
  );
}
