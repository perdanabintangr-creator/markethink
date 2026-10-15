import { redirect } from "next/navigation";

/** Menu "Marketing Agents" diganti Markethink Agent di Tools Pro (keputusan founder). Chat lama dengan agent tetap bisa dibuka. */
export default function AgentsPage() {
  redirect("/tools/agent");
}
