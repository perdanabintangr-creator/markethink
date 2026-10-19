"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { readChatPref, writeChatPref } from "@/lib/chat-prefs";
import { useApp } from "@/components/app/app-context";
import { settingsText } from "@/lib/i18n/settings";
import { SettingRow } from "./settings-nav";
import { Segmented } from "./segmented";
import { FontPicker } from "./font-picker";

export function GeneralPrefs({ language }: { language: "id" | "en" }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState("md");
  const [width, setWidth] = useState("md");
  const [lang, setLang] = useState(language);
  const t = settingsText(useApp().lang);

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
      toast.error(t.languageSaveFailed);
      return;
    }
    toast.success(next === "id" ? "Bahasa: Indonesia" : "Language: English");
    router.refresh();
  }

  return (
    <div>
      <SettingRow title={t.theme} desc={t.themeDesc}>
        <Segmented
          value={mounted ? (theme ?? "system") : "system"}
          onChange={setTheme}
          options={[
            { id: "system", label: <Monitor />, title: t.themeSystem },
            { id: "light", label: <Sun />, title: t.themeLight },
            { id: "dark", label: <Moon />, title: t.themeDark },
          ]}
        />
      </SettingRow>
      <SettingRow title={t.language} desc={t.languageDesc}>
        <Segmented
          value={lang}
          onChange={changeLang}
          options={[
            { id: "id", label: "Indonesia" },
            { id: "en", label: "English" },
          ]}
        />
      </SettingRow>
      <FontPicker />
      <SettingRow title={t.textSize} desc={t.textSizeDesc}>
        <Segmented
          value={text}
          onChange={(v) => {
            setText(v);
            writeChatPref("text", v);
          }}
          options={[
            { id: "sm", label: t.small },
            { id: "md", label: t.medium },
            { id: "lg", label: t.large },
          ]}
        />
      </SettingRow>
      <SettingRow title={t.chatWidth} desc={t.chatWidthDesc}>
        <Segmented
          value={width}
          onChange={(v) => {
            setWidth(v);
            writeChatPref("width", v);
          }}
          options={[
            { id: "md", label: t.medium },
            { id: "lg", label: t.wide },
          ]}
        />
      </SettingRow>
    </div>
  );
}
