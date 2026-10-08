"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
const CONFIG_ERROR = "Server login belum terkonfigurasi. Hubungi admin.";

function getClient() {
  try {
    return createClient();
  } catch {
    return null;
  }
}

function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/chat";
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);

  const callbackUrl = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function onGoogle() {
    if (mode === "register" && !consent) return toast.error("Setujui Syarat & Kebijakan Privasi dulu ya.");
    const supabase = getClient();
    if (!supabase) return toast.error(CONFIG_ERROR);
    setLoading(true);
    if (mode === "register") localStorage.setItem("mt_consent_at", new Date().toISOString());
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl() } });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const supabase = getClient();
    if (!supabase) return toast.error(CONFIG_ERROR);
    setLoading(true);
    try {
      await submitWith(supabase, email, password, form);
    } catch (err) {
      console.error(err);
      toast.error("Tidak bisa terhubung ke server. Coba lagi sebentar.");
    } finally {
      setLoading(false);
    }
  }

  async function submitWith(
    supabase: NonNullable<ReturnType<typeof getClient>>,
    email: string,
    password: string,
    form: FormData,
  ) {
    if (mode === "register") {
      if (!consent) {
        setLoading(false);
        return toast.error("Setujui Syarat & Kebijakan Privasi dulu ya.");
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: callbackUrl(),
          data: { full_name: String(form.get("name") ?? "").trim(), consent_at: new Date().toISOString() },
        },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      if (data.session) {
        router.push("/onboarding");
        router.refresh();
      } else setSent(true);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message === "Invalid login credentials" ? "Email atau password salah." : error.message);
    await fetch("/auth/callback?sync=1", { method: "POST" });
    router.push(next);
    router.refresh();
  }

  if (sent) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">Cek email kamu 📬</h1>
        <p className="text-sm text-muted-foreground">
          Kami sudah kirim link konfirmasi. Klik link tersebut untuk mengaktifkan akun beta kamu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">{mode === "login" ? "Masuk ke Markethink" : "Daftar Beta Gratis"}</h1>
        <p className="text-sm text-muted-foreground">
          {mode === "login" ? "Lanjutkan ke otak marketing kamu." : "Coba gratis dengan kuota harian."}
        </p>
      </div>

      {mode === "register" && (
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            Saya berusia minimal 18 tahun dan setuju dengan <Link href="/terms" className="underline" target="_blank">Syarat Layanan</Link> dan{" "}
            <Link href="/privacy" className="underline" target="_blank">Kebijakan Privasi</Link>, termasuk pemrosesan data
            oleh penyedia AI pihak ketiga sesuai UU PDP. Saya tidak akan memasukkan data rahasia.
          </span>
        </label>
      )}

      {GOOGLE_ENABLED && (
        <>
          <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={loading}>
            <GoogleIcon /> Lanjut dengan Google
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> atau <div className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        {mode === "register" && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" name="name" required maxLength={80} autoComplete="name" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {mode === "login" && (
              <Link href="/forgot" className="text-xs text-muted-foreground hover:underline">
                Lupa password?
              </Link>
            )}
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          {mode === "login" ? "Masuk" : "Daftar"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            Belum punya akun? <Link href="/register" className="font-medium text-primary hover:underline">Daftar gratis</Link>
          </>
        ) : (
          <>
            Sudah punya akun? <Link href="/login" className="font-medium text-primary hover:underline">Masuk</Link>
          </>
        )}
      </p>
    </div>
  );
}
