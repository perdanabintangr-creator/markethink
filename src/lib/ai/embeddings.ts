import "server-only";
import { embed, embedMany } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const EMBEDDING_DIMENSIONS = 768;
const MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-001";

function model() {
  return createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY }).textEmbeddingModel(MODEL);
}

const providerOptions = { google: { outputDimensionality: EMBEDDING_DIMENSIONS } };

export const embeddingsEnabled = () => Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export async function embedQuery(text: string) {
  const { embedding } = await embed({ model: model(), value: text.slice(0, 8000), providerOptions });
  return embedding;
}

export async function embedDocuments(texts: string[]) {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 50) {
    const { embeddings } = await embedMany({ model: model(), values: texts.slice(i, i + 50), providerOptions });
    out.push(...embeddings);
  }
  return out;
}
