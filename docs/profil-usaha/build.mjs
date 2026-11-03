// Membuat PDF Profil Usaha Marqthink (dokumen pendukung bisnis untuk Midtrans/Duitku).
// Jalankan: node docs/profil-usaha/build.mjs  → docs/profil-usaha/Profil-Usaha-Marqthink.pdf
// Ubah data kontak di CONTACT lalu jalankan ulang.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const CONTACT = {
  owner: "Perdana Bintang Rinaldi",
  email: "perdanabintangr@gmail.com",
  whatsapp: "", // contoh: "+62 812-3456-7890"
  address: "Jorong Simancung, Desa/Kelurahan Padang Sibusuk, Kec. Kupitan, Kab. Sijunjung, Provinsi Sumatera Barat", // sama dengan NIB
  nib: "0311260132635",
};
const blank = (v, hint) => (v ? v : `<span class="blank">${hint}</span>`);
const img = (p) => `data:image/png;base64,${readFileSync(join(root, p)).toString("base64")}`;
const logo = img("public/brand/marqthink-logo-on-light.png");
const q = img("public/brand/marqthink-q-512.png");
const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

const plans = [
  ["Free", "Rp0", "Coba Marqthink: chat AI marketing dengan kuota terbatas."],
  ["Starter", "Rp60.000/bulan", "Otak Junior & Senior, Riset Web ber-sumber, gambar AI, dan file presentasi (PPT)."],
  ["Pro", "Rp200.000/bulan", "Ditambah otak Head, semua Smart Tools, dan Marqthink Agent."],
  ["Promax", "Rp300.000/bulan", "Semua tingkat otak AI termasuk Director, semua Smart Tools & Agent, kuota terbesar."],
];

const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, "Segoe UI", Arial, sans-serif; color: #0b1220; font-size: 11.5pt; line-height: 1.55; }
.page { width: 210mm; height: 297mm; padding: 18mm 18mm 16mm; position: relative; page-break-after: always; overflow: hidden; }
.page:last-child { page-break-after: auto; }
.bar { position: absolute; top: 0; left: 0; right: 0; height: 6mm; background: linear-gradient(90deg,#0a6cff,#12d0f5); }
.foot { position: absolute; bottom: 9mm; left: 18mm; right: 18mm; font-size: 8.5pt; color: #8a93a6; display: flex; justify-content: space-between; border-top: 1px solid #e6e9f0; padding-top: 3mm; }
h1 { font-size: 30pt; line-height: 1.1; margin: 0; letter-spacing: -0.5px; }
h2 { font-size: 16pt; margin: 0 0 4mm; color: #0b1220; }
h2 .n { color: #0a6cff; margin-right: 6px; }
h3 { font-size: 12pt; margin: 5mm 0 1.5mm; }
p { margin: 0 0 3mm; }
.muted { color: #5b6475; }
.eyebrow { color: #0a6cff; font-weight: 700; letter-spacing: 2px; font-size: 9.5pt; text-transform: uppercase; }
.cover { background: radial-gradient(circle at 85% 20%, #e3efff 0, transparent 45%), radial-gradient(circle at 10% 90%, #e2fbff 0, transparent 40%); }
.cover .q { position: absolute; right: -20mm; top: 70mm; width: 120mm; opacity: .12; }
table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 10.5pt; }
th, td { text-align: left; padding: 2.1mm 3mm; border-bottom: 1px solid #e6e9f0; vertical-align: top; }
th { background: #f4f7ff; font-size: 9.5pt; text-transform: uppercase; letter-spacing: .5px; color: #3a4254; }
td.k { width: 42mm; color: #5b6475; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
.card { border: 1px solid #e6e9f0; border-radius: 3mm; padding: 4mm; }
.card b { display: block; margin-bottom: 1mm; }
ol, ul { margin: 0 0 3mm; padding-left: 6mm; } li { margin-bottom: 1.2mm; }
.blank { color: #c2410c; background: #fff7ed; border-bottom: 1px dashed #fb923c; padding: 0 2px; }
.pill { display: inline-block; background: #eef3ff; color: #0a6cff; border-radius: 99px; padding: 1mm 3mm; font-size: 9pt; font-weight: 600; margin: 0 1.5mm 1.5mm 0; }
</style></head><body>

<section class="page cover">
  <div class="bar"></div>
  <img src="${q}" class="q">
  <img src="${logo}" style="width:62mm;margin-top:14mm">
  <div style="margin-top:46mm">
    <div class="eyebrow">Profil Usaha</div>
    <h1 style="margin-top:4mm">Marqthink</h1>
    <p style="font-size:15pt;margin-top:3mm">Otak marketing berbasis AI untuk brand Indonesia.</p>
    <p class="muted" style="max-width:120mm">Layanan perangkat lunak berlangganan (SaaS) yang membantu UMKM, marketer, dan agency meriset pasar, menyusun strategi, dan membuat konten marketing siap pakai.</p>
  </div>
  <table style="margin-top:30mm;max-width:130mm">
    <tr><td class="k">Nama usaha</td><td><b>Marqthink</b></td></tr>
    <tr><td class="k">Pemilik</td><td>${CONTACT.owner} (usaha perseorangan)</td></tr>
    <tr><td class="k">Bidang usaha</td><td>Aplikasi perangkat lunak / SaaS (KBLI 62019)</td></tr>
    <tr><td class="k">Website</td><td>https://marqthink.com</td></tr>
    <tr><td class="k">NIB</td><td>${blank(CONTACT.nib, "dalam proses penerbitan")}</td></tr>
  </table>
  <div class="foot"><span>Marqthink · marqthink.com</span><span>Diperbarui ${today}</span></div>
</section>

<section class="page">
  <div class="bar"></div>
  <h2><span class="n">01</span>Tentang usaha</h2>
  <p>Marqthink adalah aplikasi web (diakses lewat browser di laptop maupun HP) yang berfungsi sebagai <b>asisten marketing berbasis kecerdasan buatan (AI)</b>. Pengguna cukup bertanya dengan bahasa sehari-hari, lalu Marqthink meriset, menyusun strategi, dan menghasilkan materi marketing yang siap dipakai.</p>
  <p>Marqthink ditujukan untuk pemilik UMKM, marketer, social media specialist, freelancer, agency, dan mahasiswa di Indonesia. Seluruh layanan dijual secara online dalam bentuk <b>langganan bulanan</b>; tidak ada barang fisik yang dikirim.</p>

  <h2 style="margin-top:7mm"><span class="n">02</span>Produk & layanan</h2>
  <div class="grid">
    <div class="card"><b>Chat AI marketing</b><span class="muted">Konsultasi strategi, caption, copy iklan, dan ide konten dengan konteks brand pengguna.</span></div>
    <div class="card"><b>Riset web ber-sumber</b><span class="muted">Riset tren, harga, dan kompetitor terbaru lengkap dengan link sumber.</span></div>
    <div class="card"><b>Smart Tools</b><span class="muted">Marketing plan, riset kompetitor, kalender konten, kalkulator iklan, audit Instagram, dan lainnya.</span></div>
    <div class="card"><b>Desain & dokumen</b><span class="muted">Carousel, poster, foto produk, serta file PPT/Excel siap presentasi; bisa dilanjutkan di Canva.</span></div>
  </div>

  <h2 style="margin-top:8mm"><span class="n">03</span>Paket & harga</h2>
  <table>
    <tr><th>Paket</th><th>Harga</th><th>Isi paket</th></tr>
    ${plans.map(([n, p, d]) => `<tr><td><b>${n}</b></td><td>${p}</td><td>${d}</td></tr>`).join("")}
  </table>
  <p class="muted">Harga dan detail paket tercantum publik di <b>marqthink.com/harga</b>. Langganan dibayar di muka per bulan dan tidak diperpanjang otomatis.</p>
  <div class="foot"><span>Profil Usaha Marqthink</span><span>Halaman 2</span></div>
</section>

<section class="page">
  <div class="bar"></div>
  <h2><span class="n">04</span>Alur transaksi</h2>
  <ol>
    <li>Pengguna mendaftar akun di marqthink.com (email atau akun Google) dan mencoba paket Free.</li>
    <li>Pengguna memilih paket di halaman Harga lalu menekan tombol bayar.</li>
    <li>Pengguna membayar melalui payment gateway resmi (QRIS, e-wallet, atau virtual account).</li>
    <li>Setelah pembayaran berhasil, sistem mengaktifkan paket secara otomatis dan mengirim konfirmasi.</li>
    <li>Paket aktif selama periode yang dibayar (1 bulan), tidak diperpanjang otomatis. Produk sepenuhnya digital, tanpa pengiriman barang.</li>
  </ol>

  <h2 style="margin-top:5mm"><span class="n">05</span>Kebijakan</h2>
  <table>
    <tr><td class="k">Refund</td><td>Refund penuh bila diminta ≤ 3×24 jam sejak pembayaran dan pemakaian kuota ≤ 10%. Dana dikembalikan 7–14 hari kerja. Detail: marqthink.com/refund</td></tr>
    <tr><td class="k">Syarat layanan</td><td>marqthink.com/terms</td></tr>
    <tr><td class="k">Privasi data</td><td>Mengikuti UU PDP. Detail: marqthink.com/privacy</td></tr>
    <tr><td class="k">Penggunaan terlarang</td><td>Konten menipu, spam, ujaran kebencian, dan pelanggaran hukum dilarang; akun pelanggar dapat ditangguhkan.</td></tr>
  </table>

  <h2 style="margin-top:5mm"><span class="n">06</span>Kontak</h2>
  <table>
    <tr><td class="k">Penanggung jawab</td><td>${CONTACT.owner}</td></tr>
    <tr><td class="k">Email</td><td>${blank(CONTACT.email, "isi email")}</td></tr>
    <tr><td class="k">WhatsApp</td><td>${blank(CONTACT.whatsapp, "isi nomor WhatsApp")}</td></tr>
    <tr><td class="k">Alamat usaha</td><td>${blank(CONTACT.address, "isi alamat sesuai NIB")}</td></tr>
    <tr><td class="k">Website & media</td><td>marqthink.com · Instagram @marqthink.ai · Halaman kontak: marqthink.com/kontak</td></tr>
  </table>
  <p class="muted" style="margin-top:3mm">Saya yang bertanda tangan menyatakan informasi dalam dokumen ini benar.</p>
  <div style="margin-top:9mm;width:70mm;border-top:1px solid #0b1220;padding-top:2mm"><b>${CONTACT.owner}</b><br><span class="muted">Pemilik Marqthink</span></div>
  <div class="foot"><span>Profil Usaha Marqthink</span><span>Halaman 3</span></div>
</section>
</body></html>`;

writeFileSync(join(here, "profil-usaha.html"), html);
const b = await chromium.launch();
const p = await b.newPage();
await p.setContent(html, { waitUntil: "load" });
await p.pdf({ path: join(here, "Profil-Usaha-Marqthink.pdf"), format: "A4", printBackground: true });
await p.setViewportSize({ width: 794, height: 1123 });
await p.screenshot({ path: join(here, "preview.png"), fullPage: true });
await b.close();
console.log("ok");
