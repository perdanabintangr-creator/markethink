/** Utilitas export canvas: CSV dari tabel markdown, DOCX dari markdown sederhana. */

export function parseMarkdownTables(md: string): string[][][] {
  const lines = md.split("\n");
  const tables: string[][][] = [];
  let current: string[][] | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    const isRow = line.startsWith("|") && line.endsWith("|") && line.length > 1;
    if (!isRow) {
      if (current) tables.push(current);
      current = null;
      continue;
    }
    const cells = line
      .slice(1, -1)
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replace(/\\\|/g, "|"));
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // separator
    (current ??= []).push(cells.map(stripInline));
  }
  if (current) tables.push(current);
  return tables.filter((t) => t.length > 1);
}

export function stripInline(s: string) {
  return s
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1");
}

function csvCell(v: string) {
  return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function tablesToCsv(md: string): string | null {
  const tables = parseMarkdownTables(md);
  if (!tables.length) return null;
  // Gabungkan semua tabel yang header-nya sama dengan tabel pertama (kalender per minggu, dll).
  const [first, ...rest] = tables;
  const header = first[0].join("|");
  const rows = [...first, ...rest.filter((t) => t[0].join("|") === header).flatMap((t) => t.slice(1))];
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "markethink"
  );
}

export async function markdownToDocx(md: string, title: string): Promise<Blob> {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = docx;

  const runs = (text: string) =>
    text
      .split(/(\*\*[^*]+\*\*)/g)
      .filter(Boolean)
      .map((seg) =>
        seg.startsWith("**") && seg.endsWith("**")
          ? new TextRun({ text: stripInline(seg.slice(2, -2)), bold: true })
          : new TextRun({ text: stripInline(seg) }),
      );

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];
  const lines = md.split("\n");
  const headingMap = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("|")) {
      const block: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) block.push(lines[i++]);
      const [table] = parseMarkdownTables(block.join("\n"));
      if (table) {
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: table.map(
              (row, r) =>
                new TableRow({
                  children: row.map(
                    (cell) =>
                      new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: cell, bold: r === 0 })] })],
                      }),
                  ),
                }),
            ),
          }),
        );
        children.push(new Paragraph({ text: "" }));
      }
      continue;
    }
    const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (h) children.push(new Paragraph({ heading: headingMap[h[1].length - 1], children: runs(h[2]) }));
    else if (/^[-*]\s+/.test(trimmed)) children.push(new Paragraph({ bullet: { level: 0 }, children: runs(trimmed.replace(/^[-*]\s+/, "")) }));
    else if (/^\d+\.\s+/.test(trimmed)) children.push(new Paragraph({ children: runs(trimmed) }));
    else if (/^-{3,}$/.test(trimmed)) children.push(new Paragraph({ text: "" }));
    else if (trimmed) children.push(new Paragraph({ children: runs(trimmed) }));
    i++;
  }

  const doc = new Document({ title, creator: "Markethink", sections: [{ children }] });
  return Packer.toBlob(doc);
}

export function printHtml(title: string, html: string) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, "&lt;")}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:32px auto;padding:0 24px;line-height:1.6;color:#111}
table{border-collapse:collapse;width:100%;font-size:12px;margin:12px 0}th,td{border:1px solid #ccc;padding:6px;text-align:left;vertical-align:top}
th{background:#f3f3f7}h1,h2,h3{line-height:1.25}a{color:#4b3fd6}</style></head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}
