import type { ConnectorId } from "@/lib/connectors/apps";
import { cn } from "@/lib/utils";

/** Ikon aplikasi terhubung: lingkaran gradasi khas Canva dengan huruf "C" miring (bukan file logo resmi). */
export function AppIcon({ id, className }: { id: ConnectorId; className?: string }) {
  if (id === "canva") {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_20%_80%,#00C4CC_0%,#5A32FA_55%,#7D2AE8_100%)] font-serif text-[12px] font-bold italic leading-none text-white shadow-sm",
          className,
        )}
      >
        C
      </span>
    );
  }
  return null;
}
