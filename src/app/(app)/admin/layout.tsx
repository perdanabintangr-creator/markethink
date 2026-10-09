import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "./admin-nav";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Internal Markethink</h1>
          <p className="text-sm text-muted-foreground">Monitoring user, paket, biaya AI, dan kesehatan sistem. Hanya untuk tim internal (admin).</p>
        </div>
        <AdminNav />
        {children}
      </div>
    </div>
  );
}
