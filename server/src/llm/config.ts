import { LlmModel } from "libs/prisma";

export type LlmConfig = {
  model: string;
  apiKey: string;
  ragTopN: number;
  creditsPerMessage: number;
  baseURL?: string;
  supportsImages?: boolean;
};

export const getConfig = (model?: LlmModel | null): LlmConfig => {
  if (model === "o3_mini") {
    return {
      model: "o3-mini",
      apiKey: process.env.OPENAI_API_KEY!,
      ragTopN: 2,
      creditsPerMessage: 1,
    };
  }
  if (model === LlmModel.sonnet_3_5) {
    return {
      model: "claude-3-5-sonnet-20241022",
      apiKey: process.env.ANTHROPIC_API_KEY!,
      ragTopN: 2,
      baseURL: "https://api.anthropic.com/v1",
      creditsPerMessage: 4,
    };
  }
  if (model === LlmModel.sonnet_3_7) {
    return {
      model: "claude-3-7-sonnet-20250219",
      apiKey: process.env.ANTHROPIC_API_KEY!,
      ragTopN: 2,
      baseURL: "https://api.anthropic.com/v1",
      creditsPerMessage: 4,
    };
  }
  if (model === LlmModel.gemini_2_5_flash) {
    return {
      model: "google/gemini-2.5-flash",
      apiKey: process.env.OPENROUTER_API_KEY!,
      ragTopN: 6,
      creditsPerMessage: 1,
      baseURL: "https://openrouter.ai/api/v1"
    };
  }
  if (model === LlmModel.gemini_2_5_flash_lite) {
    return {
      model: "gemini-2.5-flash-lite-preview-06-17",
      apiKey: process.env.GEMINI_API_KEY!,
      ragTopN: 4,
      creditsPerMessage: 1,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    };
  }
  if (model === LlmModel.o4_mini) {
    return {
      model: "o4-mini",
      apiKey: process.env.OPENAI_API_KEY!,
      ragTopN: 4,
      creditsPerMessage: 2,
      supportsImages: true,
    };
  }
  if (model === LlmModel.gpt_5_nano) {
    return {
      model: "gpt-5-nano",
      apiKey: process.env.OPENAI_API_KEY!,
      ragTopN: 6,
      creditsPerMessage: 1,
      supportsImages: true,
    };
  }
  if (model === LlmModel.gpt_5) {
    return {
      model: "gpt-5",
      apiKey: process.env.OPENAI_API_KEY!,
      ragTopN: 6,
      creditsPerMessage: 2,
      supportsImages: true,
    };
  }
  if (model === LlmModel.sonnet_4_5) {
    return {
      model: "anthropic/claude-sonnet-4.5",
      apiKey: process.env.OPENROUTER_API_KEY!,
      ragTopN: 10,
      creditsPerMessage: 4,
      supportsImages: true,
      baseURL: "https://openrouter.ai/api/v1"
    };
  }
  return {
    model: "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY!,
    ragTopN: 4,
    creditsPerMessage: 1,
    supportsImages: true,
  };
};
