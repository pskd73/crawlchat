import {
  MessageAnalysis,
  MessageSourceLink,
  prisma,
  QuestionSentiment,
} from "libs/prisma";
import { SimpleAgent } from "./agentic";
import { z } from "zod";
import { Flow } from "./flow";
import { getConfig } from "./config";

export async function analyseMessage(
  question: string,
  answer: string,
  sources: MessageSourceLink[],
  context: string
) {
  const agent = new SimpleAgent({
    id: "analyser",
    prompt: `
    You are a helpful assistant that analyses a message and returns a message analysis.
    You need to analyse the question, answer and the sources provided and give back the details provided.

    Question: ${question}
    Answer: ${answer}
    Sources: ${JSON.stringify(
      sources.map((s) => ({
        url: s.url,
        title: s.title,
        score: s.score,
        searchQuery: s.searchQuery,
      }))
    )}
    Context: ${context}
    `,
    schema: z.object({
      contextRelevanceScore: z.number().describe(`
          Given the context, answer and question, how relevant is the answer to the question?
          If there is no answer in the context, it should be 0 and vice versa.
          If the question is not mentioned in the context, it should be close to 0.
          If the answer says it has no answer, it should close to 0.
          It should be from 0 to 1.
        `),
      questionRelevanceScore: z.number().describe(
        `
          The relevance score of question to the context.
          It is about relevance but not about having answer or not.
          Only if the question is relevant to the context, it should be close to 1.
          It should be from 0 to 1.
          `
      ),
      questionSentiment: z.nativeEnum(QuestionSentiment).describe(
        `
          The sentiment of the question.
          It should be one of the following: ${Object.values(
            QuestionSentiment
          ).join(", ")}
        `
      ),
      dataGapTitle: z.string().describe(
        `
          Make a title for the data gap (if any). It should be under 10 words.
          It is used to represent the data gap from the sources for the given question.
        `
      ),
      dataGapDescription: z.string().describe(
        `
          Make a description for the data gap (if any). It should be in markdown format.
          It should explain the details to be filled for the data gap.
          Make it descriptive, mention topics to fill as bullet points.
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

  return JSON.parse(content as string) as MessageAnalysis;
}

function isDataGap(sources: MessageSourceLink[], analysis: MessageAnalysis) {
  const avgScore =
    sources.reduce((acc, s) => acc + (s.score ?? 0), 0) / sources.length;
  const contextRelevanceScore = Math.min(
    avgScore,
    analysis.contextRelevanceScore ?? 0
  );
  return (
    sources.length > 0 &&
    analysis.questionRelevanceScore !== null &&
    analysis.questionRelevanceScore >= 0.5 &&
    contextRelevanceScore !== null &&
    contextRelevanceScore <= 0.3 &&
    avgScore >= 0.01
  );
}

export async function fillMessageAnalysis(
  messageId: string,
  question: string,
  answer: string,
  sources: MessageSourceLink[],
  context: string
) {
  try {
    const analysis = await analyseMessage(question, answer, sources, context);

    if (analysis && !isDataGap(sources, analysis)) {
      analysis.dataGapTitle = null;
      analysis.dataGapDescription = null;
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
