"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createResetLink } from "@/app/actions";

/** Buat link reset password (sekali pakai, 1 jam) untuk dikirim ke pelanggan lewat WhatsApp/email. */
export function ResetLinkButton({ userId }: { userId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function create() {
    setBusy(true);
    setError(null);
    const res = await createResetLink(userId);
    setBusy(false);
    if (res.error) setError(res.error);
    else setLink(res.link ?? null);
  }

  return (
    <div className="space-y-1.5">
      <p className="font-medium">Reset password</p>
      {link ? (
        <div className="flex gap-2">
          <input readOnly value={link} className="h-8 min-w-0 flex-1 rounded-md border bg-muted px-2 text-xs" onFocus={(e) => e.target.select()} />
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check /> : <Copy />} {copied ? "Tersalin" : "Salin"}
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={create} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <KeyRound />} Buat link reset password
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        {error ?? "Kirim ke pelanggan (WA/email). Sekali pakai, berlaku 1 jam. Password pelanggan tidak bisa dilihat siapa pun."}
      </p>
    </div>
  );
}
