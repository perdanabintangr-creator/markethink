import "server-only";
import { untrusted } from "./prompt";

export interface Source {
  id: number;
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
}

export async function webSearch(query: string, opts: { maxResults?: number; signal?: AbortSignal } = {}): Promise<Source[]> {
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

export function formatSources(sources: Source[]) {
  return sources
    .map((s) =>
      untrusted(`web:${s.url}`, `[${s.id}] ${s.title}${s.publishedDate ? ` (${s.publishedDate})` : ""}\nURL: ${s.url}\n${s.content}`),
    )
    .join("\n\n");
}
