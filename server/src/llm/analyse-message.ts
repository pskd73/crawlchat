import {
  Message,
  MessageAnalysis,
  MessageSourceLink,
  prisma,
  QuestionSentiment,
  Scrape,
} from "libs/prisma";
import { SimpleAgent } from "./agentic";
import { z } from "zod";
import { Flow } from "./flow";
import { makeIndexer } from "../indexer/factory";
import { getConfig } from "./config";

const friction = {
  low: {
    questionRelevanceScore: 0.1,
    contextRelevanceScore: 0.5,
  },
  medium: {
    questionRelevanceScore: 0.2,
    contextRelevanceScore: 0.4,
  },
  high: {
    questionRelevanceScore: 0.3,
    contextRelevanceScore: 0.3,
  },
};

export async function decomposeQuestion(question: string) {
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

  console.log("decomposed questions", content);

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
  const avg = scores.reduce((acc, s) => acc + s, 0) / scores.length;
  const max = Math.max(...scores);

  const halfMax = scores
    .sort((a, b) => b - a)
    .splice(0, Math.floor(scores.length / 2));
  const halfMaxavg = halfMax.reduce((acc, s) => acc + s, 0) / halfMax.length;
  const result = {
    avg,
    scores,
    max,
    halfMax,
    halfMaxavg,
  };
  console.log("scores", result);
  return result;
}

async function getDataGap(question: string, answer: string) {
  const llmConfig = getConfig("gpt_5");

  const agent = new SimpleAgent({
    id: "data-gap-detector",
    prompt: `
    You are a helpful assistant that detects data gaps in the answer provided for the question.
    You may leave title and description empty if there is no data gap.
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
            
            <answer>
            ${answer}
            </answer>
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

export async function analyseMessage(question: string, answer: string) {
  const agent = new SimpleAgent({
    id: "analyser",
    prompt: `
    You are a helpful assistant that analyses a message and returns a message analysis.
    You need to analyse the question, answer and the sources provided and give back the details provided.

    <question>
    ${question}
    </question>

    <answer>
    ${answer}
    </answer>
    `,
    schema: z.object({
      questionSentiment: z.nativeEnum(QuestionSentiment).describe(
        `
          The sentiment of the question.
          It should be one of the following: ${Object.values(
            QuestionSentiment
          ).join(", ")}
        `
      ),
    }),
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
    dataGapTitle: string;
    dataGapDescription: string;
  };
}

function shouldCheckForDataGap(sources: MessageSourceLink[]) {
  const frictionLevel = friction["high"];
  const avgScore =
    sources.reduce((acc, s) => acc + (s.score ?? 0), 0) / sources.length;
  return avgScore <= frictionLevel.contextRelevanceScore;
}

function isDataGap(questionRelevanceScore: number) {
  const frictionLevel = friction["high"];

  return questionRelevanceScore >= frictionLevel.questionRelevanceScore;
}

export async function fillMessageAnalysis(
  messageId: string,
  question: string,
  answer: string,
  sources: MessageSourceLink[]
) {
  try {
    const message = await prisma.message.findFirstOrThrow({
      where: { id: messageId },
      include: {
        scrape: true,
      },
    });

    if (!message.scrape.analyseMessage) {
      return;
    }

    const partialAnalysis = await analyseMessage(question, answer);
    const analysis: MessageAnalysis = {
      questionRelevanceScore: null,
      questionSentiment: partialAnalysis?.questionSentiment ?? null,
      dataGapTitle: null,
      dataGapDescription: null,
      category: null,
      dataGapDone: false,
    };

    const checkForDataGap = shouldCheckForDataGap(sources);

    if (checkForDataGap) {
      const questionRelevanceScore = await getRelevantScore(
        await decomposeQuestion(question),
        message.scrape
      );

      const dataGap = isDataGap(questionRelevanceScore.halfMaxavg);

      if (dataGap) {
        const dataGap = await getDataGap(question, answer);
        if (dataGap.title && dataGap.description) {
          analysis.dataGapTitle = dataGap.title;
          analysis.dataGapDescription = dataGap.description;
        }
      }

      console.log({ dataGap, analysis });
    }

    await prisma.message.update({
      where: { id: messageId },
      data: {
        analysis,
      },
    });
  } catch (e) {
    console.error("Failed to analyse message", e);
  }
}
