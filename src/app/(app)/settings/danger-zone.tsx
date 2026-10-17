"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/components/app/app-context";
import { settingsText } from "@/lib/i18n/settings";
import { deleteAccount } from "./actions";

export function DangerZone() {
  const [value, setValue] = useState("");
  const t = settingsText(useApp().lang);
  return (
    <section className="space-y-3 rounded-xl border border-destructive/40 p-4">
      <h2 className="font-semibold text-destructive">{t.dangerTitle}</h2>
      <p className="text-sm text-muted-foreground">
        {t.dangerDescBefore}
        <b>{t.deleteWord}</b>
        {t.dangerDescAfter}
      </p>
      <form action={deleteAccount} className="flex gap-2">
        <Input name="confirm" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t.deleteWord} />
        <Button variant="destructive" disabled={value !== t.deleteWord}>{t.deleteAccount}</Button>
      </form>
    </section>
  );
}
