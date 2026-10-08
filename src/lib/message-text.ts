/**
 * Kelompokkan bagian teks yang berurutan jadi satu blok. Claude memecah jawaban ber-sitasi
 * menjadi banyak potongan teks, jadi potongan yang bersebelahan disambung tanpa jeda;
 * blok baru dimulai setelah tool (pencarian, gambar, PPT) atau langkah baru.
 */
export function textBlocks(parts: { type: string; text?: string }[]): string[] {
  const blocks: string[] = [];
  let open = false;
  for (const p of parts) {
    if (p.type === "text") {
      if (open) blocks[blocks.length - 1] += p.text ?? "";
      else blocks.push(p.text ?? "");
      open = true;
    } else if (!isTransparent(p.type)) {
      open = false;
    }
  }
  return blocks.map((b) => b.trim()).filter(Boolean);
}

/** Bagian yang tidak memutus aliran teks (sumber & status). */
export function isTransparent(type: string) {
  return type === "source-url" || type === "source-document" || type.startsWith("data-") || type === "reasoning";
}
