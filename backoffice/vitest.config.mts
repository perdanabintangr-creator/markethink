import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": r("./src"), "server-only": r("./tests/server-only-stub.ts") } },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
