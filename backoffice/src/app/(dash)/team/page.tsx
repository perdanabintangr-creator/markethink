import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBackoffice } from "@/lib/backoffice";
import { dateID } from "@/lib/backoffice-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/backoffice/stat";
import { ConfirmAction } from "@/components/backoffice/confirm-submit";
import { setMemberActive } from "../../actions";
import { CreateMemberForm, ResetPasswordButton } from "./member-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tim & akun" };

/** Owner: kelola akun login back office (username + password) untuk tim. */
export default async function TeamPage() {
  const { user, isOwner } = await requireBackoffice();
  if (!isOwner) redirect("/");
  const { data: members } = await createAdminClient()
    .from("backoffice_users")
    .select("id, username, full_name, role, active, last_login_at, locked_until, created_at")
    .order("created_at");

  return (
    <div className="space-y-6">
      <PageTitle title="Tim & akun" description="Akun login back office untuk tim. Terpisah dari akun aplikasi Markethink — tidak perlu email." />
      <div className="grid gap-4 xl:grid-cols-[1fr_1.6fr]">
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Buat akun baru</CardTitle>
            <p className="text-xs text-muted-foreground">
              <b>Tim</b>: lihat data, catat penjualan, ubah paket pelanggan. <b>Owner</b>: semua itu + atur harga & akun tim.
            </p>
          </CardHeader>
          <CardContent>
            <CreateMemberForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daftar akun</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">Nama</th>
                  <th>Peran</th>
                  <th>Status</th>
                  <th>Login terakhir</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y">
                {(members ?? []).map((m) => {
                  const locked = m.locked_until && new Date(m.locked_until).getTime() > Date.now();
                  const me = m.id === user.id;
                  return (
                    <tr key={m.id} className={m.active ? "" : "text-muted-foreground"}>
                      <td className="py-2.5">
                        <div className="font-medium">
                          {m.full_name}
                          {me && <span className="ml-1 text-xs font-normal text-muted-foreground">(kamu)</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">@{m.username} · dibuat {dateID(m.created_at)}</div>
                      </td>
                      <td>{m.role === "owner" ? "Owner" : "Tim"}</td>
                      <td>
                        {!m.active ? "Nonaktif" : locked ? <span className="text-destructive">Terkunci sementara</span> : "Aktif"}
                      </td>
                      <td className="text-xs">{m.last_login_at ? dateID(m.last_login_at) : "belum pernah"}</td>
                      <td className="py-2.5">
                        <div className="flex justify-end gap-1">
                          {!me && <ResetPasswordButton memberId={m.id} name={m.full_name} />}
                          {!me &&
                            (m.active ? (
                              <ConfirmAction
                                action={setMemberActive.bind(null, m.id, false)}
                                title={`Nonaktifkan akun ${m.full_name}?`}
                                description="Akun tidak bisa login lagi dan langsung dikeluarkan dari semua perangkat. Bisa diaktifkan kembali kapan saja."
                                confirmLabel="Nonaktifkan"
                                size="sm"
                                variant="ghost"
                              >
                                Nonaktifkan
                              </ConfirmAction>
                            ) : (
                              <form action={setMemberActive.bind(null, m.id, true)}>
                                <Button size="sm" variant="ghost">Aktifkan</Button>
                              </form>
                            ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              Salah password 5× → akun terkunci 15 menit. Reset password juga membuka kunci. Owner terakhir tidak bisa dinonaktifkan.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
