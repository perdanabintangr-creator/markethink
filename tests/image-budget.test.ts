import { afterEach, expect, it, vi } from "vitest";

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

it("paket Free: GPT Image lewat Image API OpenRouter", async () => {
  const calls = setup((url) =>
    url.endsWith("/images")
      ? new Response(JSON.stringify({ data: [{ b64_json: "iVBORw0KGgo=" }], usage: { cost: 0.007 } }), { status: 200 })
      : new Response("x", { status: 500 }),
  );
  const { generateImage } = await import("@/lib/ai/image");
  const img = await generateImage("poster kopi", "1:1", [], { budget: true });
  expect(img).toMatchObject({ model: "openai/gpt-image-2", costUsd: 0.007, mime: "image/png" });
  expect(img.notes).toBeUndefined();
  expect(calls).toEqual(["/images openai/gpt-image-2"]);
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
    "/images openai/gpt-image-2",
    "/chat/completions openai/gpt-image-2",
    "/images meta/muse-image",
    "/chat/completions meta/muse-image",
    "/chat/completions google/gemini-flash-image",
  ]);
});

it("paket berbayar: langsung Gemini", async () => {
  const calls = setup(() => new Response(JSON.stringify({ choices: [{ message: { images: [{ image_url: { url: png } }] } }] }), { status: 200 }));
  const { generateImage } = await import("@/lib/ai/image");
  expect((await generateImage("poster", "1:1")).model).toBe("google/gemini-flash-image");
  expect(calls).toEqual(["/chat/completions google/gemini-flash-image"]);
});
