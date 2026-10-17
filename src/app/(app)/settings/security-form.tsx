"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useApp } from "@/components/app/app-context";
import { settingsText } from "@/lib/i18n/settings";
import { changePassword, signOutEverywhere } from "./actions";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePassword, undefined);
  const form = useRef<HTMLFormElement>(null);
  const t = settingsText(useApp().lang);
  useEffect(() => {
    if (state?.ok) {
      toast.success(t.passwordChanged);
      form.current?.reset();
    }
    if (state?.error) toast.error(state.error);
  }, [state, t]);
  return (
    <form ref={form} action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="password">{hasPassword ? t.newPassword : t.createPassword}</Label>
        <PasswordInput id="password" name="password" minLength={8} required autoComplete="new-password" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">{t.repeatPassword}</Label>
        <PasswordInput id="confirm" name="confirm" minLength={8} required autoComplete="new-password" />
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        {hasPassword ? t.passwordMin : t.googleNoPassword}
      </p>
      <div className="flex justify-end sm:col-span-2">
        <Button disabled={pending} variant="outline">
          {pending && <Loader2 className="animate-spin" />} {hasPassword ? t.changePassword : t.savePassword}
        </Button>
      </div>
    </form>
  );
}

export function SignOutEverywhere() {
  const t = settingsText(useApp().lang);
  return (
    <form action={signOutEverywhere}>
      <Button variant="outline" size="sm">
        <LogOut /> {t.signOutEverywhere}
      </Button>
    </form>
  );
}
