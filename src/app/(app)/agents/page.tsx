import { redirect } from "next/navigation";

/** Menu "Marketing Agents" diganti Marqthink Agent di Tools Pro (keputusan founder). Chat lama dengan agent tetap bisa dibuka. */
export default function AgentsPage() {
  redirect("/tools/agent");
}
