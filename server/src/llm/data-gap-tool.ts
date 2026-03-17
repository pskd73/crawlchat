import { multiLinePrompt } from "@packages/agentic";
import { z } from "zod";

export function makeDataGapTool() {
  return {
    id: "report_data_gap",
    description: multiLinePrompt([
      "Report a gap or missing information in the knowledge base.",
      "Use this when search_data returned results but they don't match or answer the user's query.",
      "Use this when user asks question related to the <context> but you don't have the answer for the question asked, even partially.",
      "The title and the descriptions should be in English language.",
      "Do NOT use this if search_data returned no results.",
      "'Not documented' is considered as a data gap.",
      "'No information' is considered as a data gap.",
      "'Not available' is considered as a data gap.",
      "'Not found' is considered as a data gap.",
      "'Not mentioned' is considered as a data gap.",
      "'Not provided' is considered as a data gap.",
      "'Not documented' is considered as a data gap.",
      "'Not documented' is considered as a data gap.",
    ]),
    schema: z.object({
      title: z.string({
        description: "A short title summarizing the missing information",
      }),
      description: z.string({
        description:
          "A detailed description of what information is missing and why it would be useful",
      }),
    }),
    execute: async ({
      title,
      description,
    }: {
      title: string;
      description: string;
    }) => {
      return {
        content: "Data gap reported successfully. Thank you for the feedback.",
        customMessage: {
          dataGap: {
            title,
            description,
          },
        },
      };
    },
  };
}
