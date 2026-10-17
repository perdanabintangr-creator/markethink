"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { changePassword, signOutEverywhere } from "./actions";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePassword, undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      toast.success("Password berhasil diganti");
      form.current?.reset();
    }
    if (state?.error) toast.error(state.error);
  }, [state]);
  return (
    <form ref={form} action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="password">{hasPassword ? "Password baru" : "Buat password"}</Label>
        <PasswordInput id="password" name="password" minLength={8} required autoComplete="new-password" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Ulangi password</Label>
        <PasswordInput id="confirm" name="confirm" minLength={8} required autoComplete="new-password" />
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        {hasPassword ? "Minimal 8 karakter." : "Kamu masuk lewat Google. Buat password bila ingin juga bisa masuk pakai email + password."}
      </p>
      <div className="flex justify-end sm:col-span-2">
        <Button disabled={pending} variant="outline">
          {pending && <Loader2 className="animate-spin" />} {hasPassword ? "Ganti password" : "Simpan password"}
        </Button>
      </div>
    </form>
  );
}

export function SignOutEverywhere() {
  return (
    <form action={signOutEverywhere}>
      <Button variant="outline" size="sm">
        <LogOut /> Keluar dari semua perangkat
      </Button>
    </form>
  );
}
