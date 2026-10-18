"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function ForgotPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send(email: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return void toast.error(data.message ?? "Gagal mengirim. Coba lagi.");
      setSentTo(email);
    } catch {
      toast.error("Tidak bisa terhubung ke server. Coba lagi sebentar.");
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-4 text-center">
        <MailCheck className="mx-auto size-10 text-primary" />
        <h1 className="text-xl font-semibold">Cek email kamu 📬</h1>
        <p className="text-sm text-muted-foreground">
          Kalau <b className="text-foreground">{sentTo}</b> terdaftar di Markethink, link untuk membuat password baru sudah kami kirim. Link bisa dibuka di HP
          maupun laptop dan berlaku 1 jam.
        </p>
        <p className="text-xs text-muted-foreground">Tidak ada di kotak masuk? Cek folder Spam/Promosi, tunggu 1-2 menit.</p>
        <Button variant="outline" className="w-full" disabled={loading} onClick={() => send(sentTo)}>
          {loading && <Loader2 className="animate-spin" />} Kirim ulang
        </Button>
        <p className="text-sm">
          <Link href="/login" className="text-primary hover:underline">Kembali ke halaman masuk</Link>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void send(String(new FormData(e.currentTarget).get("email") ?? "").trim());
      }}
      className="space-y-4"
    >
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Lupa password?</h1>
        <p className="text-sm text-muted-foreground">Masukkan email akun kamu, nanti kami kirim link untuk membuat password baru.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" autoFocus />
      </div>
      <Button className="w-full" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />} Kirim link reset
      </Button>
      <p className="text-center text-xs text-muted-foreground">Daftar pakai Google? Cukup masuk lagi dengan tombol Google, tidak perlu password.</p>
      <p className="text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">Kembali</Link>
      </p>
    </form>
  );
}
