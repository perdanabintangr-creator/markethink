import type { ConnectorId } from "@/lib/connectors/apps";
import { cn } from "@/lib/utils";

/** Ikon aplikasi terhubung (lencana huruf berwarna, tanpa memakai logo resmi). */
export function AppIcon({ id, className }: { id: ConnectorId; className?: string }) {
  if (id === "canva") {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00C4CC] to-[#7D2AE8] text-[11px] font-bold leading-none text-white",
          className,
        )}
      >
        C
      </span>
    );
  }
  return null;
}
