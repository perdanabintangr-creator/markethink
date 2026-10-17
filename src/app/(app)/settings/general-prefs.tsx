"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { readChatPref, writeChatPref } from "@/lib/chat-prefs";
import { SettingRow } from "./settings-nav";
import { Segmented } from "./segmented";

export function GeneralPrefs({ language }: { language: "id" | "en" }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState("md");
  const [width, setWidth] = useState("md");
  const [lang, setLang] = useState(language);

  useEffect(() => {
    setMounted(true);
    setText(readChatPref("text"));
    setWidth(readChatPref("width"));
  }, []);

  async function changeLang(next: "id" | "en") {
    setLang(next);
    const res = await fetch("/api/profile", { method: "PATCH", body: JSON.stringify({ language: next }) });
    if (!res.ok) {
      setLang(language);
      toast.error("Gagal menyimpan bahasa.");
      return;
    }
    toast.success(next === "id" ? "Bahasa: Indonesia" : "Language: English");
    router.refresh();
  }

  return (
    <div>
      <SettingRow title="Tema" desc="Terang, gelap, atau ikuti pengaturan perangkat.">
        <Segmented
          value={mounted ? (theme ?? "system") : "system"}
          onChange={setTheme}
          options={[
            { id: "system", label: <Monitor />, title: "Sistem" },
            { id: "light", label: <Sun />, title: "Terang" },
            { id: "dark", label: <Moon />, title: "Gelap" },
          ]}
        />
      </SettingRow>
      <SettingRow title="Bahasa" desc="Bahasa tampilan & bahasa jawaban default Markethink.">
        <Segmented
          value={lang}
          onChange={changeLang}
          options={[
            { id: "id", label: "Indonesia" },
            { id: "en", label: "English" },
          ]}
        />
      </SettingRow>
      <SettingRow title="Ukuran teks percakapan" desc="Ukuran tulisan di chat. Tersimpan di perangkat ini.">
        <Segmented
          value={text}
          onChange={(v) => {
            setText(v);
            writeChatPref("text", v);
          }}
          options={[
            { id: "sm", label: "Kecil" },
            { id: "md", label: "Sedang" },
            { id: "lg", label: "Besar" },
          ]}
        />
      </SettingRow>
      <SettingRow title="Lebar kolom chat" desc="Lebar area chat & kotak tulis di layar besar. Tersimpan di perangkat ini.">
        <Segmented
          value={width}
          onChange={(v) => {
            setWidth(v);
            writeChatPref("width", v);
          }}
          options={[
            { id: "md", label: "Sedang" },
            { id: "lg", label: "Lebar" },
          ]}
        />
      </SettingRow>
    </div>
  );
}
