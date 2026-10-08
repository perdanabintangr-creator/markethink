"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function ForgotPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }

  if (sent) return <p className="text-center text-sm">Link reset password sudah dikirim ke email kamu.</p>;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-center text-xl font-semibold">Reset password</h1>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <Button className="w-full" disabled={loading}>Kirim link reset</Button>
      <p className="text-center text-sm"><Link href="/login" className="text-primary hover:underline">Kembali</Link></p>
    </form>
  );
}
