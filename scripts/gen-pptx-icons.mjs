// Membuat ikon PNG putih (transparan) untuk slide PPT dari lucide-react → src/lib/pptx-icons.ts.
// Jalankan: node scripts/gen-pptx-icons.mjs
import { writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import * as icons from "lucide-react";

const NAMES = {
  target: "Target", users: "Users", "trending-up": "TrendingUp", megaphone: "Megaphone", lightbulb: "Lightbulb",
  rocket: "Rocket", "shopping-cart": "ShoppingCart", heart: "Heart", star: "Star", calendar: "Calendar",
  "map-pin": "MapPin", camera: "Camera", video: "Video", "message-circle": "MessageCircle", award: "Award",
  "chart-bar": "ChartBar", "chart-pie": "ChartPie", "chart-line": "ChartLine", "dollar-sign": "DollarSign", zap: "Zap",
  globe: "Globe", shield: "Shield", gift: "Gift", coffee: "Coffee", smartphone: "Smartphone", mail: "Mail",
  handshake: "Handshake", sparkles: "Sparkles", clock: "Clock", "circle-check": "CircleCheck",
  layers: "Layers", search: "Search", compass: "Compass", flag: "Flag", trophy: "Trophy", music: "Music",
  store: "Store", tag: "Tag", percent: "Percent", eye: "Eye", "thumbs-up": "ThumbsUp", briefcase: "Briefcase",
  building: "Building2", palette: "Palette", "pen-tool": "PenTool", share: "Share2", wallet: "Wallet", truck: "Truck",
  package: "Package", utensils: "Utensils", "graduation-cap": "GraduationCap", bell: "Bell", ticket: "Ticket",
  play: "Play", sun: "Sun", mic: "Mic", hash: "Hash", crown: "Crown", leaf: "Leaf", smile: "Smile", "map": "Map",
  "user-check": "UserCheck", repeat: "Repeat", "file-text": "FileText", settings: "Settings", link: "Link",
};

const out = {};
for (const [key, comp] of Object.entries(NAMES)) {
  const Icon = icons[comp];
  if (!Icon) throw new Error(`ikon tidak ada: ${comp}`);
  const svg = renderToStaticMarkup(createElement(Icon, { color: "#FFFFFF", size: 96, strokeWidth: 2 }));
  const png = await sharp(Buffer.from(svg)).resize(96, 96).png({ compressionLevel: 9 }).toBuffer();
  out[key] = png.toString("base64");
}

const body = Object.entries(out)
  .map(([k, v]) => `  ${JSON.stringify(k)}: "${v}",`)
  .join("\n");
writeFileSync(
  new URL("../src/lib/pptx-icons.ts", import.meta.url),
  `// File dibuat otomatis oleh scripts/gen-pptx-icons.mjs — jangan diedit manual.\n// Ikon lucide (putih, transparan) untuk slide PPT.\n\nexport const PPTX_ICONS = {\n${body}\n} as const;\n\nexport type PptxIcon = keyof typeof PPTX_ICONS;\nexport const PPTX_ICON_NAMES = Object.keys(PPTX_ICONS) as [PptxIcon, ...PptxIcon[]];\n`,
);
console.log(`${Object.keys(out).length} ikon ditulis`);
