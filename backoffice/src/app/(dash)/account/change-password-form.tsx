"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { changeOwnPassword, type ActionState } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(changeOwnPassword, undefined);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.ok);
      setKey((k) => k + 1);
    } else if (state?.error) toast.error(state.error);
  }, [state]);
  return (
    <form key={key} action={action} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="current">Password lama</Label>
        <Input id="current" name="current" type="password" required autoComplete="current-password" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password baru</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password2">Ulangi password baru</Label>
        <Input id="password2" name="password2" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Simpan password baru
      </Button>
    </form>
  );
}
