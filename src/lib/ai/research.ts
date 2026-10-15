import "server-only";
import { untrusted } from "./prompt";

export interface Source {
  id: number;
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
}

/** Biaya per pencarian (USD) — dipakai untuk catatan biaya. */
export const SERPER_COST_USD = 0.001;
export const serperEnabled = () => Boolean(process.env.SERPER_API_KEY?.trim());
/** Ada API pencarian web sendiri (Serper → Tavily) untuk mode Riset Web. */
export const searchApiEnabled = () => serperEnabled() || Boolean(process.env.TAVILY_API_KEY);

/** Pencarian Google via Serper (±$1 per 1.000 pencarian), hasil untuk Indonesia. */
export async function serperSearch(query: string, opts: { maxResults?: number; signal?: AbortSignal } = {}): Promise<Source[]> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": process.env.SERPER_API_KEY!.trim() },
    body: JSON.stringify({ q: query.slice(0, 400), gl: "id", hl: "id", num: Math.min(10, opts.maxResults ?? 8) }),
    signal: opts.signal,
  });
  if (!res.ok) throw new Error(`Serper error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as {
    answerBox?: { title?: string; answer?: string; snippet?: string; link?: string };
    knowledgeGraph?: { title?: string; description?: string; descriptionLink?: string; website?: string };
    organic?: { title: string; link: string; snippet?: string; date?: string; sitelinks?: unknown }[];
    peopleAlsoAsk?: { question: string; snippet?: string; link?: string; title?: string }[];
  };
  const list: Omit<Source, "id">[] = [];
  const ab = data.answerBox;
  if (ab?.link && (ab.answer || ab.snippet)) list.push({ title: ab.title ?? "Jawaban Google", url: ab.link, content: (ab.answer ?? ab.snippet)! });
  const kg = data.knowledgeGraph;
  const kgLink = kg?.descriptionLink ?? kg?.website;
  if (kg?.description && kgLink) list.push({ title: kg.title ?? "Knowledge Graph", url: kgLink, content: kg.description });
  for (const o of data.organic ?? []) list.push({ title: o.title, url: o.link, content: o.snippet ?? "", publishedDate: o.date });
  for (const q of (data.peopleAlsoAsk ?? []).slice(0, 3)) if (q.link && q.snippet) list.push({ title: q.question, url: q.link, content: q.snippet });
  const seen = new Set<string>();
  return list
    .filter((r) => r.url && !seen.has(r.url) && (seen.add(r.url), true))
    .slice(0, opts.maxResults ?? 8)
    .map((r, i) => ({ ...r, id: i + 1, content: r.content.slice(0, 1500) }));
}

async function tavilySearch(query: string, opts: { maxResults?: number; signal?: AbortSignal } = {}): Promise<Source[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("TAVILY_API_KEY belum diisi");
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      query: query.slice(0, 400),
      search_depth: "basic",
      max_results: opts.maxResults ?? 6,
      include_answer: false,
    }),
    signal: opts.signal,
  });
  if (!res.ok) throw new Error(`Tavily error ${res.status}`);
  const data = (await res.json()) as {
    results?: { title: string; url: string; content: string; published_date?: string }[];
  };
  return (data.results ?? []).map((r, i) => ({
    id: i + 1,
    title: r.title,
    url: r.url,
    content: r.content.slice(0, 1500),
    publishedDate: r.published_date,
  }));
}

/** Pencarian web untuk Riset Web: Serper (paling murah) bila tersedia, selain itu Tavily. */
export async function webSearch(query: string, opts: { maxResults?: number; signal?: AbortSignal } = {}): Promise<Source[]> {
  if (serperEnabled()) {
    try {
      return await serperSearch(query, opts);
    } catch (err) {
      if (!process.env.TAVILY_API_KEY) throw err;
      console.error("[serper] gagal, pakai Tavily", err);
    }
  }
  return tavilySearch(query, opts);
}

export function formatSources(sources: Source[]) {
  return sources
    .map((s) =>
      untrusted(`web:${s.url}`, `[${s.id}] ${s.title}${s.publishedDate ? ` (${s.publishedDate})` : ""}\nURL: ${s.url}\n${s.content}`),
    )
    .join("\n\n");
}
