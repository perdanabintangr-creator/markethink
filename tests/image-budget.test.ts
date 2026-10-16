import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const png = "data:image/png;base64,iVBORw0KGgo=";

it("paket Free: model gambar hemat dicoba dulu (hanya 'image'), gagal → jalur biasa", async () => {
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-v1-test");
  vi.stubEnv("OPENROUTER_IMAGE_MODEL", "google/gemini-flash-image");
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
  vi.stubEnv("IMAGEN_API_KEY", "");
  const bodies: { model: string; modalities: string[] }[] = [];
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
    const b = JSON.parse(init.body);
    bodies.push({ model: b.model, modalities: b.modalities });
    if (b.model === "openai/gpt-image-2") return new Response("bad", { status: 400 });
    return new Response(JSON.stringify({ choices: [{ message: { images: [{ image_url: { url: png } }] } }], usage: { cost: 0.01 } }), { status: 200 });
  });
  const { generateImage } = await import("@/lib/ai/image");
  const img = await generateImage("poster kopi", "1:1", [], { budget: true });
  expect(img.model).toBe("meta/muse-image");
  expect(img.costUsd).toBe(0.01);
  expect(bodies.map((b) => b.model)).toEqual(["openai/gpt-image-2", "meta/muse-image"]);
  expect(bodies[0].modalities).toEqual(["image"]);
});
