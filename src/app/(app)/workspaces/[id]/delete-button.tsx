"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useApp } from "@/components/app/app-context";
import { settingsText } from "@/lib/i18n/settings";
import { deleteWorkspace } from "../actions";

export function DeleteWorkspaceButton({ workspaceId }: { workspaceId: string }) {
  const [pending, start] = useTransition();
  const [confirm, confirmDialog] = useConfirm();
  const t = settingsText(useApp().lang);
  return (
    <>
      <Button
        variant="ghost"
        className="w-full text-destructive hover:text-destructive"
        disabled={pending}
        onClick={async () => {
          const ok = await confirm({
            title: t.deleteProjectTitle,
            description: t.deleteProjectDesc,
            confirmLabel: t.deleteProject,
            destructive: true,
          });
          if (ok) start(() => deleteWorkspace(workspaceId));
        }}
      >
        <Trash2 /> {t.deleteProject}
      </Button>
      {confirmDialog}
    </>
  );
}
