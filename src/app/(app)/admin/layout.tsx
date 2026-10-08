import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "./admin-nav";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold">Admin Markethink</h1>
        <AdminNav />
        {children}
      </div>
    </div>
  );
}
