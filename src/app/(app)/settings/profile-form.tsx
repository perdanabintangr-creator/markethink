"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { EXPERIENCE, GOALS, INDUSTRIES, ROLES } from "@/lib/personas";
import { updateProfile } from "./actions";

export function ProfileForm({
  profile,
}: {
  profile: { full_name: string; email: string; language: string; persona_role: string; industry: string; experience: string; goal: string };
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateProfile, undefined);
  useEffect(() => {
    if (state?.ok) {
      toast.success("Profil tersimpan");
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  const industries = INDUSTRIES.includes(profile.industry) || !profile.industry ? INDUSTRIES : [profile.industry, ...INDUSTRIES];
  const goals = GOALS.includes(profile.goal) || !profile.goal ? GOALS : [profile.goal, ...GOALS];

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Nama</Label>
        <Input id="full_name" name="full_name" defaultValue={profile.full_name} maxLength={80} />
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input value={profile.email} disabled />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="persona_role">Peran</Label>
        <NativeSelect id="persona_role" name="persona_role" defaultValue={profile.persona_role}>
          {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="industry">Industri</Label>
        <NativeSelect id="industry" name="industry" defaultValue={profile.industry}>
          {industries.map((i) => <option key={i} value={i}>{i}</option>)}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="experience">Pengalaman</Label>
        <NativeSelect id="experience" name="experience" defaultValue={profile.experience}>
          {EXPERIENCE.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="goal">Tujuan utama</Label>
        <NativeSelect id="goal" name="goal" defaultValue={profile.goal}>
          {goals.map((g) => <option key={g} value={g}>{g}</option>)}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="language">Bahasa</Label>
        <NativeSelect id="language" name="language" defaultValue={profile.language}>
          <option value="id">Bahasa Indonesia</option>
          <option value="en">English</option>
        </NativeSelect>
      </div>
      <div className="flex items-end">
        <Button disabled={pending} className="w-full">{pending && <Loader2 className="animate-spin" />} Simpan profil</Button>
      </div>
    </form>
  );
}
