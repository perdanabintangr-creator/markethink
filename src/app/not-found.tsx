import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1>
      <p className="text-muted-foreground">Link mungkin salah atau sudah tidak dibagikan lagi.</p>
      <Button asChild><Link href="/">Ke beranda</Link></Button>
    </div>
  );
}
