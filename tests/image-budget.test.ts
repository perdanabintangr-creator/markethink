import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

const png = "data:image/png;base64,iVBORw0KGgo=";

function setup(handler: (url: string, body: Record<string, unknown>) => Response) {
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-v1-test");
  vi.stubEnv("OPENROUTER_IMAGE_MODEL", "google/gemini-flash-image");
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
  vi.stubEnv("IMAGEN_API_KEY", "");
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
    const body = JSON.parse(init.body);
    calls.push(`${url.split("/api/v1")[1]} ${body.model}`);
    return handler(url, body);
  });
  return calls;
}

it("paket Free: Muse lewat Image API OpenRouter (rasio 4:5 dibulatkan ke 3:4)", async () => {
  let sentRatio = "";
  const calls = setup((url, body) =>
    (sentRatio = String(body.aspect_ratio)) && url.endsWith("/images")
      ? new Response(JSON.stringify({ data: [{ b64_json: "iVBORw0KGgo=" }], usage: { cost: 0.007 } }), { status: 200 })
      : new Response("x", { status: 500 }),
  );
  const { generateImage } = await import("@/lib/ai/image");
  const img = await generateImage("poster kopi", "4:5", [], { budget: true });
  expect(img).toMatchObject({ model: "meta/muse-image", costUsd: 0.007, mime: "image/png" });
  expect(img.notes).toBeUndefined();
  expect(calls).toEqual(["/images meta/muse-image"]);
  expect(sentRatio).toBe("3:4");
});

it("model hemat gagal semua → cadangan Gemini, alasan gagal dicatat", async () => {
  const calls = setup((url, body) =>
    String(body.model).startsWith("google/")
      ? new Response(JSON.stringify({ choices: [{ message: { images: [{ image_url: { url: png } }] } }], usage: { cost: 0.034 } }), { status: 200 })
      : new Response("model not found", { status: 404 }),
  );
  const { generateImage } = await import("@/lib/ai/image");
  const img = await generateImage("poster kopi", "1:1", [], { budget: true });
  expect(img.model).toBe("google/gemini-flash-image");
  expect(img.notes).toContain("openai/gpt-image-2 (images): 404 model not found");
  expect(calls).toEqual([
    "/images meta/muse-image",
    "/chat/completions meta/muse-image",
    "/images openai/gpt-image-2",
    "/chat/completions openai/gpt-image-2",
    "/chat/completions google/gemini-flash-image",
  ]);
});

it("paket berbayar: langsung Gemini", async () => {
  const calls = setup(() => new Response(JSON.stringify({ choices: [{ message: { images: [{ image_url: { url: png } }] } }] }), { status: 200 }));
  const { generateImage } = await import("@/lib/ai/image");
  expect((await generateImage("poster", "1:1")).model).toBe("google/gemini-flash-image");
  expect(calls).toEqual(["/chat/completions google/gemini-flash-image"]);
});

describe("model edit premium (Nano Banana 2)", () => {
  it("memilih Gemini Flash Image penuh, bukan Lite/Pro, versi terbaru & stabil dulu", async () => {
    const { pickPremiumEditModels } = await import("@/lib/ai/image");
    const ids = [
      "google/gemini-3.1-flash-lite-image",
      "google/gemini-3-pro-image-preview",
      "google/gemini-2.5-flash-image",
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-3.1-flash-image",
      "openai/gpt-image-2",
    ];
    expect(pickPremiumEditModels(ids)).toEqual(["google/gemini-3.1-flash-image", "google/gemini-3.1-flash-image-preview"]);
  });
  it("kosong bila tidak ada model Flash Image", async () => {
    const { pickPremiumEditModels } = await import("@/lib/ai/image");
    expect(pickPremiumEditModels(["google/gemini-3.1-flash-lite-image", "meta/muse-image"])).toEqual([]);
  });
});

it("edit premium (Pro & Promax): Nano Banana 2 walau daftar model dikunci ke versi Lite", async () => {
  const calls = setup((_url, body) =>
    body.model === "google/gemini-3.1-flash-image"
      ? new Response(JSON.stringify({ choices: [{ message: { images: [{ image_url: { url: png } }] } }], usage: { cost: 0.068 } }), { status: 200 })
      : new Response("x", { status: 500 }),
  );
  vi.stubEnv("OPENROUTER_IMAGE_MODEL", "google/gemini-3.1-flash-lite-image");
  const { generateImage } = await import("@/lib/ai/image");
  const ref = [{ mime: "image/png", data: "iVBORw0KGgo=" }];
  const img = await generateImage("hapus kartu 02", "16:9", ref, { premiumEdit: true });
  expect(img).toMatchObject({ model: "google/gemini-3.1-flash-image", costUsd: 0.068 });
  expect(calls).toEqual(["/chat/completions google/gemini-3.1-flash-image"]);
});
