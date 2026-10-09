"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";

/** Tombol aksi server dengan konfirmasi di dalam aplikasi. */
export function ConfirmAction({
  action,
  title,
  description,
  confirmLabel,
  children,
  ...props
}: {
  action: () => Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
} & ButtonProps) {
  const [confirm, dialog] = useConfirm();
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        type="button"
        disabled={pending}
        onClick={async () => {
          if (await confirm({ title, description, confirmLabel, destructive: true })) start(() => action());
        }}
        {...props}
      >
        {pending && <Loader2 className="animate-spin" />}
        {children}
      </Button>
      {dialog}
    </>
  );
}
