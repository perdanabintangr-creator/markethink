"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createMember, resetMemberPassword, type ActionState } from "../../actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, NativeSelect } from "@/components/ui/input";

/** Saran password acak yang mudah diketik ulang (tanpa huruf/angka yang mirip). */
function suggestPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function PasswordField({ id, name = "password" }: { id: string; name?: string }) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Password</Label>
      <div className="flex gap-2">
        <Input id={id} name={name} type={show ? "text" : "password"} required minLength={8} value={value} onChange={(e) => setValue(e.target.value)} autoComplete="new-password" />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setValue(suggestPassword());
            setShow(true);
          }}
        >
          Buatkan
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Minimal 8 karakter. Catat dulu sebelum disimpan — password tidak bisa dilihat lagi.</p>
    </div>
  );
}

export function CreateMemberForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createMember, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.ok, { duration: 8000 });
      setFormKey((k) => k + 1);
    } else if (state?.error) toast.error(state.error);
  }, [state]);
  return (
    <form key={formKey} ref={ref} action={action} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="m-name">Nama</Label>
        <Input id="m-name" name="full_name" required maxLength={80} placeholder="mis. Rina Sales" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-username">Username</Label>
        <Input id="m-username" name="username" required minLength={3} maxLength={32} autoCapitalize="none" spellCheck={false} placeholder="mis. rina" />
        <p className="text-xs text-muted-foreground">Huruf kecil, angka, titik, - atau _ (3–32 karakter).</p>
      </div>
      <PasswordField id="m-password" />
      <div className="space-y-1.5">
        <Label htmlFor="m-role">Peran</Label>
        <NativeSelect id="m-role" name="role" defaultValue="staff">
          <option value="staff">Tim</option>
          <option value="owner">Owner</option>
        </NativeSelect>
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Buat akun
      </Button>
    </form>
  );
}

export function ResetPasswordButton({ memberId, name }: { memberId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(resetMemberPassword.bind(null, memberId), undefined);
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.ok);
      setOpen(false);
    } else if (state?.error) toast.error(state.error);
  }, [state]);
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Reset password
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password {name}</DialogTitle>
            <DialogDescription>Password lama tidak berlaku lagi dan akun ini dikeluarkan dari semua perangkat.</DialogDescription>
          </DialogHeader>
          {open && (
            <form action={action} className="space-y-3">
              <PasswordField id={`reset-${memberId}`} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="animate-spin" />}
                  Simpan password baru
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
