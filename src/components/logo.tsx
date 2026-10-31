import Link from "next/link";
import { BRAND_WORDMARK } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** `gradientId` wajib unik bila logo tampil lebih dari sekali di satu halaman (mis. sidebar & bar atas). */
export function LogoMark({ className, gradientId = "mt-logo-g" }: { className?: string; gradientId?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-7", className)} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e5bff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${gradientId})`} />
      <path d="M16 44V20l16 14 16-14v24" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/", className, gradientId }: { href?: string; className?: string; gradientId?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark gradientId={gradientId} />
      <span className="tracking-wide">{BRAND_WORDMARK}</span>
    </Link>
  );
}
