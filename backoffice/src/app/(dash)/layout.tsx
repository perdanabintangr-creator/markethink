import { requireBackoffice } from "@/lib/backoffice";
import { createAdminClient } from "@/lib/supabase/admin";
import { BackofficeShell } from "./shell";

export const metadata = {
  title: { default: "Back Office", template: "%s · Back Office Markethink" },
  robots: { index: false, follow: false },
};

/** Back office tim bisnis — terpisah dari aplikasi AI user, login username + password sendiri. */
export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireBackoffice();
  const { data } = await createAdminClient().rpc("bo_overview").single<Record<string, number>>();
  return (
    <BackofficeShell
      user={{ name: user.full_name, username: user.username, role: user.role }}
      counts={{
        expiring: Number(data?.expiring_7d ?? 0),
        overdue: Number(data?.overdue ?? 0),
        noRecord: Number(data?.paid_without_record ?? 0),
        leads: Number(data?.waitlist_this_month ?? 0),
      }}
    >
      {children}
    </BackofficeShell>
  );
}
