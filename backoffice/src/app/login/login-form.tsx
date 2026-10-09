"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction, type ActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function BackofficeLoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" required autoComplete="username" autoCapitalize="none" spellCheck={false} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {state?.error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "Memeriksa…" : "Masuk"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Lupa password? Minta owner back office untuk reset.</p>
    </form>
  );
}
