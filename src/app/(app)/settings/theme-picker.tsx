"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const options = [
    { id: "light", label: "Terang", icon: Sun },
    { id: "dark", label: "Gelap", icon: Moon },
    { id: "system", label: "Sistem", icon: Monitor },
  ];
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <Button key={o.id} variant={theme === o.id ? "default" : "outline"} onClick={() => setTheme(o.id)} suppressHydrationWarning>
          <o.icon /> {o.label}
        </Button>
      ))}
    </div>
  );
}
