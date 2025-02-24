import { Code, Heading, Stack, Text } from "@chakra-ui/react";
import { prisma } from "~/prisma";
import type { Route } from "./+types/scrape-embed";
import { getAuthUser } from "~/auth/middleware";

export async function loader({ params, request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrape = await prisma.scrape.findUnique({
    where: {
      id: params.id,
      userId: user!.id,
    },
  });

  return { scrape };
}

export default function ScrapeEmbed({ loaderData }: Route.ComponentProps) {
  return (
    <Stack maxW={"700px"} gap={6}>
      <Stack>
        <Heading>1. Script</Heading>
        <Text>
          First step in embedding the chat widget on your website is to add the{" "}
          <Code>script</Code> to your page. Add the following script to the{" "}
          <Code>head</Code> tag of your page.
        </Text>
        <pre>
          <Code>{`<script src="https://crawlchat.app/embed.js" id="crawlchat-script" data-id="${loaderData.scrape?.id}"></script>`}</Code>
        </pre>
      </Stack>

      <Stack>
        <Heading>2. Show & Hide</Heading>
        <Text>
          To show and hide the chat widget, you can use the following code:
        </Text>
        <pre>
          <Code>{`window.crawlchatEmbed.show();`}</Code>
        </pre>
        <pre>
          <Code>{`window.crawlchatEmbed.hide();`}</Code>
        </pre>
      </Stack>
    </Stack>
  );
}
