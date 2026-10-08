"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password berhasil diganti");
    router.push("/chat");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-center text-xl font-semibold">Password baru</h1>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" minLength={8} required />
      </div>
      <Button className="w-full" disabled={loading}>Simpan</Button>
    </form>
  );
}
