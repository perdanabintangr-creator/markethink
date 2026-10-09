import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBackoffice } from "@/lib/backoffice";
import { dateID } from "@/lib/backoffice-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAction } from "@/components/backoffice/confirm-submit";
import { removeMember } from "../../actions";
import { AddMemberForm } from "./add-member-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tim" };

/** Admin: siapa saja yang boleh membuka back office. */
export default async function TeamPage() {
  const { isAdmin } = await requireBackoffice();
  if (!isAdmin) redirect("/backoffice");
  const admin = createAdminClient();
  const [{ data: admins }, { data: members }] = await Promise.all([
    admin.from("profiles").select("id, email, full_name").eq("role", "admin").order("created_at"),
    admin
      .from("backoffice_members")
      .select("user_id, created_at, member:profiles!backoffice_members_user_id_fkey(email, full_name), adder:profiles!backoffice_members_added_by_fkey(email)")
      .order("created_at"),
  ]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tambah anggota tim</CardTitle>
          <p className="text-xs text-muted-foreground">
            Anggota tim bisa melihat data pelanggan & penjualan dan mencatat pembayaran, tapi tidak bisa mengatur harga atau anggota tim.
            Orangnya harus sudah daftar akun Markethink dulu.
          </p>
        </CardHeader>
        <CardContent>
          <AddMemberForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Yang punya akses back office</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(admins ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2.5">
                <span>
                  <span className="font-medium">{a.email}</span>
                  <span className="block text-xs text-muted-foreground">{a.full_name ?? "-"}</span>
                </span>
                <span className="rounded-full border px-2 py-0.5 text-xs">Admin</span>
              </li>
            ))}
            {(members ?? []).map((m) => {
              const p = m.member as unknown as { email: string | null; full_name: string | null } | null;
              const by = m.adder as unknown as { email: string | null } | null;
              return (
                <li key={m.user_id} className="flex items-center justify-between gap-2 py-2.5">
                  <span>
                    <span className="font-medium">{p?.email}</span>
                    <span className="block text-xs text-muted-foreground">
                      Tim · ditambahkan {dateID(m.created_at)}
                      {by?.email && ` oleh ${by.email}`}
                    </span>
                  </span>
                  <ConfirmAction
                    action={removeMember.bind(null, m.user_id)}
                    title="Cabut akses back office?"
                    description={`${p?.email ?? "Akun ini"} tidak bisa membuka back office lagi. Akun Markethink-nya tetap ada.`}
                    confirmLabel="Cabut akses"
                    size="sm"
                    variant="ghost"
                  >
                    Cabut akses
                  </ConfirmAction>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
