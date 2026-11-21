import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadOnboarding } from "@/lib/brand/server";
import { kitChanged } from "@/lib/brand/onboarding";
import { brandDnaSchema } from "@/lib/brand/dna";
import { OnboardingView, type ObVersion } from "@/components/brand/onboarding-view";

export const metadata = { title: "Brand Onboarding" };
export const dynamic = "force-dynamic";

export default async function BrandOnboardingPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
  const { supabase, profile } = await requireUser();
  const lang = profile.language === "en" ? "en" : "id";
  const { ws } = await searchParams;
  const { data: wsRows } = await supabase.from("workspaces").select("id, name").order("created_at", { ascending: true }).limit(50);
  const workspaces = (wsRows ?? []).map((w) => ({ id: w.id as string, name: w.name as string }));
  const { data: settings } = await supabase.from("autopilot_settings").select("workspace_id").maybeSingle();
  const workspaceId = workspaces.find((w) => w.id === ws)?.id ?? workspaces.find((w) => w.id === settings?.workspace_id)?.id ?? workspaces[0]?.id ?? null;

  if (!workspaceId)
    return (
      <div className="mx-auto max-w-xl space-y-3 px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Brand Onboarding</h1>
        <p className="text-sm text-muted-foreground">Buat project (brand) dulu, lalu kembali ke sini untuk melengkapi profil brand.</p>
        <Link href="/workspaces" className="text-sm font-medium underline">
          Buat project
        </Link>
      </div>
    );

  const o = await loadOnboarding(createAdminClient(), profile.id, workspaceId);
  if (!o) return null;
  const kit: Record<string, string> = {};
  for (const [k, v] of Object.entries(o.kit)) if (typeof v === "string") kit[k] = v;
  const versions: ObVersion[] = o.versions
    .map((v) => ({ ...v, dna: brandDnaSchema.safeParse(v.dna) }))
    .filter((v) => v.dna.success)
    .map((v) => ({
      version: Number(v.version),
      status: v.status as ObVersion["status"],
      dna: v.dna.data!,
      cost_usd: v.cost_usd === null ? null : Number(v.cost_usd),
      edited_by_user: Boolean(v.edited_by_user),
      approved_at: (v.approved_at as string | null) ?? null,
      created_at: String(v.created_at),
    }));
  const active = o.versions.find((v) => Number(v.version) === o.approvedVersion);
  const changed = active ? kitChanged(active.kit_snapshot as Record<string, unknown> | null, { ...o.kit, _assets: o.assets.length }) : false;

  return (
    <OnboardingView
      key={workspaceId}
      lang={lang}
      workspaces={workspaces}
      data={{
        workspaceId,
        name: String(o.ws.name),
        kit,
        assets: o.assets.map((a) => ({ id: a.id, kind: a.kind })),
        versions,
        percent: o.completeness.percent,
        missing: o.completeness.missing,
        status: String(o.ws.onboarding_status ?? "draft"),
        approvedVersion: o.approvedVersion,
        kitChanged: changed,
      }}
    />
  );
}
