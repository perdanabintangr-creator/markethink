import { expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
const { deckImageMaxFor, premiumVisualsFor } = await import("@/lib/ai/tools");
const { deckImageRequests } = await import("@/lib/pptx");

it("foto AI di PPT bertingkat per paket", () => {
  expect(deckImageMaxFor("beta", false)).toBe(0);
  expect(deckImageMaxFor("starter", false)).toBe(1);
  expect(deckImageMaxFor("pro", false)).toBe(6);
  expect(deckImageMaxFor("promax", false)).toBe(8);
  expect(deckImageMaxFor("beta", true)).toBe(8);
  expect([premiumVisualsFor("beta", false), premiumVisualsFor("starter", false), premiumVisualsFor("pro", false), premiumVisualsFor("promax", false)]).toEqual([
    false,
    false,
    true,
    true,
  ]);
});

it("Starter: hanya cover yang mendapat foto AI", () => {
  const input = {
    title: "Deck",
    cover_image_prompt: "cover",
    slides: [{ layout: "image-left", title: "A", image_prompt: "a" }, { layout: "image-right", title: "B", image_prompt: "b" }],
  } as unknown as Parameters<typeof deckImageRequests>[0];
  expect(deckImageRequests(input, 1).map((r) => r.key)).toEqual(["cover"]);
});
