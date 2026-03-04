import { MultimodalContent } from "@packages/common/llm-message";

export async function query(
  scrapeId: string,
  messages: { role: string; content: string | MultimodalContent[] }[],
  token: string,
  options?: {
    prompt?: string;
    clientThreadId?: string;
    fingerprint?: string;
  }
) {
  const result = await fetch(`${process.env.SERVER_HOST}/answer/${scrapeId}`, {
    method: "POST",
    body: JSON.stringify({
      messages,
      prompt: options?.prompt,
      channel: "discord",
      clientThreadId: options?.clientThreadId,
      fingerprint: options?.fingerprint,
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  let answer = null;
  let answerJson: any = {};
  let error = null;

  if (result.status === 400) {
    error = (await result.json()).message;
  } else if (result.status !== 200) {
    console.error(await result.text());
    error = `Unknown error: ${result.status}`;
  } else {
    answerJson = await result.json();
    answer = answerJson.content;
  }

  return { answer, json: answerJson, error, message: answerJson.message };
}

export async function learn(scrapeId: string, content: string, token: string) {
  const result = await fetch(
    `${process.env.SERVER_HOST}/resource/${scrapeId}`,
    {
      method: "POST",
      body: JSON.stringify({
        markdown: content,
        title: "From Discord",
        knowledgeGroupType: "learn_discord",
        defaultGroupTitle: "Discord learning",
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!result.ok) {
    throw new Error(await result.text());
  }

  return result.json();
}
