"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

/**
 * Konfirmasi di dalam aplikasi (pengganti `window.confirm` bawaan browser).
 * Pakai: `const [confirm, confirmDialog] = useConfirm();` lalu `if (await confirm({...})) ...`
 * dan render `{confirmDialog}` di komponen.
 */
export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  };

  const element = (
    <Dialog open={opts !== null} onOpenChange={(open) => !open && close(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{opts?.title}</DialogTitle>
          {opts?.description && <DialogDescription>{opts.description}</DialogDescription>}
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => close(false)}>
            Batal
          </Button>
          <Button variant={opts?.destructive ? "destructive" : "default"} onClick={() => close(true)} autoFocus>
            {opts?.confirmLabel ?? "Ya, lanjutkan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return [confirm, element] as const;
}
