import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBackoffice } from "@/lib/backoffice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/backoffice/stat";
import { PLAN_NAME } from "@/lib/admin-format";
import { setAppSetting, updatePlanCredits } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pengaturan aplikasi" };

/** Owner: saklar fitur & kuota aplikasi AI Markethink (dulu menu Admin di aplikasi). */
export default async function AppSettingsPage() {
  const { isOwner } = await requireBackoffice();
  if (!isOwner) redirect("/");
  const admin = createAdminClient();
  const [{ data: plans }, { data: settings }] = await Promise.all([
    admin.from("plans").select("id, name, description, daily_credits, sort_order").order("sort_order"),
    admin.from("app_settings").select("key, value").in("key", ["access_mode", "web_search", "image_gen"]),
  ]);
  const s = Object.fromEntries((settings ?? []).map((r) => [r.key, r.value]));
  const isPublic = s.access_mode === "public";
  const webSearchOn = s.web_search === true;
  const imageGenOn = s.image_gen === true;

  const toggles = [
    {
      title: `Akses aplikasi: ${isPublic ? "Terbuka untuk semua" : "Tertutup (undangan saja)"}`,
      desc: "Terbuka: siapa pun yang daftar langsung bisa memakai paket Free. Tertutup: hanya user yang diberi akses (di detail pelanggan).",
      action: setAppSetting.bind(null, "access_mode", isPublic ? "invite_only" : "public"),
      label: isPublic ? "Tutup (undangan saja)" : "Buka untuk semua",
      on: isPublic,
    },
    {
      title: `Pencarian web otomatis: ${webSearchOn ? "Aktif" : "Mati"}`,
      desc: "AI bisa mencari di internet dan menampilkan sumbernya. Biaya ± $0,01 per pencarian (saldo Anthropic).",
      action: setAppSetting.bind(null, "web_search", !webSearchOn),
      label: webSearchOn ? "Matikan" : "Aktifkan",
      on: webSearchOn,
    },
    {
      title: `Pembuat gambar AI: ${imageGenOn ? "Aktif" : "Mati"}`,
      desc: "AI bisa membuat gambar di chat & foto di PPT. Biaya ± $0,03–0,04 per gambar (saldo OpenRouter).",
      action: setAppSetting.bind(null, "image_gen", !imageGenOn),
      label: imageGenOn ? "Matikan" : "Aktifkan",
      on: imageGenOn,
    },
  ];

  return (
    <div className="space-y-6">
      <PageTitle title="Pengaturan aplikasi" description="Saklar fitur & kuota aplikasi AI Markethink. Perubahan langsung berlaku untuk user." />
      <div className="grid gap-4 lg:grid-cols-3">
        {toggles.map((t) => (
          <Card key={t.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </CardHeader>
            <CardContent>
              <form action={t.action}>
                <Button size="sm" variant={t.on ? "outline" : "default"}>{t.label}</Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Kredit harian per paket</CardTitle>
          <p className="text-xs text-muted-foreground">Jatah kredit yang diisi ulang setiap hari (WIB). Batas harian Free (20 chat, 2 gambar, 1 PPT) tetap berlaku.</p>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {(plans ?? []).map((p) => (
            <form key={p.id} action={updatePlanCredits.bind(null, p.id)} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="font-medium">{PLAN_NAME[p.id] ?? p.name}</p>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Input name="daily_credits" defaultValue={p.daily_credits} inputMode="numeric" className="w-28" aria-label={`Kredit harian ${p.name}`} />
                <span className="text-sm text-muted-foreground">kredit/hari</span>
                <Button size="sm">Simpan</Button>
              </div>
            </form>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
