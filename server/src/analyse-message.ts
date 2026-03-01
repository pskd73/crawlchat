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

export type MessageAnalysisResponse = {
  questionSentiment: QuestionSentiment;
  shortQuestion: string;
  language: string;
  followUpQuestions: string[];
  category: { title: string; score: number } | null;
  categorySuggestions: { title: string; description: string }[];
  resolved: boolean;
};

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
        Generate follow up questions that the user might want to ask next.
        Phrase each question from the user's point of view, as if the user is asking it (e.g. "How do I...", "What happens when...", "Can you explain...").
        Do not phrase as suggestions or prompts from the assistant (e.g. avoid "Would you like to know..." or "You could ask...").
        Use recent questions and thread questions as inspiration but rephrase them; do not copy them verbatim.
        Max 3 questions.
        Must not duplicate any thread questions.
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

  const llmConfig = getConfig(
    process.env.MESSAGE_ANALYSER_MODEL ?? "openrouter/openai/gpt-5.1"
  );

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
    return { response: null, cost: 0 };
  }

  return {
    response: JSON.parse(content as string) as MessageAnalysisResponse,
    cost: flow.getUsage().cost,
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

    const { response, cost } = await analyseMessage(
      question,
      answer,
      recentQuestions,
      threadQuestions,
      [...(options?.categories ?? []), ...uniqueCategories],
      message.scrapeId
    );

    if (
      options?.onFollowUpQuestion &&
      response &&
      response.followUpQuestions.length > 0 &&
      message.scrape.user.plan?.planId !== "free"
    ) {
      const hardcodedFollowUpQuestions = message.scrape.ticketingEnabled
        ? ["I want to create a support ticket"]
        : [];
      options.onFollowUpQuestion([
        ...hardcodedFollowUpQuestions,
        ...response.followUpQuestions,
      ]);
    }

    const cleanedCategory =
      response?.category &&
      options?.categories &&
      options?.categories.some(
        (c) =>
          c.title.trim().toLowerCase() ===
          response.category?.title.trim().toLowerCase()
      )
        ? response.category
        : null;
    const category =
      cleanedCategory && cleanedCategory.score > 0.9
        ? cleanedCategory.title
        : null;
    const avgScore =
      message.links.length > 0
        ? message.links.reduce((acc, curr) => acc + (curr.score ?? 0), 0) /
          message.links.length
        : null;
    const maxScore =
      message.links.length > 0
        ? Math.max(...message.links.map((l) => l.score ?? 0))
        : null;

    const analysis: MessageAnalysis = {
      questionRelevanceScore: null,
      questionSentiment: response?.questionSentiment ?? null,
      shortQuestion: response?.shortQuestion ?? null,
      followUpQuestions: response?.followUpQuestions ?? [],
      language: response?.language ?? null,
      category,
      categorySuggestions: [],
      resolved: response?.resolved ?? false,
      dataGapTitle: null,
      dataGapDescription: null,
      dataGapDone: null,
      dataGapCancelled: null,
      avgScore,
      maxScore,
      cost,
    };

    await prisma.message.update({
      where: { id: messageId },
      data: {
        analysis,
      },
    });

    const questionAnalysis: Partial<MessageAnalysis> = {
      category,
      categorySuggestions: response?.categorySuggestions ?? [],
      shortQuestion: response?.shortQuestion ?? null,
      avgScore,
      maxScore,
      questionSentiment: response?.questionSentiment ?? null,
      language: response?.language ?? null,
    };

    await prisma.message.update({
      where: { id: questionMessageId },
      data: {
        analysis: {
          upsert: {
            set: questionAnalysis,
            update: questionAnalysis,
          },
        },
      },
    });

    await consumeCredits(
      message.scrape.userId,
      "messages",
      1,
      questionMessageId,
      cost,
      "Analysis"
    );
  } catch (e) {
    console.error("Failed to analyse message", e);
  }
}
