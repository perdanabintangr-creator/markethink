// Salin aset pendeteksi suara (Silero VAD + onnxruntime) ke public/vad supaya disajikan dari domain sendiri.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const out = join(process.cwd(), "public", "vad");
mkdirSync(out, { recursive: true });
const vadDir = join(process.cwd(), "node_modules", "@ricky0123", "vad-web");
const ortDir = join(process.cwd(), "node_modules", "onnxruntime-web");
const files = [
  [join(vadDir, "dist", "silero_vad_legacy.onnx"), "silero_vad_legacy.onnx"],
  [join(vadDir, "dist", "vad.worklet.bundle.min.js"), "vad.worklet.bundle.min.js"],
  [join(ortDir, "dist", "ort-wasm-simd-threaded.wasm"), "ort-wasm-simd-threaded.wasm"],
  [join(ortDir, "dist", "ort-wasm-simd-threaded.mjs"), "ort-wasm-simd-threaded.mjs"],
];
for (const [from, name] of files) {
  if (!existsSync(from)) throw new Error(`Aset VAD tidak ditemukan: ${from}`);
  copyFileSync(from, join(out, name));
}
console.log(`[vad] ${files.length} aset disalin ke public/vad`);
