import { z } from "zod";

export type RichMessageBlock = {
  schema: z.ZodSchema;
};

export const ctaBlock: RichMessageBlock = {
  schema: z.object({
    title: z.string({ description: "Title of the CTA" }),
    description: z.string({ description: "Description of the CTA" }),
    link: z.string({ description: "Link of the CTA" }),
    ctaButtonLabel: z.string({ description: "Label of the CTA button" }),
  }),
};

export const createTicketBlock: RichMessageBlock = {
  schema: z.object({
    title: z.string({
      description: "Title of the ticket. Keep it short and concise.",
    }),
    message: z.string({
      description: "Message of the ticket from the user point of view",
    }),
  }),
};

export const richMessageBlocks: Record<string, RichMessageBlock> = {
  cta: ctaBlock,
  "create-ticket": createTicketBlock,
};
