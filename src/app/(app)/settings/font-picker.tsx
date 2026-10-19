"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { APP_FONTS, DEFAULT_FONT, googleFontsUrl, readFont, writeFont, type FontGroup } from "@/lib/fonts";
import { useApp } from "@/components/app/app-context";
import { settingsText } from "@/lib/i18n/settings";

const GROUPS: FontGroup[] = ["standard", "fun", "classic"];

/** Pilihan font tampilan: kartu contoh per font, dikelompokkan rapi / lucu / klasik. */
export function FontPicker() {
  const t = settingsText(useApp().lang);
  const [font, setFont] = useState(DEFAULT_FONT);
  const previewUrl = googleFontsUrl(APP_FONTS);

  useEffect(() => setFont(readFont()), []);

  function pick(id: string, name: string) {
    setFont(id);
    writeFont(id);
    toast.success(t.fontSaved(name));
  }

  return (
    <div className="border-b py-4">
      {/* Semua font dimuat di halaman ini saja supaya contoh tulisannya terlihat. */}
      {previewUrl && <link rel="stylesheet" href={previewUrl} />}
      <p className="text-sm font-medium">{t.font}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{t.fontDesc}</p>
      {GROUPS.map((g) => (
        <div key={g} className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.fontGroups[g]}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {APP_FONTS.filter((f) => f.group === g).map((f) => {
              const active = f.id === font;
              const name = f.id === DEFAULT_FONT ? t.fontDefault : f.name;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => pick(f.id, name)}
                  style={f.family ? { fontFamily: f.family } : undefined}
                  className={cn(
                    "relative rounded-xl border p-3 text-left transition-colors hover:bg-muted/50",
                    active && "border-primary ring-1 ring-primary/40 bg-primary/5",
                  )}
                >
                  {active && <Check className="absolute right-2.5 top-2.5 size-4 text-primary" />}
                  <p className="pr-6 text-base font-semibold">{name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t.fontSample}</p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
