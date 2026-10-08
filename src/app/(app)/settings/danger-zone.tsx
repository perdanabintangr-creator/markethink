"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAccount } from "./actions";

export function DangerZone() {
  const [value, setValue] = useState("");
  return (
    <section className="space-y-3 rounded-xl border border-destructive/40 p-4">
      <h2 className="font-semibold text-destructive">Hapus akun & semua data</h2>
      <p className="text-sm text-muted-foreground">
        Semua chat, workspace, file, canvas, dan memory akan dihapus permanen. Ketik <b>HAPUS</b> untuk konfirmasi.
      </p>
      <form action={deleteAccount} className="flex gap-2">
        <Input name="confirm" value={value} onChange={(e) => setValue(e.target.value)} placeholder="HAPUS" />
        <Button variant="destructive" disabled={value !== "HAPUS"}>Hapus akun</Button>
      </form>
    </section>
  );
}
