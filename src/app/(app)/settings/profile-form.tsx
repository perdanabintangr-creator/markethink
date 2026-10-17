"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { useApp } from "@/components/app/app-context";
import { EXPERIENCE, GOAL_LABELS_EN, GOALS, INDUSTRIES, INDUSTRY_LABELS_EN, ROLES } from "@/lib/personas";
import { settingsText } from "@/lib/i18n/settings";
import { updateProfile } from "./actions";

export function ProfileForm({
  profile,
}: {
  profile: { full_name: string; email: string; persona_role: string; industry: string; experience: string; goal: string };
}) {
  const router = useRouter();
  const { lang } = useApp();
  const t = settingsText(lang);
  const en = lang === "en";
  const [state, action, pending] = useActionState(updateProfile, undefined);
  useEffect(() => {
    if (state?.ok) {
      toast.success(t.profileSaved);
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router, t]);

  const industries = INDUSTRIES.includes(profile.industry) || !profile.industry ? INDUSTRIES : [profile.industry, ...INDUSTRIES];
  const goals = GOALS.includes(profile.goal) || !profile.goal ? GOALS : [profile.goal, ...GOALS];

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">{t.name}</Label>
        <Input id="full_name" name="full_name" defaultValue={profile.full_name} maxLength={80} />
      </div>
      <div className="space-y-1.5">
        <Label>{t.email}</Label>
        <Input value={profile.email} disabled />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="persona_role">{t.role}</Label>
        <NativeSelect id="persona_role" name="persona_role" defaultValue={profile.persona_role}>
          {ROLES.map((r) => <option key={r.id} value={r.id}>{en ? r.labelEn : r.label}</option>)}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="industry">{t.industry}</Label>
        <NativeSelect id="industry" name="industry" defaultValue={profile.industry}>
          {industries.map((i) => <option key={i} value={i}>{(en && INDUSTRY_LABELS_EN[i]) || i}</option>)}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="experience">{t.experience}</Label>
        <NativeSelect id="experience" name="experience" defaultValue={profile.experience}>
          {EXPERIENCE.map((e) => <option key={e.id} value={e.id}>{en ? e.labelEn : e.label}</option>)}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="goal">{t.goal}</Label>
        <NativeSelect id="goal" name="goal" defaultValue={profile.goal}>
          {goals.map((g) => <option key={g} value={g}>{(en && GOAL_LABELS_EN[g]) || g}</option>)}
        </NativeSelect>
      </div>
      <div className="flex items-end sm:col-span-2 sm:justify-end">
        <Button disabled={pending} className="w-full sm:w-auto">{pending && <Loader2 className="animate-spin" />} {t.saveProfile}</Button>
      </div>
    </form>
  );
}
