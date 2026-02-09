import {
  MessageAnalysis,
  prisma,
  QuestionSentiment,
  ScrapeMessageCategory,
} from "@packages/common/prisma";
import { Agent } from "@packages/agentic";
import { z } from "zod";
import { Flow } from "@packages/agentic";
import { getConfig } from "./llm/config";
import { consumeCredits } from "@packages/common/user-plan";

export async function analyseMessage(
  question: string,
  answer: string,
  recentQuestions: string[],
  threadQuestions: string[],
  categories: ScrapeMessageCategory[],
  scrapeId: string
) {
  let prompt = `
    You are a helpful assistant that analyses a message and returns a message analysis.
    You need to analyse the question, answer and the sources provided and give back the details provided.
    You need to provide the response in the mentioned schema.

    <question>
    ${question}
    </question>

    <answer>
    ${answer}
    </answer>

    <recent-questions>
    ${recentQuestions.join("\n\n")}
    </recent-questions>

    <thread-questions>
    ${threadQuestions.join("\n\n")}
    </thread-questions>

    <categories>
    ${categories.map((c) => `${c.title}: ${c.description}`).join("\n\n")}
    </categories>
    `;

  const schema: Record<string, z.ZodSchema> = {
    questionSentiment: z.nativeEnum(QuestionSentiment).describe(
      `
        The sentiment of the question.
        It should be one of the following: ${Object.values(
          QuestionSentiment
        ).join(", ")}
      `
    ),
    shortQuestion: z.string().describe(
      `
        The short verstion for the question.
        It should be under 10 words.
        It should be in question format.
        It must be in english
      `
    ),
    language: z.string().describe(
      `
        The language of the question, in full name, for example english, french.
      `
    ),
    followUpQuestions: z.array(z.string()).describe(
      `
        Use the recent questions to generate follow up questions.
        Don't use the recent questions as it is.
        Use the thread questions to generate follow up questions related to the thread.
        It should be as if the user is asking the question to the assistant.
        Max it should be 3 questions.
        It should not be part of thread questions.
      `
    ),
    categorySuggestions: z
      .array(
        z.object({
          title: z.string().describe(`
        The title of the category.
        It should be under 3 words.
      `),
          description: z.string().describe(`
        The description of the category.
        It should be plain text under 30 words.
      `),
        })
      )
      .describe(
        `
        Suggest categories for the question.
        It should be under 3 categories.
        Try to pick one from mentioned <categories/>. Create new only if not available.
        Give high preference to the existing <categories/>
      `
      ),
    resolved: z.boolean().describe(
      `
        This should be true if the user mentioned that their question is resolved.
        It should be true when user says, for example, "that works, ...", "it worked, ...", "that helped, ...".
        It should be true even if the user says it workd and asks follow up questions.
      `
    ),
  };

  if (categories.length > 0) {
    const categoryNames = categories.map((c) => c.title);
    schema.category = z
      .object({
        title: z.enum(categoryNames as [string, ...string[]]),
        score: z.number().describe(`
          The confidence score of the category description for the question.
          It should be a number between 0 and 1.
          You need to match the answer with the category description and get a best match.
          Calculate score by how relevant the answer is to the category description.
        `),
      })
      .nullable()
      .describe(
        `
        The category of the answer.
        Give the category only if it is a perfect match for the category description.
        Don't give the category if it is not a perfect match.
      `
      );
  }

  const llmConfig = getConfig("openrouter/openai/gpt-5.1");

  const agent = new Agent({
    id: "analyser",
    prompt,
    schema: z.object(schema),
    user: `analyser/${scrapeId}`,
    maxTokens: 4096,
    ...llmConfig,
  });

  const flow = new Flow([agent], {
    messages: [],
  });

  flow.addNextAgents(["analyser"]);

  await flow.stream();

  const content = flow.getLastMessage().llmMessage.content;

  if (!content) {
    return null;
  }

  return JSON.parse(content as string) as {
    questionSentiment: QuestionSentiment;
    shortQuestion: string;
    language: string;
    followUpQuestions: string[];
    category: { title: string; score: number } | null;
    categorySuggestions: { title: string; description: string }[];
    resolved: boolean;
  };
}

export async function fillMessageAnalysis(
  messageId: string,
  questionMessageId: string,
  question: string,
  answer: string,
  options?: {
    onFollowUpQuestion?: (questions: string[]) => void;
    categories?: ScrapeMessageCategory[];
  }
) {
  try {
    const message = await prisma.message.findFirstOrThrow({
      where: { id: messageId },
      include: {
        scrape: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!message.scrape.analyseMessage) {
      return;
    }

    const threadMessages = await prisma.message.findMany({
      where: {
        threadId: message.threadId,
      },
      take: 50,
    });

    const recentMessages = await prisma.message.findMany({
      where: {
        scrapeId: message.scrapeId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    const recentQuestions: string[] = recentMessages
      .filter((m) => m.analysis?.shortQuestion)
      .map((m) => m.analysis!.shortQuestion!);

    const threadQuestions: string[] = threadMessages
      .filter((m) => m.analysis?.shortQuestion)
      .map((m) => m.analysis!.shortQuestion!);

    const latestQuestions = await prisma.message.findMany({
      where: {
        scrapeId: message.scrapeId,
        llmMessage: {
          is: {
            role: "user",
          },
        },
      },
      select: {
        analysis: {
          select: {
            categorySuggestions: true,
          },
        },
      },
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });

    const latestCategories: ScrapeMessageCategory[] = latestQuestions
      .filter((q) => q.analysis?.categorySuggestions)
      .map((q) => q.analysis!.categorySuggestions!)
      .reduce((acc, curr) => [...acc, ...curr], [])
      .map((c) => ({
        title: c.title,
        description: c.description,
        createdAt: new Date(),
      }));

    const uniqueCategories = latestCategories.filter(
      (c, index, self) => index === self.findIndex((t) => t.title === c.title)
    );

    const partialAnalysis = await analyseMessage(
      question,
      answer,
      recentQuestions,
      threadQuestions,
      [...(options?.categories ?? []), ...uniqueCategories],
      message.scrapeId
    );

    if (
      options?.onFollowUpQuestion &&
      partialAnalysis &&
      partialAnalysis.followUpQuestions.length > 0 &&
      message.scrape.user.plan?.planId !== "free"
    ) {
      const hardcodedFollowUpQuestions = message.scrape.ticketingEnabled
        ? ["I want to create a support ticket"]
        : [];
      options.onFollowUpQuestion([
        ...hardcodedFollowUpQuestions,
        ...partialAnalysis.followUpQuestions,
      ]);
    }

    const cleanedCategory =
      partialAnalysis?.category &&
      options?.categories &&
      options?.categories.some(
        (c) =>
          c.title.trim().toLowerCase() ===
          partialAnalysis.category?.title.trim().toLowerCase()
      )
        ? partialAnalysis.category
        : null;
    const category =
      cleanedCategory && cleanedCategory.score > 0.9
        ? cleanedCategory.title
        : null;

    const analysis: MessageAnalysis = {
      questionRelevanceScore: null,
      questionSentiment: partialAnalysis?.questionSentiment ?? null,
      shortQuestion: partialAnalysis?.shortQuestion ?? null,
      followUpQuestions: partialAnalysis?.followUpQuestions ?? [],
      language: partialAnalysis?.language ?? null,
      category,
      categorySuggestions: [],
      resolved: partialAnalysis?.resolved ?? false,
      dataGapTitle: null,
      dataGapDescription: null,
      dataGapDone: null,
      dataGapCancelled: null,
    };

    await prisma.message.update({
      where: { id: messageId },
      data: {
        analysis,
      },
    });

    await prisma.message.update({
      where: { id: questionMessageId },
      data: {
        analysis: {
          upsert: {
            set: {
              category,
              categorySuggestions: partialAnalysis?.categorySuggestions ?? [],
            },
            update: {
              category,
              categorySuggestions: partialAnalysis?.categorySuggestions ?? [],
            },
          },
        },
      },
    });

    await consumeCredits(message.scrape.userId, "messages", 1);
  } catch (e) {
    console.error("Failed to analyse message", e);
  }
}
