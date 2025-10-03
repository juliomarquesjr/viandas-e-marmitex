import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { RO_SYSTEM_PROMPT } from "@/lib/ai/ro/constants";

type ModelOptions = {
  responseMimeType?: string;
  temperature?: number;
};

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não configurada no ambiente");
    }
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

export function getRoModel(options: ModelOptions = {}): GenerativeModel {
  const { responseMimeType, temperature } = options;
  return getClient().getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: RO_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType,
      temperature: temperature ?? 0.35,
    },
  });
}
