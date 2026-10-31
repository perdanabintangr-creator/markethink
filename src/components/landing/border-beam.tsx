import { cn } from "@/lib/utils";

/** Bingkai dengan sinar yang berputar mengelilingi kartu (CSS murni). */
export function BorderBeam({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl p-px", className)}>
      <div className="mq-motion pointer-events-none absolute -inset-[60%] animate-[mq-orbit_6s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_250deg,#12d0f5_310deg,#0a6cff_340deg,transparent_360deg)]" />
      <div className="relative rounded-[calc(1.5rem-1px)] bg-[#081230]">{children}</div>
    </div>
  );
}
