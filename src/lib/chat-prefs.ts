/** Preferensi tampilan chat per perangkat (localStorage) → atribut di <html>, dibaca CSS di globals.css. */
export const CHAT_PREFS = {
  text: { key: "mt-chat-text", attr: "data-chat-text", values: ["sm", "md", "lg"], fallback: "md" },
  width: { key: "mt-chat-width", attr: "data-chat-width", values: ["md", "lg"], fallback: "md" },
} as const;
export type ChatPref = keyof typeof CHAT_PREFS;

/** Skrip kecil di <head> supaya ukuran/lebar chat sudah benar sebelum halaman tampil (tanpa kedip). */
export const CHAT_PREFS_SCRIPT = `try{${Object.values(CHAT_PREFS)
  .map((p) => `var v=localStorage.getItem("${p.key}");if(v)document.documentElement.setAttribute("${p.attr}",v);`)
  .join("")}}catch(e){}`;

export function readChatPref(pref: ChatPref): string {
  const p = CHAT_PREFS[pref];
  try {
    const v = localStorage.getItem(p.key);
    return v && (p.values as readonly string[]).includes(v) ? v : p.fallback;
  } catch {
    return p.fallback;
  }
}

export function writeChatPref(pref: ChatPref, value: string) {
  const p = CHAT_PREFS[pref];
  try {
    localStorage.setItem(p.key, value);
  } catch {}
  document.documentElement.setAttribute(p.attr, value);
}
