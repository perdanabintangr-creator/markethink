import type { IndustryId } from "./presets";
import type { Slide } from "./slides";

/**
 * Contoh isi slide & visual per industri untuk pratinjau gaya (bukan bulatan cadangan): F&B → makanan/minuman,
 * kecantikan → model & skincare, properti → rumah, dst. Gambar contoh dibuat AI sekali (admin) lalu dipakai ulang.
 */

type Trio = [Slide, Slide, Slide];

const S = (cover: Slide, point: Slide, list: Slide): Trio => [cover, point, list];

export const INDUSTRY_SAMPLES: Record<IndustryId, { id: Trio; en: Trio }> = {
  fnb: {
    id: S(
      { type: "cover", label: "menu baru", title: "Es kopi susu *gula aren*", accent: "yang bikin nagih.", sub: "Manisnya pas, kopinya tetap kerasa.", corners: ["Seduh tiap pagi", "Rasa naik kelas", "Simpan dulu", "Geser lanjut"] },
      { type: "point", label: "RAHASIA #1", num: "01", title: "Gula aren", accent: "cair, bukan bubuk", body: "Gula aren cair larut sempurna di es, jadi rasa manisnya rata dari tegukan pertama sampai terakhir." },
      { type: "list", label: "TAKARAN PAS", title: "Satu gelas *sempurna*", items: ["Espresso 1 shot", "Susu segar 150 ml", "Gula aren 20 ml", "Es batu penuh"] },
    ),
    en: S(
      { type: "cover", label: "new menu", title: "Palm sugar *iced* latte", accent: "you'll crave daily.", sub: "Sweet enough, still tastes like coffee." },
      { type: "point", label: "SECRET #1", num: "01", title: "Liquid", accent: "palm sugar", body: "Liquid palm sugar blends into ice, so every sip tastes the same." },
      { type: "list", label: "THE RATIO", title: "One *perfect* glass", items: ["1 espresso shot", "150 ml fresh milk", "20 ml palm sugar", "Full ice"] },
    ),
  },
  fashion: {
    id: S(
      { type: "cover", label: "koleksi baru", title: "Satu outer,", accent: "*lima* gaya.", sub: "Cara memakai outer linen untuk kerja sampai weekend.", corners: ["Koleksi terbaru", "Gaya harian", "Mix & match", "Geser lanjut"] },
      { type: "point", label: "GAYA #1", num: "01", title: "Kantor", accent: "tetap santai", body: "Padukan dengan celana bahan lurus dan loafers. Rapi tanpa terlihat kaku." },
      { type: "list", label: "RINGKASAN", title: "Lima cara *pakai*", items: ["Kantor santai", "Ngopi sore", "Jalan-jalan", "Acara keluarga", "Weekend di rumah"] },
    ),
    en: S(
      { type: "cover", label: "new collection", title: "One outer,", accent: "*five* looks.", sub: "Wear the linen outer from office to weekend." },
      { type: "point", label: "LOOK #1", num: "01", title: "Office", accent: "but relaxed", body: "Pair with straight trousers and loafers. Neat, never stiff." },
      { type: "list", label: "SUMMARY", title: "Five ways to *wear*", items: ["Relaxed office", "Afternoon coffee", "City walk", "Family event", "Weekend home"] },
    ),
  },
  beauty: {
    id: S(
      { type: "cover", label: "skin tips", title: "Kulit kusam?", accent: "Coba *urutan* ini.", sub: "Rutinitas pagi 3 langkah untuk kulit lebih cerah.", corners: ["Rawat tiap pagi", "Kulit sehat", "Simpan dulu", "Geser lanjut"] },
      { type: "point", label: "LANGKAH #1", num: "01", title: "Cuci muka", accent: "yang lembut", body: "Pakai pembersih dengan pH seimbang. Kulit bersih tanpa terasa ketarik." },
      { type: "list", label: "URUTAN PAGI", title: "Rutinitas *glowing*", items: ["Pembersih lembut", "Serum vitamin C", "Pelembap ringan", "Sunscreen SPF 50"] },
    ),
    en: S(
      { type: "cover", label: "skin tips", title: "Dull skin?", accent: "Try this *order*.", sub: "A 3-step morning routine for brighter skin." },
      { type: "point", label: "STEP #1", num: "01", title: "A gentle", accent: "cleanser", body: "Use a pH-balanced cleanser. Clean skin without the tight feeling." },
      { type: "list", label: "MORNING ORDER", title: "The *glow* routine", items: ["Gentle cleanser", "Vitamin C serum", "Light moisturiser", "SPF 50 sunscreen"] },
    ),
  },
  property: {
    id: S(
      { type: "cover", label: "unit tersedia", title: "Rumah 2 lantai", accent: "dekat tol & sekolah.", sub: "Cicilan mulai terjangkau, siap huni tahun ini.", corners: ["Hunian nyaman", "Lokasi strategis", "Siap huni", "Geser lanjut"] },
      { type: "point", label: "KEUNGGULAN #1", num: "01", title: "Akses", accent: "5 menit ke tol", body: "Berangkat kerja lebih santai, akhir pekan ke luar kota tanpa macet panjang." },
      { type: "list", label: "FASILITAS", title: "Yang kamu *dapat*", items: ["3 kamar tidur", "Carport 2 mobil", "Taman belakang", "Keamanan 24 jam"] },
    ),
    en: S(
      { type: "cover", label: "units available", title: "Two-storey home", accent: "near toll & schools.", sub: "Affordable instalments, ready this year." },
      { type: "point", label: "PERK #1", num: "01", title: "Access", accent: "5 min to the toll", body: "Easier commutes and weekend trips without long jams." },
      { type: "list", label: "FACILITIES", title: "What you *get*", items: ["3 bedrooms", "2-car carport", "Back garden", "24h security"] },
    ),
  },
  education: {
    id: S(
      { type: "cover", label: "tips belajar", title: "Belajar 25 menit,", accent: "*hasil* 2 jam.", sub: "Teknik pomodoro yang bikin fokus tahan lama.", num: "5", corners: ["Belajar cerdas", "Fokus naik", "Simpan dulu", "Geser lanjut"] },
      { type: "point", label: "LANGKAH #1", num: "01", title: "Satu tugas,", accent: "satu timer", body: "Pilih satu tugas saja, pasang timer 25 menit, dan jauhkan HP dari meja." },
      { type: "list", label: "RANGKUMAN", title: "Pomodoro *simpel*", items: ["Fokus 25 menit", "Istirahat 5 menit", "Ulangi 4 kali", "Istirahat panjang 20 menit"] },
    ),
    en: S(
      { type: "cover", label: "study tips", title: "Study 25 minutes,", accent: "get *2 hours* done.", sub: "The pomodoro method for lasting focus." },
      { type: "point", label: "STEP #1", num: "01", title: "One task,", accent: "one timer", body: "Pick one task, set 25 minutes, phone away from the desk." },
      { type: "list", label: "SUMMARY", title: "Simple *pomodoro*", items: ["Focus 25 min", "Break 5 min", "Repeat 4 times", "Long break 20 min"] },
    ),
  },
  tech: {
    id: S(
      { type: "cover", label: "tips digital", title: "Kerja 2x lebih cepat", accent: "dengan *AI* ini.", sub: "Alat yang dipakai tim kami tiap hari.", num: "7", corners: ["Kerja cerdas", "Hemat waktu", "Simpan dulu", "Geser lanjut"] },
      { type: "point", label: "ALAT #1", num: "01", title: "Ringkas rapat", accent: "otomatis", body: "Rekam rapat, AI langsung membuat ringkasan dan daftar tugas siapa mengerjakan apa." },
      { type: "list", label: "RANGKUMAN", title: "Alur kerja *baru*", items: ["Ringkas rapat", "Draf email", "Rapikan data", "Jadwal otomatis"] },
    ),
    en: S(
      { type: "cover", label: "digital tips", title: "Work 2x faster", accent: "with this *AI*.", sub: "Tools our team uses every day." },
      { type: "point", label: "TOOL #1", num: "01", title: "Meeting notes", accent: "on autopilot", body: "Record a meeting and AI writes the summary and who does what." },
      { type: "list", label: "SUMMARY", title: "A *new* workflow", items: ["Meeting notes", "Email drafts", "Clean data", "Auto scheduling"] },
    ),
  },
  health: {
    id: S(
      { type: "cover", label: "latihan pagi", title: "10 menit sehari,", accent: "badan lebih *bugar*.", sub: "Latihan tanpa alat yang bisa dilakukan di rumah.", corners: ["Gerak tiap hari", "Badan bugar", "Simpan dulu", "Geser lanjut"] },
      { type: "point", label: "GERAKAN #1", num: "01", title: "Squat", accent: "15 kali", body: "Turun pelan, punggung lurus, lutut sejajar ujung kaki. Kuatkan kaki dan pinggul." },
      { type: "list", label: "PROGRAM", title: "Latihan *10 menit*", items: ["Squat 15x", "Push up 10x", "Plank 30 detik", "Jumping jack 30x"] },
    ),
    en: S(
      { type: "cover", label: "morning workout", title: "10 minutes a day,", accent: "feel *fitter*.", sub: "No-equipment workout you can do at home." },
      { type: "point", label: "MOVE #1", num: "01", title: "Squat", accent: "15 reps", body: "Lower slowly, back straight, knees over toes." },
      { type: "list", label: "PROGRAM", title: "The *10-minute* set", items: ["Squat 15x", "Push up 10x", "Plank 30 s", "Jumping jack 30x"] },
    ),
  },
  automotive: {
    id: S(
      { type: "cover", label: "servis berkala", title: "Mobil terasa berat?", accent: "Cek *5 hal* ini.", sub: "Tanda mobil butuh servis sebelum mogok di jalan.", corners: ["Rawat rutin", "Aman di jalan", "Simpan dulu", "Geser lanjut"] },
      { type: "point", label: "CEK #1", num: "01", title: "Oli mesin", accent: "tiap 5.000 km", body: "Oli yang terlambat diganti bikin mesin panas dan tarikan terasa berat." },
      { type: "list", label: "CHECKLIST", title: "Sebelum *mudik*", items: ["Oli & filter", "Tekanan ban", "Rem & kampas", "Aki & lampu"] },
    ),
    en: S(
      { type: "cover", label: "routine service", title: "Car feels heavy?", accent: "Check these *5*.", sub: "Signs your car needs service before it breaks down." },
      { type: "point", label: "CHECK #1", num: "01", title: "Engine oil", accent: "every 5,000 km", body: "Late oil changes heat the engine and make it sluggish." },
      { type: "list", label: "CHECKLIST", title: "Before a *road trip*", items: ["Oil & filter", "Tyre pressure", "Brakes & pads", "Battery & lights"] },
    ),
  },
  services: {
    id: S(
      { type: "cover", label: "insight bisnis", title: "Klien susah closing?", accent: "Ubah *cara* presentasi.", sub: "3 kebiasaan agensi yang bikin proposal di-ACC.", corners: ["Bisnis tumbuh", "Klien puas", "Simpan dulu", "Geser lanjut"] },
      { type: "point", label: "KEBIASAAN #1", num: "01", title: "Mulai dari", accent: "masalah klien", body: "Buka presentasi dengan masalah yang klien rasakan, baru tawarkan solusi kamu." },
      { type: "list", label: "RANGKUMAN", title: "Proposal yang *menang*", items: ["Masalah dulu", "Bukti hasil", "Satu harga jelas", "Langkah berikutnya"] },
    ),
    en: S(
      { type: "cover", label: "business insight", title: "Clients won't close?", accent: "Change your *pitch*.", sub: "3 agency habits that get proposals approved." },
      { type: "point", label: "HABIT #1", num: "01", title: "Start with", accent: "their problem", body: "Open with the pain your client feels, then offer your solution." },
      { type: "list", label: "SUMMARY", title: "Proposals that *win*", items: ["Problem first", "Proof of results", "One clear price", "Next step"] },
    ),
  },
  retail: {
    id: S(
      { type: "cover", label: "promo minggu ini", title: "Beli 2 gratis 1", accent: "*semua* camilan.", sub: "Stok terbatas, berlaku sampai Minggu.", corners: ["Belanja hemat", "Produk lokal", "Simpan dulu", "Geser lanjut"] },
      { type: "point", label: "FAVORIT #1", num: "01", title: "Keripik", accent: "pedas manis", body: "Renyah, bumbu meresap, cocok untuk teman nonton dan oleh-oleh." },
      { type: "list", label: "CARA PESAN", title: "Pesan *mudah*", items: ["Pilih produk", "Chat admin", "Bayar transfer", "Dikirim hari ini"] },
    ),
    en: S(
      { type: "cover", label: "this week's deal", title: "Buy 2 get 1", accent: "on *all* snacks.", sub: "Limited stock, until Sunday." },
      { type: "point", label: "FAVOURITE #1", num: "01", title: "Sweet & spicy", accent: "chips", body: "Crunchy, well seasoned, perfect for movie night or gifts." },
      { type: "list", label: "HOW TO ORDER", title: "Order *easily*", items: ["Pick a product", "Chat admin", "Transfer", "Ships today"] },
    ),
  },
};

/** Subjek visual utama contoh per gaya (bahasa Inggris, tanpa teks). */
export const PRESET_VISUALS: Record<string, string> = {
  "fnb-warm": "an iced palm sugar coffee latte in a tall glass with visible layers, on a rustic wooden table with coffee beans",
  "fnb-bold": "a juicy gourmet burger with melting cheese and steam, dramatic close-up",
  "fnb-photo": "two young Indonesian friends laughing while holding iced coffees in a cozy modern cafe, golden hour",
  "fashion-editorial": "a stylish Indonesian woman wearing a beige linen outer and wide trousers, editorial pose, minimal studio",
  "fashion-street": "a young Indonesian man in oversized streetwear hoodie and sneakers, low angle, urban night",
  "fashion-boutique": "a neatly folded beige linen shirt with a leather handbag and gold accessories, minimal still life",
  "beauty-glow": "a glass serum dropper bottle with pink rose petals and water droplets, dewy glow",
  "beauty-clinic": "a set of minimalist white skincare bottles and a jar on a marble surface, clean clinical lighting",
  "beauty-model": "a beautiful young Indonesian woman with glowing healthy skin gently touching her cheek, soft natural light",
  "property-premium": "a modern two-storey tropical house exterior at dusk with warm interior lights and a small pool",
  "property-photo": "a bright modern Indonesian living room with large windows, wooden floor and indoor plants",
  "property-corporate": "a miniature 3D model of a modern two-storey house with a small garden",
  "education-glossy": "a glossy 3D tomato-shaped timer next to an open notebook and pencil",
  "education-playful": "a cute clay 3D stack of books with a smiling alarm clock",
  "education-board": "a flat illustration of a student studying at a desk with a timer and coffee",
  "tech-glossy": "a glossy 3D laptop with floating app icons and a small robot assistant",
  "tech-bold": "a glowing glass AI chip floating with light trails, dramatic",
  "tech-grid": "a futuristic transparent glass smartphone showing abstract interface panels with neon glow",
  "health-gym": "a muscular young Indonesian man lifting a heavy dumbbell in a dark gym, dramatic rim light",
  "health-active": "a fit young Indonesian woman doing squats in a sunny park in the morning, energetic",
  "health-calm": "a calm wellness still life with a yoga mat, small plant and a glass of water, soft morning shadow",
  "automotive-garage": "a modern black SUV in a dark studio with dramatic rim lighting and wet floor reflections",
  "automotive-street": "a sleek car driving on a Jakarta city street at night with motion blur lights",
  "automotive-showroom": "a clean studio shot of a shiny car alloy wheel and tyre",
  "services-corporate": "a glossy 3D briefcase with rising bar chart and handshake icon",
  "services-bold": "a dramatic glossy 3D chess king piece on black",
  "services-editorial": "a minimal still life of a fountain pen on a signed contract with a coffee cup",
  "retail-promo": "colourful Indonesian snack chip packs arranged on a bright podium with confetti",
  "retail-product": "a single premium snack pouch package standing upright with chips spilling out, studio shot",
  "retail-store": "a friendly Indonesian small shop owner standing behind a counter full of products, warm light",
};

export const SAMPLE_PREFIX = "system/style-samples/";
export const samplePath = (presetId: string) => `${SAMPLE_PREFIX}${presetId}.jpg`;
