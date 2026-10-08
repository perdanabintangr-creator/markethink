"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { EXPERIENCE, INDUSTRIES, ROLES } from "@/lib/personas";

const schema = z.object({
  persona_role: z.enum(ROLES.map((r) => r.id) as [string, ...string[]]),
  industry: z.string().trim().min(1).max(80),
  industry_other: z.string().trim().max(80).optional(),
  experience: z.enum(EXPERIENCE.map((e) => e.id) as [string, ...string[]]),
  goal: z.string().trim().min(1).max(200),
  language: z.enum(["id", "en"]).default("id"),
  consent: z.literal("on").optional(),
});

export async function completeOnboarding(_prev: { error?: string } | undefined, formData: FormData) {
  const { supabase, user, profile } = await getSession();
  if (!user || !profile) redirect("/login");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Lengkapi semua pilihan dulu ya." };
  if (!profile.consent_at && !parsed.data.consent) return { error: "Setujui Syarat & Kebijakan Privasi untuk melanjutkan." };
  const d = parsed.data;
  const industry = d.industry === "Lainnya" && d.industry_other ? d.industry_other : d.industry;
  if (!INDUSTRIES.includes(d.industry)) return { error: "Industri tidak valid." };
  const { error } = await supabase
    .from("profiles")
    .update({
      persona_role: d.persona_role,
      industry,
      experience: d.experience,
      goal: d.goal,
      language: d.language,
      onboarded: true,
      consent_at: profile.consent_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) return { error: "Gagal menyimpan. Coba lagi." };
  redirect("/chat");
}
