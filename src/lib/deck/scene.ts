/**
 * "Scene" = hasil tata letak deck Promax dalam bentuk primitif (kotak, garis, foto, teks yang sudah dipecah per baris).
 * Satu scene digambar persis sama oleh tiga penggambar: PPT (pptxgenjs), PDF (pdf-lib), dan pratinjau browser.
 * Satuan posisi: inci (kanvas 13,333 × 7,5). Ukuran huruf & spasi huruf: pt. Warna: hex tanpa "#". Opasitas 0–1.
 */

import type { MoodId } from "./moods";

export type FontRole = "head" | "body" | "strong";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SceneItem =
  | ({ t: "rect" | "ellipse"; fill?: string; fo?: number; line?: string; lo?: number; lw?: number; r?: number } & Box)
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; color: string; o?: number; lw: number }
  | ({ t: "img"; key: string; fit?: "cover" | "contain" } & Box)
  /** Gradasi transparan satu warna: opasitas `from` di awal → `to` di akhir, mengikuti arah `dir`. */
  | ({ t: "grad"; color: string; from: number; to: number; dir: "right" | "left" | "down" | "up" } & Box)
  | ({
      t: "text";
      lines: string[];
      font: FontRole;
      size: number;
      color: string;
      o?: number;
      /** Spasi huruf (pt). */
      ls?: number;
      /** Tinggi baris (kelipatan ukuran huruf). */
      lh: number;
      align?: "left" | "center" | "right";
      valign?: "top" | "middle" | "bottom";
    } & Box);

export interface SceneSlide {
  bg: string;
  items: SceneItem[];
  notes?: string;
}

export interface SceneFont {
  family: string;
  file: string;
  bold: boolean;
}

export interface Scene {
  v: 1;
  w: number;
  h: number;
  mood: MoodId;
  fonts: Record<FontRole, SceneFont>;
  slides: SceneSlide[];
}

export const SCENE_W = 13.333;
export const SCENE_H = 7.5;
