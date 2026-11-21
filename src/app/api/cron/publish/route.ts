import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { internalAuthorized } from "@/lib/vault-auth";
import { igEnabled } from "@/lib/instagram";
import { publishDue } from "@/lib/autopilot/publish";

export const maxDuration = 300;

/** Dipicu pg_cron Supabase tiap 5 menit: posting konten ACC yang sudah jatuh tempo ke Instagram pelanggan. */
export async function POST(req: Request) {
  if (!(await internalAuthorized(req))) return NextResponse.json({ ok: false }, { status: 401 });
  if (!igEnabled()) return NextResponse.json({ ok: true, disabled: true });
  return NextResponse.json({ ok: true, ...(await publishDue(createAdminClient())) });
}
