"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { BrandKit } from "@/lib/ai/prompt";
import { MOOD_IDS } from "@/lib/deck/moods";
import { useApp } from "@/components/app/app-context";
import { settingsText } from "@/lib/i18n/settings";
import { UPLOAD_ERRORS, uploadFile } from "@/lib/upload-client";
import { saveBrandKit } from "../actions";

const FIELDS = [
  { key: "products", long: true },
  { key: "target_audience", long: true },
  { key: "brand_voice" },
  { key: "usp", long: true },
  { key: "competitors" },
  { key: "channels" },
  { key: "budget_range" },
  { key: "notes", long: true },
] as const satisfies readonly { key: keyof BrandKit; long?: boolean }[];

export function BrandKitForm({ workspaceId, name, kit }: { workspaceId: string; name: string; kit: BrandKit }) {
  const [state, action, pending] = useActionState(saveBrandKit.bind(null, workspaceId), undefined);
  const t = settingsText(useApp().lang);
  useEffect(() => {
    if (state?.ok) toast.success(t.brandKitSaved);
    if (state?.error) toast.error(state.error);
  }, [state, t]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">{t.brandName}</Label>
        <Input id="name" name="name" defaultValue={name} required maxLength={80} />
      </div>
      {FIELDS.map((f) => {
        const { label, placeholder } = t.brandFields[f.key];
        return (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={f.key}>{label}</Label>
            {"long" in f && f.long ? (
              <Textarea id={f.key} name={f.key} defaultValue={kit[f.key] ?? ""} placeholder={placeholder} rows={3} maxLength={2000} />
            ) : (
              <Input id={f.key} name={f.key} defaultValue={kit[f.key] ?? ""} placeholder={placeholder} maxLength={2000} />
            )}
          </div>
        );
      })}

      <fieldset className="space-y-4 rounded-xl border p-4">
        <legend className="px-1 text-sm font-semibold">{t.visualIdentity}</legend>
        <p className="-mt-2 text-xs text-muted-foreground">{t.visualIdentityDesc}</p>
        <LogoField initial={kit.logo_id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField name="color_primary" label={t.primaryColor} initial={kit.color_primary} />
          <ColorField name="color_secondary" label={t.secondaryColor} initial={kit.color_secondary} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="design_mood">{t.designStyle}</Label>
            <select
              id="design_mood"
              name="design_mood"
              defaultValue={kit.design_mood ?? ""}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">{t.designStyleAuto}</option>
              {MOOD_IDS.map((m) => (
                <option key={m} value={m}>
                  {t.moods[m]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="social_handle">{t.socialHandle}</Label>
            <Input id="social_handle" name="social_handle" defaultValue={kit.social_handle ?? ""} placeholder={t.socialHandlePlaceholder} maxLength={60} />
          </div>
        </div>
      </fieldset>

      <Button disabled={pending}>{pending && <Loader2 className="animate-spin" />} {t.saveBrandKit}</Button>
    </form>
  );
}

function ColorField({ name, label, initial }: { name: string; label: string; initial?: string }) {
  const [value, setValue] = useState(initial ?? "");
  const t = settingsText(useApp().lang);
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={t.pickColor(label)}
          value={valid ? value : "#2F7BFF"}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1"
        />
        <Input id={name} name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder="#2F7BFF" maxLength={7} />
      </div>
    </div>
  );
}

/** Upload logo (PNG transparan paling bagus) — disimpan sebagai lampiran, id-nya masuk Brand Kit. */
function LogoField({ initial }: { initial?: string }) {
  const [logoId, setLogoId] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const t = settingsText(useApp().lang);
  async function onPick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error(t.logoMustBeImage);
    setBusy(true);
    const res = await uploadFile<{ id: string }>(file, { scope: "chat" });
    setBusy(false);
    if ("error" in res) return toast.error(t.uploadErrors[res.error] ?? res.message ?? UPLOAD_ERRORS[res.error] ?? t.logoUploadFailed);
    setLogoId(res.id);
    toast.success(t.logoUploaded);
  }
  return (
    <div className="space-y-1.5">
      <Label>{t.logo}</Label>
      <input type="hidden" name="logo_id" value={logoId} />
      <div className="flex items-center gap-3">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:12px_12px]">
          {logoId ? (
            // eslint-disable-next-line @next/next/no-img-element -- file pribadi via /api/attachments
            <img src={`/api/attachments/${logoId}`} alt={t.logoAlt} className="max-h-full max-w-full object-contain" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" />
          )}
        </div>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} {logoId ? t.changeLogo : t.uploadLogo}
        </Button>
        {logoId && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setLogoId("")}>
            <X /> {t.remove}
          </Button>
        )}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      </div>
      <p className="text-xs text-muted-foreground">{t.logoHint}</p>
    </div>
  );
}
