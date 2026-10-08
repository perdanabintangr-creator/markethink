import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Markdown } from "@/components/chat/markdown";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Dokumen dibagikan", robots: { index: false, follow: false } };

export default async function SharedCanvasPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();
  const admin = createAdminClient();
  const { data: canvas } = await admin
    .from("canvases")
    .select("id, title, current_version, updated_at")
    .eq("share_token", token)
    .maybeSingle();
  if (!canvas) notFound();
  const { data: version } = await admin
    .from("canvas_versions")
    .select("content")
    .eq("canvas_id", canvas.id)
    .eq("version", canvas.current_version)
    .maybeSingle();

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Logo />
          <Button asChild size="sm"><Link href="/register">Coba Markethink</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold">{canvas.title}</h1>
        <p className="mb-6 text-xs text-muted-foreground">
          Versi {canvas.current_version} · diperbarui {new Date(canvas.updated_at).toLocaleDateString("id-ID")}
        </p>
        <Markdown>{version?.content ?? ""}</Markdown>
      </main>
    </div>
  );
}
