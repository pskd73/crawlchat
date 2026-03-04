import { prisma } from "@packages/common/prisma";
import { redirect } from "react-router";
import type { Route } from "./+types/page";

export async function loader({ params }: Route.ComponentProps) {
  const { org, repo } = params;

  const user = await prisma.user.findFirstOrThrow({
    where: {
      email: "pramodkumar.damam73@gmail.com",
    },
  });

  let group = await prisma.knowledgeGroup.findFirst({
    where: {
      url: `https://github.com/${org}/${repo}`,
      type: "scrape_github",
    },
    include: {
      scrape: true,
    },
  });

  if (!group) {
    const newScrape = await prisma.scrape.create({
      data: {
        userId: user.id,
        status: "done",
        title: `${org}/${repo}`,
        widgetConfig: {
          size: "large",
        },
        indexer: "mars",
        llmModel: "openrouter/moonshotai/kimi-k2.5",
        chatPrompt: `You are a helpful assistant that can answer questions about the GitHub repository.
        Keep it simple and concise. Don't use headings a lot.
        `,
      },
    });

    await prisma.scrapeUser.create({
      data: {
        scrapeId: newScrape.id,
        userId: user.id,
        email: user.email,
        role: "owner",
      },
    });

    group = await prisma.knowledgeGroup.create({
      data: {
        scrapeId: newScrape.id,
        url: `https://github.com/${org}/${repo}`,
        type: "scrape_github",
        userId: user.id,
        status: "done",
      },
      include: {
        scrape: true,
      },
    });
  }

  throw redirect(`/w/${group.scrape.id}`);
}

export default function GithubChat() {
  return <div>Loading...</div>;
}
