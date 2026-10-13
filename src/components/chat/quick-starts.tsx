"use client";

import { CalendarDays, Image as ImageIcon, MessageSquareText, Presentation, Rocket, TrendingUp, UserRound, type LucideIcon } from "lucide-react";
import type { Lang } from "@/lib/i18n/dict";

export interface QuickStart {
  id: string;
  icon: LucideIcon;
  label: { id: string; en: string };
  /** Kerangka perintah; bagian [..] diisi user. */
  prompt: { id: string; en: string };
  /** Nyalakan Riset Web otomatis. */
  research?: boolean;
}

export const QUICK_STARTS: QuickStart[] = [
  {
    id: "caption",
    icon: MessageSquareText,
    label: { id: "Caption", en: "Captions" },
    prompt: {
      id: "Buatkan 5 caption Instagram untuk [produk/brand], target [audiens], tone [santai/profesional].",
      en: "Write 5 Instagram captions for [product/brand], targeting [audience], in a [casual/professional] tone.",
    },
  },
  {
    id: "campaign",
    icon: Rocket,
    label: { id: "Campaign plan", en: "Campaign plan" },
    prompt: {
      id: "Buatkan campaign plan 1 bulan untuk [produk/brand] dengan tujuan [awareness/penjualan] dan budget [nominal].",
      en: "Create a 1-month campaign plan for [product/brand] with the goal of [awareness/sales] and a budget of [amount].",
    },
  },
  {
    id: "calendar",
    icon: CalendarDays,
    label: { id: "Kalender konten", en: "Content calendar" },
    prompt: {
      id: "Buatkan kalender konten [Instagram/TikTok] 2 minggu untuk [brand], 1 posting per hari.",
      en: "Create a 2-week [Instagram/TikTok] content calendar for [brand], 1 post per day.",
    },
  },
  {
    id: "trend",
    icon: TrendingUp,
    label: { id: "Riset tren", en: "Trend research" },
    prompt: {
      id: "Riset tren marketing terbaru untuk industri [industri] di Indonesia, lengkap dengan sumbernya.",
      en: "Research the latest marketing trends for the [industry] industry in Indonesia, with sources.",
    },
    research: true,
  },
  {
    id: "persona",
    icon: UserRound,
    label: { id: "Buyer persona", en: "Buyer persona" },
    prompt: {
      id: "Bantu saya bikin buyer persona untuk [produk/brand] dengan target pasar [target pasar].",
      en: "Help me build a buyer persona for [product/brand] targeting [target market].",
    },
  },
  {
    id: "pptx",
    icon: Presentation,
    label: { id: "Buat PPT", en: "Make slides" },
    prompt: {
      id: "Buatkan presentasi PPT tentang [topik] untuk [audiens], sekitar [8] slide.",
      en: "Make a PowerPoint deck about [topic] for [audience], around [8] slides.",
    },
  },
  {
    id: "image",
    icon: ImageIcon,
    label: { id: "Buat gambar", en: "Make an image" },
    prompt: {
      id: "Buatkan gambar [deskripsi visual] untuk [feed/story Instagram], gaya [foto produk/ilustrasi].",
      en: "Create an image of [visual description] for an [Instagram feed/story], in a [product photo/illustration] style.",
    },
  },
];

/** Chip jalan pintas di layar chat kosong: mengisi kotak chat dengan kerangka perintah. */
export function QuickStarts({ lang, onPick }: { lang: Lang; onPick: (q: QuickStart) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {QUICK_STARTS.map((q) => {
        const Icon = q.icon;
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onPick(q)}
            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground sm:text-sm"
          >
            <Icon className="size-3.5 sm:size-4" />
            {q.label[lang]}
          </button>
        );
      })}
    </div>
  );
}
