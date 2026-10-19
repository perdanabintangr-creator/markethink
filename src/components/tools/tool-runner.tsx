"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Lock, Paperclip, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { UPLOAD_ERRORS, uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { emitChatsChanged } from "@/lib/events";
import { BIZ_MODELS, KOL_TIERS, PLATFORM_LABEL, PLATFORMS, SURVEY_LENGTH, SURVEY_TOPICS, WA_GOALS } from "@/lib/addons/schemas";
import { sampleSize } from "@/lib/addons/sample";
import { PRO_FORMS } from "@/lib/addons/pro/forms";
import type { Field as ProField } from "@/lib/addons/pro/fields";
import { toolInfo } from "@/lib/addons/catalog";
import { localizeForm } from "@/lib/addons/i18n";
import { useApp } from "@/components/app/app-context";
import { toolsText, type ToolsText } from "@/lib/i18n/tools";
import { WorkingShowcase } from "./working-showcase";
import { BrainPicker, useToolTier } from "./brain-picker";
import Link from "next/link";
import { TOOL_CREDIT_ESTIMATE, quotaShare, type ToolAccessLite } from "@/lib/addons/format";

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Chips({ name, options, defaults }: { name: string; options: { value: string; label: string }[]; defaults: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input type="checkbox" name={name} value={o.value} defaultChecked={defaults.includes(o.value)} className="peer sr-only" />
          <span className="inline-flex rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

/** Kumpulkan isi form menjadi objek input tool. */
function collect(tool: string, form: HTMLFormElement, attachmentIds: string[]) {
  const fd = new FormData(form);
  const str = (k: string) => String(fd.get(k) ?? "").trim();
  const all = (k: string) => fd.getAll(k).map(String);
  const pro = PRO_FORMS[tool];
  if (pro) {
    const out: Record<string, unknown> = {};
    for (const f of pro.fields) {
      if (f.type === "chips") out[f.name] = all(f.name);
      else if (f.type === "number") out[f.name] = Number(str(f.name) || f.default);
      else if (f.type === "files") out[f.name] = attachmentIds;
      else out[f.name] = str(f.name);
    }
    return out;
  }
  switch (tool) {
    case "listing":
      return {
        product: str("product"),
        category: str("category"),
        price: str("price"),
        features: str("features"),
        audience: str("audience"),
        current_title: str("current_title"),
        platforms: all("platforms"),
      };
    case "live":
      return { products: str("products"), promo: str("promo"), duration: Number(str("duration")), host_style: str("host_style"), platform: str("platform") };
    case "whatsapp":
      return { business: str("business"), products: str("products"), goals: all("goals"), tone: str("tone"), promo: str("promo") };
    case "ads":
      return { platform: str("platform"), goal: str("goal"), target: str("target"), notes: str("notes"), attachment_ids: attachmentIds };
    case "competitor":
      return { brand: str("brand"), product: str("product"), market: str("market"), competitors: str("competitors"), focus: str("focus") };
    case "sizing":
      return { product: str("product"), business: str("business"), area: str("area"), target: str("target"), price: str("price"), model: str("model"), known: str("known"), goal: str("goal") };
    case "persona":
      return { product: str("product"), brand: str("brand"), area: str("area"), price: str("price"), model: str("model"), known: str("known"), goal: str("goal") };
    case "entry":
      return { idea: str("idea"), brand: str("brand"), area: str("area"), model: str("model"), price: str("price"), budget: str("budget"), assets: str("assets") };
    case "survey":
      return {
        objective: str("objective"),
        product: str("product"),
        respondents: str("respondents"),
        topics: all("topics"),
        method: str("method"),
        length: str("length"),
        margin: Number(str("margin") || 5),
        population: Number(str("population").replace(/\D/g, "") || 0),
      };
    case "kol":
      return {
        brand: str("brand"),
        product: str("product"),
        objective: str("objective"),
        platform: str("platform"),
        tiers: all("tiers"),
        creators: Number(str("creators") || 1),
        budget: str("budget"),
        timeline: str("timeline"),
        key_message: str("key_message"),
        rules: str("rules"),
      };
  }
  return {};
}

/** Form survei + pratinjau jumlah responden (dihitung langsung saat isian berubah). */
function SurveyFields({ T }: { T: ToolsText }) {
  const L = T.lf;
  const [margin, setMargin] = useState(5);
  const [population, setPopulation] = useState("");
  const sample = sampleSize(margin, Number(population.replace(/\D/g, "") || 0));
  return (
    <>
      <Field label={L.surveyObjective} hint={L.surveyObjectiveHint}>
        <Textarea name="objective" required maxLength={800} rows={3} placeholder={L.surveyObjectivePh} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={L.surveyRespondents}>
          <Input name="respondents" required maxLength={300} placeholder={L.surveyRespondentsPh} />
        </Field>
        <Field label={L.surveyProduct}>
          <Input name="product" maxLength={200} placeholder={L.surveyProductPh} />
        </Field>
      </div>
      <Field label={L.surveyTopics}>
        <Chips name="topics" options={SURVEY_TOPICS.map((t) => ({ value: t, label: L.surveyTopicLabel[t] }))} defaults={["kebiasaan", "harga"]} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={L.surveyMethod}>
          <NativeSelect name="method" defaultValue="online">
            <option value="online">{L.surveyMethodOpt.online}</option>
            <option value="tatap_muka">{L.surveyMethodOpt.tatap_muka}</option>
            <option value="telepon">{L.surveyMethodOpt.telepon}</option>
          </NativeSelect>
        </Field>
        <Field label={L.surveyLength}>
          <NativeSelect name="length" defaultValue="sedang">
            {Object.keys(SURVEY_LENGTH).map((k) => (
              <option key={k} value={k}>
                {L.surveyLengthLabel[k]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={L.surveyMargin}>
          <NativeSelect name="margin" value={margin} onChange={(e) => setMargin(Number(e.target.value))}>
            <option value={3}>{L.surveyMarginOpt[3]}</option>
            <option value={5}>{L.surveyMarginOpt[5]}</option>
            <option value={10}>{L.surveyMarginOpt[10]}</option>
          </NativeSelect>
        </Field>
        <Field label={L.surveyPopulation} hint={L.surveyPopulationHint}>
          <Input name="population" inputMode="numeric" value={population} onChange={(e) => setPopulation(e.target.value)} placeholder={L.surveyPopulationPh} />
        </Field>
      </div>
      <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        {L.sampleA}
        <b>{L.sampleN(sample.n.toLocaleString(T.numberLocale))}</b>
        {L.sampleB}{" "}
        <b>{sample.recommended.toLocaleString(T.numberLocale)}</b>
        {L.sampleC}
      </div>
    </>
  );
}

/** Satu isian form Tools Pro per role (dari definisi field). */
function ProFieldInput({ field: f, uploader }: { field: ProField; uploader: React.ReactNode }) {
  const label = `${f.label}`;
  const span = f.half ? "" : "sm:col-span-2";
  switch (f.type) {
    case "text":
      return (
        <Field label={label} hint={f.hint} className={span}>
          <Input name={f.name} required={f.required} maxLength={f.max} placeholder={f.placeholder} />
        </Field>
      );
    case "textarea":
      return (
        <Field label={label} hint={f.hint} className={span}>
          <Textarea name={f.name} required={f.required} minLength={f.required ? (f.min ?? 3) : undefined} maxLength={f.max} rows={f.rows ?? 3} placeholder={f.placeholder} />
        </Field>
      );
    case "select":
      return (
        <Field label={label} hint={f.hint} className={span}>
          <NativeSelect name={f.name} defaultValue={f.default}>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      );
    case "chips":
      return (
        <Field label={label} hint={f.hint} className={span}>
          <Chips name={f.name} options={f.options} defaults={f.defaults} />
        </Field>
      );
    case "number":
      return (
        <Field label={label} hint={f.hint} className={span}>
          <Input name={f.name} type="number" min={f.min} max={f.max} defaultValue={f.default} />
        </Field>
      );
    case "files":
      return (
        <Field label={label} hint={f.hint} className={span}>
          {uploader}
        </Field>
      );
  }
}

interface UploadedFile {
  id: string;
  name: string;
}

export function ToolRunner({ tool, access }: { tool: string; access: ToolAccessLite }) {
  const router = useRouter();
  const { lang } = useApp();
  const T = toolsText(lang);
  const L = T.lf;
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const pro = PRO_FORMS[tool];
  // Teks tampilan saja; pengiriman form tetap memakai PRO_FORMS asli (nama field & value opsi tidak berubah).
  const proView = pro ? localizeForm(tool, pro, lang) : undefined;
  const steps = proView?.steps ?? T.legacySteps[tool] ?? [T.processing];
  const typical = toolInfo(tool)?.seconds ?? 60;
  const brain = useToolTier();
  const estimate = TOOL_CREDIT_ESTIMATE[brain.tier];
  const viaAddon = access.via === "addon";
  const canRun = access.allowed && (access.isAdmin || (viaAddon ? (access.addon?.remaining ?? 0) > 0 : access.remaining >= estimate));

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    for (const file of Array.from(list).slice(0, 5 - files.length)) {
      setUploading((n) => n + 1);
      try {
        const data = await uploadFile<{ id: string; name: string }>(file, { scope: "chat" });
        if ("error" in data) toast.error(`${file.name}: ${("message" in data && data.message) || T.uploadErrors[data.error] || UPLOAD_ERRORS[data.error] || T.uploadFailed}`);
        else setFiles((f) => [...f, { id: data.id, name: data.name }]);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canRun) return router.push("/pricing");
    if (tool === "ads" && !files.length) return toast.error(T.uploadAdsFirst);
    if (pro?.fields.some((f) => f.type === "files" && f.required) && !files.length) return toast.error(T.uploadFirst);
    const input = collect(tool, e.currentTarget, files.map((f) => f.id));
    setBusy(true);
    try {
      const res = await fetch(`/api/tools/${tool}`, { method: "POST", body: JSON.stringify({ ...input, __tier: brain.tier }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402) {
        toast.error(data.message ?? T.quotaNotEnough, { action: { label: T.seePlans, onClick: () => router.push("/pricing") } });
        return;
      }
      if (!res.ok) {
        toast.error(data.message ?? (res.status === 429 ? T.tooFast : T.processFailed));
        return;
      }
      emitChatsChanged();
      router.push(`/tools/${tool}/${data.runId}`);
      router.refresh();
    } catch {
      toast.error(T.connectionLostHistory);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
        {pro && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(proView ?? pro).fields.map((f) => (
              <ProFieldInput
                key={f.name}
                field={f}
                uploader={
                  f.type === "files" ? (
                    <div
                      className="rounded-xl border border-dashed p-4 text-center"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        void upload(e.dataTransfer.files);
                      }}
                    >
                      <input ref={fileRef} type="file" hidden multiple accept={f.accept ?? ".csv,.xlsx,.pdf,.png,.jpg,.jpeg,.webp"} onChange={(e) => upload(e.target.files)} />
                      <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={files.length >= (f.max ?? 5)}>
                        <Paperclip /> {T.chooseFile}
                      </Button>
                      <p className="mt-2 text-xs text-muted-foreground">{T.dropHint}</p>
                      {(files.length > 0 || uploading > 0) && (
                        <div className="mt-3 flex flex-wrap justify-center gap-2">
                          {files.map((x) => (
                            <span key={x.id} className="inline-flex items-center gap-1.5 rounded-lg border bg-background py-1 pl-2 pr-1 text-xs">
                              <FileText className="size-3.5" /> <span className="max-w-40 truncate">{x.name}</span>
                              <button type="button" aria-label={T.remove} onClick={() => setFiles((list) => list.filter((y) => y.id !== x.id))}>
                                <X className="size-3.5" />
                              </button>
                            </span>
                          ))}
                          {uploading > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Loader2 className="size-3.5 animate-spin" /> {T.uploading}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null
                }
              />
            ))}
          </div>
        )}

        {tool === "listing" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={L.productName}>
                <Input name="product" required maxLength={120} placeholder={L.productNamePh} />
              </Field>
              <Field label={L.category}>
                <Input name="category" maxLength={80} placeholder={L.categoryPh} />
              </Field>
              <Field label={L.price}>
                <Input name="price" maxLength={40} placeholder={L.pricePh} />
              </Field>
              <Field label={L.audience}>
                <Input name="audience" maxLength={200} placeholder={L.audiencePh} />
              </Field>
            </div>
            <Field label={L.features} hint={L.featuresHint}>
              <Textarea name="features" required minLength={10} maxLength={2000} rows={5} placeholder={L.featuresPh} />
            </Field>
            <Field label={L.currentTitle} hint={L.currentTitleHint}>
              <Input name="current_title" maxLength={255} />
            </Field>
            <Field label={L.platformReq}>
              <Chips name="platforms" options={PLATFORMS.map((p) => ({ value: p, label: PLATFORM_LABEL[p] }))} defaults={["shopee", "tiktok"]} />
            </Field>
          </>
        )}

        {tool === "live" && (
          <>
            <Field label={L.liveProducts} hint={L.liveProductsHint}>
              <Textarea name="products" required minLength={5} maxLength={2000} rows={5} placeholder={L.liveProductsPh} />
            </Field>
            <Field label={L.livePromo}>
              <Input name="promo" maxLength={500} placeholder={L.livePromoPh} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={L.duration}>
                <NativeSelect name="duration" defaultValue="60">
                  {[30, 60, 90, 120].map((d) => (
                    <option key={d} value={d}>
                      {L.minutes(d)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={L.hostStyle}>
                <NativeSelect name="host_style" defaultValue="energik">
                  <option value="energik">{L.hostStyleOpt.energik}</option>
                  <option value="santai">{L.hostStyleOpt.santai}</option>
                  <option value="edukatif">{L.hostStyleOpt.edukatif}</option>
                  <option value="lucu">{L.hostStyleOpt.lucu}</option>
                </NativeSelect>
              </Field>
              <Field label={L.platform}>
                <NativeSelect name="platform" defaultValue="tiktok">
                  <option value="tiktok">TikTok Live</option>
                  <option value="shopee">Shopee Live</option>
                  <option value="instagram">Instagram Live</option>
                </NativeSelect>
              </Field>
            </div>
          </>
        )}

        {tool === "whatsapp" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={L.businessName}>
                <Input name="business" required maxLength={200} placeholder={L.businessNamePh} />
              </Field>
              <Field label={L.tone}>
                <NativeSelect name="tone" defaultValue="ramah">
                  <option value="ramah">{L.toneOpt.ramah}</option>
                  <option value="profesional">{L.toneOpt.profesional}</option>
                  <option value="santai">{L.toneOpt.santai}</option>
                  <option value="lucu">{L.toneOpt.lucu}</option>
                </NativeSelect>
              </Field>
            </div>
            <Field label={L.waProducts}>
              <Textarea name="products" maxLength={1000} rows={3} placeholder={L.waProductsPh} />
            </Field>
            <Field label={L.waPromo}>
              <Input name="promo" maxLength={500} placeholder={L.waPromoPh} />
            </Field>
            <Field label={L.waGoals}>
              <Chips name="goals" options={WA_GOALS.map((g) => ({ value: g, label: L.waGoalLabel[g] }))} defaults={["broadcast_promo", "follow_up", "abandoned_cart", "faq"]} />
            </Field>
          </>
        )}

        {tool === "ads" && (
          <>
            <Field label={L.adsFile} hint={L.adsFileHint}>
              <div
                className="rounded-xl border border-dashed p-4 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void upload(e.dataTransfer.files);
                }}
              >
                <input ref={fileRef} type="file" hidden multiple accept=".csv,.xlsx,.pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => upload(e.target.files)} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={files.length >= 5}>
                  <Paperclip /> {T.chooseFile}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">{T.dropHint}</p>
                {(files.length > 0 || uploading > 0) && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {files.map((f) => (
                      <span key={f.id} className="inline-flex items-center gap-1.5 rounded-lg border bg-background py-1 pl-2 pr-1 text-xs">
                        <FileText className="size-3.5" /> <span className="max-w-40 truncate">{f.name}</span>
                        <button type="button" aria-label={T.remove} onClick={() => setFiles((x) => x.filter((y) => y.id !== f.id))}>
                          <X className="size-3.5" />
                        </button>
                      </span>
                    ))}
                    {uploading > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" /> {T.uploading}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={L.adsPlatform}>
                <NativeSelect name="platform" defaultValue="meta">
                  <option value="meta">Meta (FB/IG)</option>
                  <option value="tiktok">TikTok Ads</option>
                  <option value="shopee">Shopee Ads</option>
                  <option value="google">Google Ads</option>
                  <option value="lainnya">{L.adsPlatformOther}</option>
                </NativeSelect>
              </Field>
              <Field label={L.adsGoal}>
                <NativeSelect name="goal" defaultValue="penjualan">
                  <option value="penjualan">{L.adsGoalOpt.penjualan}</option>
                  <option value="leads">{L.adsGoalOpt.leads}</option>
                  <option value="traffic">{L.adsGoalOpt.traffic}</option>
                  <option value="awareness">{L.adsGoalOpt.awareness}</option>
                </NativeSelect>
              </Field>
              <Field label={L.adsTarget}>
                <Input name="target" maxLength={120} placeholder={L.adsTargetPh} />
              </Field>
            </div>
            <Field label={L.notes}>
              <Textarea name="notes" maxLength={1000} rows={2} placeholder={L.adsNotesPh} />
            </Field>
          </>
        )}

        {tool === "competitor" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={L.yourBrand}>
                <Input name="brand" required maxLength={100} placeholder={L.yourBrandPh} />
              </Field>
              <Field label={L.market}>
                <Input name="market" maxLength={120} placeholder={L.marketPh} />
              </Field>
            </div>
            <Field label={L.productCategory}>
              <Input name="product" required maxLength={300} placeholder={L.productCategoryPh} />
            </Field>
            <Field label={L.competitors} hint={L.competitorsHint}>
              <Textarea name="competitors" required maxLength={600} rows={3} placeholder={L.competitorsPh} />
            </Field>
            <Field label={L.focus}>
              <Input name="focus" maxLength={300} placeholder={L.focusPh} />
            </Field>
          </>
        )}

        {(tool === "sizing" || tool === "persona") && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={L.productCategory}>
                <Input name="product" required maxLength={200} placeholder={L.productCategoryPh} />
              </Field>
              <Field label={L.area} hint={L.areaHint}>
                <Input name="area" maxLength={120} placeholder={L.areaPh} />
              </Field>
              {tool === "sizing" ? (
                <Field label={L.yourBusiness}>
                  <Input name="business" maxLength={300} placeholder={L.yourBusinessPh} />
                </Field>
              ) : (
                <Field label={L.brandOpt}>
                  <Input name="brand" maxLength={100} placeholder={L.brandOptPh} />
                </Field>
              )}
              <Field label={L.avgPrice}>
                <Input name="price" maxLength={80} placeholder={L.avgPricePh} />
              </Field>
              <Field label={L.bizModel}>
                <NativeSelect name="model" defaultValue="b2c">
                  {BIZ_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {L.bizModelLabel[m]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {tool === "sizing" && (
                <Field label={L.targetBuyerOpt}>
                  <Input name="target" maxLength={300} placeholder={L.targetBuyerOptPh} />
                </Field>
              )}
            </div>
            <Field label={tool === "sizing" ? L.knownSizing : L.known} hint={tool === "sizing" ? L.knownSizingHint : L.knownHint}>
              <Textarea name="known" maxLength={800} rows={3} placeholder={tool === "sizing" ? L.knownSizingPh : L.knownPh} />
            </Field>
            <Field label={L.goal}>
              <Input name="goal" maxLength={300} placeholder={tool === "sizing" ? L.goalPhSizing : L.goalPhPersona} />
            </Field>
          </>
        )}

        {tool === "entry" && (
          <>
            <Field label={L.idea} hint={L.ideaHint}>
              <Textarea name="idea" required maxLength={1200} rows={4} placeholder={L.ideaPh} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={L.brandOpt}>
                <Input name="brand" maxLength={100} />
              </Field>
              <Field label={L.area} hint={L.areaHint}>
                <Input name="area" maxLength={120} placeholder={L.entryAreaPh} />
              </Field>
              <Field label={L.bizModel}>
                <NativeSelect name="model" defaultValue="b2c">
                  {BIZ_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {L.bizModelLabel[m]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={L.plannedPrice}>
                <Input name="price" maxLength={80} placeholder={L.plannedPricePh} />
              </Field>
              <Field label={L.capital}>
                <Input name="budget" maxLength={80} placeholder={L.capitalPh} />
              </Field>
            </div>
            <Field label={L.assets}>
              <Textarea name="assets" maxLength={600} rows={2} placeholder={L.assetsPh} />
            </Field>
          </>
        )}

        {tool === "survey" && <SurveyFields T={T} />}

        {tool === "kol" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={L.brandReq}>
                <Input name="brand" required maxLength={100} />
              </Field>
              <Field label={L.productReq}>
                <Input name="product" required maxLength={300} />
              </Field>
              <Field label={L.campaignGoal}>
                <NativeSelect name="objective" defaultValue="penjualan">
                  <option value="awareness">{L.kolObjectiveOpt.awareness}</option>
                  <option value="penjualan">{L.kolObjectiveOpt.penjualan}</option>
                  <option value="launching">{L.kolObjectiveOpt.launching}</option>
                  <option value="review">{L.kolObjectiveOpt.review}</option>
                </NativeSelect>
              </Field>
              <Field label={L.platform}>
                <NativeSelect name="platform" defaultValue="tiktok">
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="campuran">{L.kolPlatformMixed}</option>
                </NativeSelect>
              </Field>
              <Field label={L.creators}>
                <Input name="creators" type="number" min={1} max={50} defaultValue={5} />
              </Field>
              <Field label={L.budgetOpt}>
                <Input name="budget" maxLength={60} placeholder={L.budgetOptPh} />
              </Field>
            </div>
            <Field label={L.creatorTiers}>
              <Chips name="tiers" options={KOL_TIERS.map((t) => ({ value: t, label: L.kolTierLabel[t] }))} defaults={["nano", "micro"]} />
            </Field>
            <Field label={L.timeline}>
              <Input name="timeline" maxLength={120} placeholder={L.timelinePh} />
            </Field>
            <Field label={L.keyMessage}>
              <Textarea name="key_message" maxLength={500} rows={2} />
            </Field>
            <Field label={L.rules}>
              <Textarea name="rules" maxLength={800} rows={2} placeholder={L.rulesPh} />
            </Field>
          </>
        )}

        {!viaAddon && <BrainPicker value={brain.tier} onChange={brain.setTier} allowed={brain.allowed} disabled={busy} />}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {access.isAdmin
              ? T.adminMode
              : viaAddon
                ? canRun
                  ? T.addonUsesOne
                  : T.addonUsedUp
                : canRun
                  ? T.usesQuota(quotaShare(estimate, access.monthLimit))
                  : T.notEnoughQuota}{" "}
            {T.refundNote}
          </p>
          {canRun ? (
            <Button type="submit" disabled={busy || uploading > 0}>
              <Sparkles /> {T.createNow}
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/pricing">
                <Lock /> {T.lowQuotaSeePlans}
              </Link>
            </Button>
          )}
        </div>
      </form>

      {busy && (
        <div className="absolute inset-0 z-10 flex items-start justify-center rounded-2xl bg-background/90 p-6 pt-16 backdrop-blur-sm">
          <div className="sticky top-24 flex w-full justify-center">
            <WorkingShowcase tool={tool} steps={steps} typical={typical} note={T.dontCloseRunner} />
          </div>
        </div>
      )}
    </div>
  );
}
