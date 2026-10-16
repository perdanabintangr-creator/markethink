"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

type State = "checking" | "ready" | "expired";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("checking");
  const [loading, setLoading] = useState(false);

  // Link reset membawa token di bagian "#..." URL → jadikan sesi login, lalu hapus dari alamat.
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
      if (hash.get("error") || hash.get("error_code")) return setState("expired");
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        return setState(error ? "expired" : "ready");
      }
      const { data } = await supabase.auth.getUser();
      setState(data.user ? "ready" : "expired");
    })();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) return toast.error("Kedua password belum sama.");
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      return toast.error(
        /different from the old/i.test(error.message)
          ? "Password baru harus berbeda dari password lama."
          : /session|jwt|expired/i.test(error.message)
            ? "Link sudah kedaluwarsa. Minta link reset baru."
            : error.message,
      );
    }
    toast.success("Password berhasil diganti 🎉");
    router.replace("/chat");
    router.refresh();
  }

  if (state === "checking") {
    return (
      <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Memeriksa link…
      </p>
    );
  }

  if (state === "expired") {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold">Link sudah tidak berlaku</h1>
        <p className="text-sm text-muted-foreground">Link reset hanya bisa dipakai sekali dan berlaku 1 jam. Minta link baru, ya.</p>
        <Button asChild className="w-full">
          <Link href="/forgot">Minta link reset baru</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Buat password baru</h1>
        <p className="text-sm text-muted-foreground">Minimal 8 karakter.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password baru</Label>
        <PasswordInput id="password" name="password" minLength={8} required autoComplete="new-password" autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Ulangi password baru</Label>
        <PasswordInput id="confirm" name="confirm" minLength={8} required autoComplete="new-password" />
      </div>
      <Button className="w-full" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />} Simpan password
      </Button>
    </form>
  );
}
