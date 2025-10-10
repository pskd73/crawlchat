export async function query(
  scrapeId: string,
  messages: { role: string; content: string }[],
  token: string,
  options?: {
    prompt?: string;
  }
) {
  const result = await fetch(`${process.env.SERVER_HOST}/answer/${scrapeId}`, {
    method: "POST",
    body: JSON.stringify({
      messages,
      prompt: options?.prompt,
      channel: "slack",
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  let answer = null;
  let answerJson: any = {};
  let message = null;
  let error = null;

  if (result.status === 400) {
    console.log("Error", result.status);
    error = (await result.json()).message;
  } else {
    answerJson = await result.json();
    answer = answerJson.content;
    message = answerJson.message;
  }

  console.log({ answer, answerJson, error, message, status: result.status });

  return { answer, json: answerJson, error, message };
}

export async function learn(scrapeId: string, content: string, token: string) {
  const result = await fetch(
    `${process.env.SERVER_HOST}/resource/${scrapeId}`,
    {
      method: "POST",
      body: JSON.stringify({
        markdown: content,
        title: "From Slack",
        knowledgeGroupType: "learn_slack",
        defaultGroupTitle: "Slack learning",
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return result.json();
}
