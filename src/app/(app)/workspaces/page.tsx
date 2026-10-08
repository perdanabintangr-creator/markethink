import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createWorkspace } from "./actions";

export const metadata = { title: "Brand Workspace" };

export default async function WorkspacesPage() {
  const { supabase } = await requireUser();
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name, brand_kit, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Brand Workspace</h1>
        <p className="mt-1 text-muted-foreground">
          Satu workspace per brand/klien. Isi Brand Kit & upload dokumen — semua chat di workspace otomatis memakai konteks ini.
        </p>

        <form action={createWorkspace} className="mt-6 flex gap-2">
          <Input name="name" placeholder="Nama brand / klien baru" required maxLength={80} />
          <Button>
            <Plus /> Buat
          </Button>
        </form>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {(workspaces ?? []).map((w) => {
            const kit = (w.brand_kit ?? {}) as Record<string, string>;
            const filled = Object.values(kit).filter(Boolean).length;
            return (
              <Link key={w.id} href={`/workspaces/${w.id}`} className="rounded-xl border bg-card p-4 hover:bg-accent/50">
                <div className="flex items-center gap-2 font-medium">
                  <Briefcase className="size-4 text-primary" /> {w.name}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {kit.products || kit.usp || "Brand Kit belum diisi"}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">Brand Kit: {filled}/8 terisi</p>
              </Link>
            );
          })}
        </div>
        {!workspaces?.length && (
          <p className="mt-6 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Belum ada workspace. Buat satu untuk brand utamamu.
          </p>
        )}
      </div>
    </div>
  );
}
