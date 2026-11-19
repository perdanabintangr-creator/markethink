"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function DeletePromoButton({ action, title }: { action: () => Promise<void>; title: string }) {
  const [confirm, dialog] = useConfirm();
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive"
        disabled={pending}
        onClick={async () => {
          if (await confirm({ title: "Hapus promosi?", description: `“${title}” dan statistiknya akan dihapus permanen.`, confirmLabel: "Hapus", destructive: true }))
            start(() => action());
        }}
      >
        Hapus
      </Button>
      {dialog}
    </>
  );
}
