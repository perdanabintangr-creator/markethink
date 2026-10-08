"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui", display: "grid", placeItems: "center", minHeight: "100vh", textAlign: "center" }}>
        <div>
          <h1>Ada yang tidak beres 😵</h1>
          <p>Tim kami sudah menerima laporan error ini.</p>
          <button onClick={reset} style={{ padding: "8px 16px", marginTop: 12 }}>Coba lagi</button>
        </div>
      </body>
    </html>
  );
}
