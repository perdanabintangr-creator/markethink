import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold">Halaman tidak ditemukan</h1>
      <Link href="/" className="text-primary hover:underline">Kembali ke dashboard</Link>
    </main>
  );
}
