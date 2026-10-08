"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <div className="flex h-full min-h-[60dvh] flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">Ada yang tidak beres</h1>
      <p className="text-sm text-muted-foreground">Coba muat ulang. Kalau masih error, kabari tim Markethink.</p>
      <Button onClick={reset}>Coba lagi</Button>
    </div>
  );
}
