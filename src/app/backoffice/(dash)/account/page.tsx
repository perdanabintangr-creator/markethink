import { requireBackoffice } from "@/lib/backoffice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTitle } from "@/components/backoffice/stat";
import { ChangePasswordForm } from "./change-password-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Akun saya" };

export default async function AccountPage() {
  const { user } = await requireBackoffice();
  return (
    <div className="max-w-xl space-y-4">
      <PageTitle title="Akun saya" />
      <Card>
        <CardContent className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 p-5 text-sm">
          <span className="text-muted-foreground">Nama</span>
          <span>{user.full_name}</span>
          <span className="text-muted-foreground">Username</span>
          <span>@{user.username}</span>
          <span className="text-muted-foreground">Peran</span>
          <span>{user.role === "owner" ? "Owner" : "Tim"}</span>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ganti password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
