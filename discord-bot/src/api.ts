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
      channel: "discord",
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
  } else {
    answerJson = await result.json();
    answer = answerJson.content;
  }

  return { answer, json: answerJson, error };
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

  return result.json();
}

export async function getDiscordDetails(channelId: string) {
  const result = await fetch(`${process.env.SERVER_HOST}/discord/${channelId}`);
  const { scrapeId, userId, draftChannelIds, draftEmoji, draftDestinationChannelId } =
    await result.json();

  return {
    scrapeId,
    userId,
    draftChannelIds,
    draftEmoji,
    draftDestinationChannelId
  };
}

