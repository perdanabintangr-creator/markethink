"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXPERIENCE, GOALS, INDUSTRIES, ROLES } from "@/lib/personas";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "./actions";

function Choice({
  name,
  value,
  checked,
  onChange,
  title,
  desc,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (v: string) => void;
  title: string;
  desc?: string;
}) {
  return (
    <label
      className={cn(
        "cursor-pointer rounded-xl border bg-card p-3 text-sm transition-colors hover:bg-accent",
        checked && "border-primary ring-1 ring-primary",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="sr-only" />
      <span className="block font-medium">{title}</span>
      {desc && <span className="block text-xs text-muted-foreground">{desc}</span>}
    </label>
  );
}

export function OnboardingForm({ needsConsent }: { needsConsent: boolean }) {
  const [state, action, pending] = useActionState(completeOnboarding, undefined);
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [experience, setExperience] = useState("");
  const [goal, setGoal] = useState("");
  const [language, setLanguage] = useState("id");

  return (
    <form action={action} className="mt-8 space-y-8">
      <section className="space-y-3">
        <h2 className="font-semibold">1. Kamu siapa?</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLES.map((r) => (
            <Choice key={r.id} name="persona_role" value={r.id} checked={role === r.id} onChange={setRole} title={r.label} desc={r.desc} />
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">2. Industri</h2>
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((i) => (
            <label
              key={i}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-sm hover:bg-accent",
                industry === i && "border-primary bg-primary/10 text-primary",
              )}
            >
              <input type="radio" name="industry" value={i} checked={industry === i} onChange={() => setIndustry(i)} className="sr-only" />
              {i}
            </label>
          ))}
        </div>
        {industry === "Lainnya" && <Input name="industry_other" placeholder="Tulis industrimu" maxLength={80} />}
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">3. Level pengalaman marketing</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {EXPERIENCE.map((e) => (
            <Choice key={e.id} name="experience" value={e.id} checked={experience === e.id} onChange={setExperience} title={e.label} desc={e.desc} />
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">4. Tujuan utama</h2>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <label
              key={g}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-sm hover:bg-accent",
                goal === g && "border-primary bg-primary/10 text-primary",
              )}
            >
              <input type="radio" name="goal" value={g} checked={goal === g} onChange={() => setGoal(g)} className="sr-only" />
              {g}
            </label>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">5. Bahasa jawaban</h2>
        <div className="flex gap-2">
          {[
            { id: "id", label: "Bahasa Indonesia" },
            { id: "en", label: "English" },
          ].map((l) => (
            <Choice key={l.id} name="language" value={l.id} checked={language === l.id} onChange={setLanguage} title={l.label} />
          ))}
        </div>
      </section>
      {needsConsent && (
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="consent" className="mt-1" required />
          <span>
            Saya setuju dengan <Link href="/terms" target="_blank" className="underline">Syarat Layanan</Link> &{" "}
            <Link href="/privacy" target="_blank" className="underline">Kebijakan Privasi</Link>, termasuk pemrosesan oleh
            penyedia AI pihak ketiga (UU PDP), dan tidak akan memasukkan data rahasia.
          </span>
        </label>
      )}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button size="lg" className="w-full sm:w-auto" disabled={pending || !role || !industry || !experience || !goal}>
        {pending && <Loader2 className="animate-spin" />} Mulai pakai Markethink
      </Button>
    </form>
  );
}
