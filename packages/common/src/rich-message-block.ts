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

export const verifyEmailBlock: RichMessageBlock = {
  schema: z.object({
    email: z
      .string({
        description:
          "Email of the user to verify. This is optional. Fill if you have it.",
      })
      .optional(),
  }),
};

export const apiPlaygroundBlock: RichMessageBlock = {
  schema: z.object({
    url: z.string({
      description: "URL of the API. Wrap path variables in {} if any.",
    }),
    method: z.string({
      description:
        "Method of the API. Should be one of GET, POST, PUT, DELETE.",
    }),
    fields: z.array(
      z.object({
        key: z.string({ description: "Key of the field" }),
        type: z.enum(["header", "queryParam", "body", "pathParam"]),
        required: z.boolean(),
        description: z.string({
          description: "Description of the field under 20 words",
        }),
        defaultValue: z
          .string({
            description:
              "Initial value of the field as per the user description.",
          })
          .optional(),
      }),
      {
        description:
          "Fields of the API across headers, query params, body, and path params",
      }
    ),
  }),
};

export const richMessageBlocks: Record<string, RichMessageBlock> = {
  cta: ctaBlock,
  "create-ticket": createTicketBlock,
  "verify-email": verifyEmailBlock,
  "api-playground": apiPlaygroundBlock,
};
