import Image from "next/image";
import Link from "next/link";
import { BRAND, BRAND_ICON, BRAND_WORDMARK_PARTS } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Ikon logo (huruf Q Marqthink). */
export function LogoMark({ className }: { className?: string }) {
  return <Image src={BRAND_ICON} alt="" width={64} height={64} className={cn("size-7 shrink-0 object-contain", className)} draggable={false} priority />;
}

/** Wordmark "MARQ" (warna teks, menyesuaikan tema) + "THINK" (gradasi biru seperti logo). */
export function Wordmark({ className }: { className?: string }) {
  const [first, second] = BRAND_WORDMARK_PARTS;
  return (
    <span className={cn("font-brand font-extrabold tracking-wide", className)} aria-label={BRAND}>
      <span aria-hidden>{first}</span>
      <span aria-hidden className="bg-gradient-to-r from-[#0a6cff] to-[#12d0f5] bg-clip-text text-transparent">
        {second}
      </span>
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <Wordmark />
    </Link>
  );
}
