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

const MAX_ANSWER_SCORE = 0.5;
const MIN_RELEVANT_SCORE = 0.5;

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

  const hit = scores.some((s) => s >= MIN_RELEVANT_SCORE);

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
  answer: string,
  context: string[],
  scrapeId: string,
  knowledgeBaseContext?: {
    title?: string | null;
    chatPrompt?: string | null;
  }
) {
  const llmConfig = getConfig("gpt_5");

  const agent = new SimpleAgent({
    id: "data-gap-detector",
    prompt: `
    You are a helpful assistant that detects data gaps in the knowledge base for the question asked.
    
    A data gap occurs when:
    1. The question is relevant to the knowledge base topic
    2. The knowledge base does not contain sufficient information to properly answer the question
    3. The information may be completely missing or only partially available
    
    Your task is to identify what specific information is MISSING from the knowledge base that would be needed to properly answer this question.
    
    The context provided shows what information WAS found in the knowledge base. Compare this against what the question requires to identify the gaps.
    
    IMPORTANT: The data gap description must be relevant to the knowledge base's domain and topic. It should describe what information is missing in terms that are specific to this knowledge base's context and purpose.
    
    The data gap should be very specific and actionable, not generic.
    You may leave title and description empty if there is no meaningful data gap.
    `,
    schema: z.object({
      title: z.string({
        description: `
          Make a title for the data gap (if any). It should be under 10 words and clearly represent what information is missing.
          It should describe the gap in the knowledge base, not the question itself.
          The title should be relevant to the knowledge base's domain.
          Leave empty string if there is no meaningful data gap.
        `,
      }),
      description: z.string({
        description: `
          Make a description for the data gap (if any). It should be in markdown format.
          It should explain what specific information is missing from the knowledge base that would be needed to answer this question.
          The description MUST be relevant to the knowledge base's domain, topic, and context. Use terminology and concepts that align with the knowledge base's purpose.
          List the specific topics, details, or information that should be added to the knowledge base, framed in the context of the knowledge base's domain.
          Make it descriptive and actionable, mention topics to fill as bullet points (max 5 points).
          Leave empty string if there is no meaningful data gap.
        `,
      }),
    }),
    user: scrapeId,
    maxTokens: 4096,
    ...llmConfig,
  });

  const knowledgeBaseInfo = knowledgeBaseContext?.title
    ? `\n\n<knowledge-base-context>\nTitle: ${knowledgeBaseContext.title}${
        knowledgeBaseContext.chatPrompt
          ? `\nPurpose: ${knowledgeBaseContext.chatPrompt}`
          : ""
      }\n</knowledge-base-context>`
    : "";

  const flow = new Flow([agent], {
    messages: [
      {
        llmMessage: {
          role: "user",
          content: `
            <question>
            ${question}
            </question>
            
            <answer-provided>
            ${answer}
            </answer-provided>
            
            <context-from-knowledge-base>
            ${
              context.length > 0
                ? context.join("\n\n")
                : "No relevant context found in the knowledge base."
            }
            </context-from-knowledge-base>${knowledgeBaseInfo}
            
            Analyze what information is MISSING from the knowledge base that would be needed to properly answer this question.
            Consider what the question asks for versus what information is actually available in the knowledge base.
            
            When describing the data gap, ensure it is relevant to the knowledge base's domain and context. The description should use terminology and concepts that align with the knowledge base's purpose and topic.
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
        It should not be one of the following: ${categories.join(", ")}
      `
      ),
    resolved: z.boolean().describe(
      `
        This should be true if the user mentioned that their question is resolved.
        It should be true when user says, for example, "that works, ...", "it worked, ...", "that helped, ...".
        It should be true even if the user says it workd and asks follow up questions.
      `
    ),
    noInformation: z.boolean().describe(
      `
        This should be true if the user mentioned that they don't have any information, or if the answer contains phrases indicating lack of information.
        It should be true when user says, for example, "I don't have any information", "I don't know", "I don't have any information about that", etc.
        It should also be true if the answer contains phrases like "I don't have specific information", "I don't have specific information about that", etc.
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
    followUpQuestions: string[];
    category: { title: string; score: number } | null;
    categorySuggestions: { title: string; description: string }[];
    resolved: boolean;
    noInformation: boolean;
  };
}

function shouldCheckForDataGap(sources: MessageSourceLink[]) {
  if (sources.length === 0) {
    return true;
  }
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
      resolved: partialAnalysis?.resolved ?? false,
    };

    if (partialAnalysis?.noInformation) {
      const decomposedQuestions = await decomposeQuestion(
        question,
        message.scrapeId
      );

      if (decomposedQuestions && decomposedQuestions.length > 0) {
        const questionRelevance = await getRelevantScore(
          decomposedQuestions,
          message.scrape
        );
        analysis.questionRelevanceScore = questionRelevance.avg;

        if (questionRelevance.hit) {
          const dataGap = await getDataGap(
            question,
            answer,
            context,
            message.scrapeId,
            {
              title: message.scrape.title,
              chatPrompt: message.scrape.chatPrompt,
            }
          );
          if (
            dataGap.title &&
            dataGap.description &&
            dataGap.title.trim() &&
            dataGap.description.trim()
          ) {
            analysis.dataGapTitle = dataGap.title;
            analysis.dataGapDescription = dataGap.description;

            console.log("Added data gap");
          }
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
