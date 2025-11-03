import {
  MessageAnalysis,
  MessageSourceLink,
  prisma,
  QuestionSentiment,
  Scrape,
  ScrapeMessageCategory,
} from "libs/prisma";
import { SimpleAgent } from "./agentic";
import { z } from "zod";
import { Flow } from "./flow";
import { makeIndexer } from "../indexer/factory";
import { getConfig } from "./config";
import { createToken } from "libs/jwt";
import { consumeCredits } from "libs/user-plan";

const MAX_ANSWER_SCORE = 0.2;
const MIN_QUESTION_SCORE = 0.8;

export async function decomposeQuestion(question: string, scrapeId: string) {
  const agent = new SimpleAgent({
    id: "decomposer",
    prompt: `
    Your job is to decompose the question into smaller atomic questions.
    Example: Question: "How to integrate it with Notion?" -> ["How to integrate", "Notion integration"].

    Each question should not be more than 5 words.
    Each question should be absolute unique and should not be repeated.

    <question>
    ${question}
    </question>
    `,
    schema: z.object({
      questions: z.array(z.string()).describe(`
        The atomic questions decomposed from the question.  
      `),
    }),
    user: scrapeId,
  });

  const flow = new Flow([agent], {
    messages: [],
  });

  flow.addNextAgents(["decomposer"]);

  await flow.stream();

  const content = flow.getLastMessage().llmMessage.content as string;

  if (!content) {
    return null;
  }

  return JSON.parse(content).questions;
}

export async function getRelevantScore(
  questions: string[],
  scrape: Pick<Scrape, "id" | "indexer">
) {
  const indexer = makeIndexer({
    key: scrape.indexer,
  });
  const scores = await Promise.all(
    questions.map(async (q) => {
      const result = await indexer.search(scrape.id, q, {
        topK: 10,
      });
      const processed = await indexer.process(q, result);
      return Math.max(...processed.map((p) => p.score));
    })
  );

  const hit = scores.some((s) => s >= MIN_QUESTION_SCORE);

  const avg = scores.reduce((acc, s) => acc + s, 0) / scores.length;
  const result = {
    avg,
    scores,
    hit,
  };
  return result;
}

async function getDataGap(
  question: string,
  context: string[],
  scrapeId: string
) {
  const llmConfig = getConfig("gpt_5");

  const agent = new SimpleAgent({
    id: "data-gap-detector",
    prompt: `
    You are a helpful assistant that detects data gaps in the answer provided for the question.
    You may leave title and description empty if there is no data gap.
    The data gap should be very specific and should not be generic.
    The description should be not more than 5 points.
    The data gap can be absance of data or partial data.
    You need to find the data gap from the context provided for the question. Don't find gaps in question.
    `,
    schema: z.object({
      title: z.string({
        description: `
          Make a title for the data gap (if any). It should be under 10 words and respresent the gap clearly.
          It is used to represent the data gap from the sources for the given question.
        `,
      }),
      description: z.string({
        description: `
          Make a description for the data gap (if any). It should be in markdown format.
          It should explain the details to be filled for the data gap.
          Make it descriptive, mention topics to fill as bullet points.
        `,
      }),
    }),
    ...llmConfig,
    user: scrapeId,
  });

  const flow = new Flow([agent], {
    messages: [
      {
        llmMessage: {
          role: "user",
          content: `
            <question>
            ${question}
            </question>
            
            <context>
            ${context.join("\n\n")}
            </context>
          `,
        },
      },
    ],
  });

  flow.addNextAgents(["data-gap-detector"]);

  await flow.stream();

  const content = flow.getLastMessage().llmMessage.content;

  return JSON.parse(content as string) as {
    title: string;
    description: string;
  };
}

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
      `
    ),
    followUpQuestions: z.array(z.string()).describe(
      `
        Use the recent questions to generate follow up questions.
        Don't use the recent questions as it is.
        Use the thread questions to generate follow up questions related to the thread.
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
        It should not be one of the following: ${categories.join(", ")}
      `
      ),
  };

  if (categories.length > 0) {
    const categoryNames = categories.map((c) => c.title);
    prompt += `

      <categories>
      ${categories.map((c) => `${c.title}: ${c.description}`).join("\n\n")}
      </categories>
    `;
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
      .optional()
      .describe(
        `
        The category of the answer.
        Give the category only if it is a perfect match for the category description.
        Don't give the category if it is not a perfect match.
      `
      );
  }

  const llmConfig = getConfig("gpt_5");

  const agent = new SimpleAgent({
    id: "analyser",
    prompt,
    schema: z.object(schema),
    ...llmConfig,
    user: scrapeId,
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

  console.log("=== content ===");
  console.log(content);
  console.log("===");

  return JSON.parse(content as string) as {
    questionSentiment: QuestionSentiment;
    shortQuestion: string;
    followUpQuestions: string[];
    category: { title: string; score: number } | null;
    categorySuggestions: { title: string; description: string }[];
  };
}

function shouldCheckForDataGap(sources: MessageSourceLink[]) {
  const avgScore =
    sources.reduce((acc, s) => acc + (s.score ?? 0), 0) / sources.length;
  return avgScore <= MAX_ANSWER_SCORE;
}

export async function fillMessageAnalysis(
  messageId: string,
  questionMessageId: string,
  question: string,
  answer: string,
  sources: MessageSourceLink[],
  context: string[],
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

    const partialAnalysis = await analyseMessage(
      question,
      answer,
      recentQuestions,
      threadQuestions,
      options?.categories ?? [],
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
      dataGapTitle: null,
      dataGapDescription: null,
      category,
      dataGapDone: false,
      categorySuggestions: [],
    };

    const checkForDataGap = shouldCheckForDataGap(sources);

    if (checkForDataGap) {
      const questionRelevance = await getRelevantScore(
        await decomposeQuestion(question, message.scrapeId),
        message.scrape
      );
      analysis.questionRelevanceScore = questionRelevance.avg;

      if (questionRelevance.hit) {
        const dataGap = await getDataGap(question, context, message.scrapeId);
        if (dataGap.title && dataGap.description) {
          analysis.dataGapTitle = dataGap.title;
          analysis.dataGapDescription = dataGap.description;
        }
      }
    }

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

    if (analysis.dataGapTitle && analysis.dataGapDescription) {
      await fetch(`${process.env.FRONT_URL}/email-alert`, {
        method: "POST",
        body: JSON.stringify({
          intent: "data-gap-alert",
          messageId: messageId,
        }),
        headers: {
          Authorization: `Bearer ${createToken(message.scrape.userId)}`,
        },
      });
    }

    await consumeCredits(message.scrape.userId, "messages", 1);
  } catch (e) {
    console.error("Failed to analyse message", e);
  }
}
