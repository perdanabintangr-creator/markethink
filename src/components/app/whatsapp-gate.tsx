"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveWhatsapp } from "@/app/(app)/settings/actions";
import { settingsText } from "@/lib/i18n/settings";
import type { Lang } from "@/lib/i18n/dict";

/** Pengguna lama yang belum punya nomor WhatsApp: wajib isi sekali sebelum lanjut memakai aplikasi. */
export function WhatsappGate({ lang }: { lang: Lang }) {
  const t = settingsText(lang);
  const router = useRouter();
  const [wa, setWa] = useState("");
  const [state, action, pending] = useActionState(saveWhatsapp, undefined);
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);
  if (state?.ok) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="wa-gate-title">
      <form action={action} className="w-full max-w-sm rounded-2xl border bg-background p-6 shadow-xl">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
          <MessageCircle className="size-5" />
        </span>
        <h2 id="wa-gate-title" className="mt-4 text-lg font-semibold">
          {t.waGateTitle}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.waGateDesc}</p>
        <Input
          name="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          autoFocus
          placeholder="0812 3456 7890"
          value={wa}
          onChange={(e) => setWa(e.target.value)}
          maxLength={20}
          required
          className="mt-4"
        />
        {state?.error && <p className="mt-2 text-sm text-destructive">{state.error}</p>}
        <Button className="mt-4 w-full" disabled={pending || wa.replace(/\D/g, "").length < 9}>
          {pending && <Loader2 className="animate-spin" />} {t.waGateSave}
        </Button>
      </form>
    </div>
  );
}
