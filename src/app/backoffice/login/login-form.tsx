"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

export function BackofficeLoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onGoogle() {
    setLoading(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/backoffice")}` },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const { error } = await createClient().auth.signInWithPassword({
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
      });
      if (error) {
        setLoading(false);
        return toast.error(error.message === "Invalid login credentials" ? "Email atau password salah." : error.message);
      }
      void fetch("/auth/callback?sync=1", { method: "POST", keepalive: true }).catch(() => {});
      router.replace("/backoffice");
      router.refresh();
    } catch {
      setLoading(false);
      toast.error("Tidak bisa terhubung ke server. Coba lagi sebentar.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}
        {loading ? "Membuka back office…" : "Masuk"}
      </Button>
      {GOOGLE_ENABLED && (
        <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={loading}>
          Masuk dengan Google
        </Button>
      )}
      <p className="text-center text-xs text-muted-foreground">Pakai akun Markethink yang sama dengan aplikasi.</p>
    </form>
  );
}
