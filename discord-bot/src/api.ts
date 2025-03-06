export async function query(scrapeId: string, query: string, token: string) {
  const result = await fetch(
    `${process.env.SERVER_HOST}/answer/${scrapeId}?query=${query}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const answerJson = await result.json();
  const answer = answerJson.message.llmMessage.content;

  return { answer, json: answerJson };
}

export async function learn(scrapeId: string, content: string, token: string) {
  const result = await fetch(
    `${process.env.SERVER_HOST}/resource/${scrapeId}`,
    {
      method: "POST",
      body: JSON.stringify({ markdown: content, title: "From Discord" }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return result.json();
}

export async function getDiscordDetails(channelId: string) {
  const result = await fetch(`${process.env.SERVER_HOST}/discord/${channelId}`);
  const { scrapeId, userId } = await result.json();

  return { scrapeId, userId };
}
