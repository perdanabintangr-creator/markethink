"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addMember, type ActionState } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddMemberForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(addMember, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.ok);
      ref.current?.reset();
    } else if (state?.error) toast.error(state.error);
  }, [state]);
  return (
    <form ref={ref} action={action} className="flex flex-wrap gap-2">
      <Input name="email" type="email" required placeholder="email anggota tim" className="min-w-48 flex-1" />
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Beri akses
      </Button>
    </form>
  );
}
