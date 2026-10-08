import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EXTRA_CREDIT_COST, getTiers } from "@/lib/ai/models.config";
import { setAccessMode, setImageGen, setWebSearch, updatePlanCredits } from "../actions";

export default async function AdminQuotaPage() {
  const admin = createAdminClient();
  const [{ data: plans }, { data: mode }, { data: ws }, { data: img }] = await Promise.all([
    admin.from("plans").select("*").order("sort_order"),
    admin.from("app_settings").select("value").eq("key", "access_mode").maybeSingle(),
    admin.from("app_settings").select("value").eq("key", "web_search").maybeSingle(),
    admin.from("app_settings").select("value").eq("key", "image_gen").maybeSingle(),
  ]);
  const webSearchOn = ws?.value === true;
  const imageGenOn = img?.value === true;
  const isPublic = mode?.value === "public";
  const tiers = getTiers();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Akses aplikasi: {isPublic ? "Publik (semua user terdaftar)" : "Tertutup (undangan saja)"}</CardTitle>
          <CardDescription>
            Mode tertutup: hanya admin & user yang diberi akses di halaman &quot;User &amp; kuota&quot; yang bisa memakai
            Markethink. User lain melihat halaman &quot;uji coba tertutup&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={setAccessMode.bind(null, isPublic ? "invite_only" : "public")}>
            <Button variant={isPublic ? "outline" : "default"}>
              {isPublic ? "Tutup kembali (undangan saja)" : "Buka untuk publik"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pencarian web otomatis (Claude): {webSearchOn ? "Aktif" : "Mati"}</CardTitle>
          <CardDescription>
            Otak bisa mencari di internet sendiri (mis. saat ditanya tentang brand tertentu) dan menampilkan sumbernya.
            Biaya ± $0,01 per pencarian (dipotong dari saldo Anthropic). Maks per pesan: Junior 1, Senior 3, Associate 4,
            Director 6.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={setWebSearch.bind(null, !webSearchOn)}>
            <Button variant={webSearchOn ? "outline" : "default"}>{webSearchOn ? "Matikan" : "Aktifkan"}</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pembuat gambar AI (Gemini): {imageGenOn ? "Aktif" : "Mati"}</CardTitle>
          <CardDescription>
            Otak bisa membuat & mengedit gambar langsung di chat (paket Pro & Promax, 5 kredit per gambar). Biaya ± $0,04
            (± Rp650) per gambar, dipotong dari akun Google AI Studio (perlu billing aktif di API key Google).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={setImageGen.bind(null, !imageGenOn)}>
            <Button variant={imageGenOn ? "outline" : "default"}>{imageGenOn ? "Matikan" : "Aktifkan"}</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {(plans ?? []).map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle>{p.name}</CardTitle>
              <CardDescription>{p.description} {p.is_public ? "" : "(belum publik)"}</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updatePlanCredits.bind(null, p.id)} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Kredit per hari</label>
                  <Input name="daily_credits" defaultValue={p.daily_credits} inputMode="numeric" />
                </div>
                <Button>Simpan</Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Biaya kredit & routing model</CardTitle>
          <CardDescription>
            Diatur di <code>src/lib/ai/models.config.ts</code>; model bisa diganti tanpa ubah kode lewat env
            MODEL_JUNIOR / MODEL_SENIOR / MODEL_ASSOCIATE.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-2">Tier</th><th>Kredit</th><th>Max token</th><th>Model (primary → fallback)</th></tr>
            </thead>
            <tbody className="divide-y">
              {tiers.map((t) => (
                <tr key={t.id}>
                  <td className="py-2">{t.label}</td>
                  <td>{t.creditCost}</td>
                  <td>{t.maxOutputTokens}</td>
                  <td className="font-mono text-xs">{t.candidates.map((c) => `${c.provider}:${c.modelId}`).join(" → ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            Tambahan: Riset Web +{EXTRA_CREDIT_COST.research} kredit, tiap file/gambar +{EXTRA_CREDIT_COST.attachment} kredit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
