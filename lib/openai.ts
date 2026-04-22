import "server-only";

import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

export function getOpenAIClient() {
  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}
