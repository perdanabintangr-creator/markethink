"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle, MessageSquareQuote } from "lucide-react";
import { useApp } from "@/components/app/app-context";

/**
 * Saat user memblok teks di jawaban AI, munculkan tombol kecil di atas blok:
 * "Tanyakan" (kutip ke kotak chat) dan "Jelaskan" (langsung minta penjelasan).
 */
export function SelectionAsk({
  children,
  onAsk,
  onExplain,
}: {
  children: React.ReactNode;
  onAsk: (text: string) => void;
  onExplain: (text: string) => void;
}) {
  const { t } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<{ text: string; x: number; y: number } | null>(null);
  // Di HP, menyentuh tombol bisa menghapus blok teks lebih dulu — tahan popover selama tombol disentuh.
  const pressing = useRef(false);

  useEffect(() => {
    let timer: number | undefined;
    const update = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (pressing.current) return;
        const s = window.getSelection();
        const el = ref.current;
        if (!s || s.isCollapsed || !s.rangeCount || !el) return setSel(null);
        const range = s.getRangeAt(0);
        if (!el.contains(range.commonAncestorContainer)) return setSel(null);
        const text = s.toString().trim();
        if (text.length < 2) return setSel(null);
        const r = range.getBoundingClientRect();
        const c = el.getBoundingClientRect();
        const x = Math.max(90, Math.min(r.left - c.left + r.width / 2, c.width - 90));
        setSel({ text: text.slice(0, 2000), x, y: r.top - c.top });
      }, 150);
    };
    document.addEventListener("selectionchange", update);
    return () => {
      document.removeEventListener("selectionchange", update);
      window.clearTimeout(timer);
    };
  }, []);

  function run(fn: (text: string) => void) {
    pressing.current = false;
    if (!sel) return;
    fn(sel.text);
    window.getSelection()?.removeAllRanges();
    setSel(null);
  }

  return (
    <div ref={ref} className="relative">
      {children}
      {sel && (
        <div
          className="absolute z-20 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-lg border bg-popover p-1 text-xs shadow-lg"
          style={{ left: sel.x, top: Math.max(sel.y - 6, 0) }}
          // Jangan hilangkan blok teks saat tombol diklik.
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={() => (pressing.current = true)}
          onPointerCancel={() => (pressing.current = false)}
        >
          <button
            onClick={() => run(onAsk)}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium hover:bg-accent"
          >
            <MessageSquareQuote className="size-3.5" /> {t.askAbout}
          </button>
          <button
            onClick={() => run(onExplain)}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium hover:bg-accent"
          >
            <HelpCircle className="size-3.5" /> {t.explainThis}
          </button>
        </div>
      )}
    </div>
  );
}
