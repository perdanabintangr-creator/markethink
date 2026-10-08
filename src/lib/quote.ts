/**
 * Pesan yang membalas/menanyakan potongan jawaban AI dikirim sebagai blockquote markdown di awal pesan:
 *   > potongan teks
 *
 *   pertanyaan user
 */
export function buildQuotedMessage(quote: string, text: string) {
  const quoted = quote
    .trim()
    .split(/\r?\n/)
    .map((l) => `> ${l}`.trimEnd())
    .join("\n");
  return `${quoted}\n\n${text.trim()}`;
}

/** Pisahkan kutipan di awal pesan (bila ada) dari isi pertanyaan, untuk ditampilkan rapi di bubble user. */
export function parseQuotedMessage(text: string): { quote: string | null; body: string } {
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].startsWith(">")) i++;
  if (i === 0) return { quote: null, body: text };
  const quote = lines
    .slice(0, i)
    .map((l) => l.replace(/^>\s?/, ""))
    .join("\n")
    .trim();
  return { quote: quote || null, body: lines.slice(i).join("\n").trim() };
}
