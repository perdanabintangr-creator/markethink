"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { setupOwner, type ActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function SetupForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(setupOwner, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Nama</Label>
        <Input id="full_name" name="full_name" required maxLength={80} autoComplete="name" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" required minLength={3} maxLength={32} autoComplete="username" autoCapitalize="none" placeholder="mis. dana" />
        <p className="text-xs text-muted-foreground">Huruf kecil, angka, titik, - atau _ (3–32 karakter).</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password2">Ulangi password</Label>
        <Input id="password2" name="password2" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      {state?.error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Buat akun & masuk
      </Button>
    </form>
  );
}
