import {
  Code,
  createListCollection,
  Heading,
  Stack,
  Text,
} from "@chakra-ui/react";
import { prisma } from "~/prisma";
import type { Route } from "./+types/scrape-embed";
import { getAuthUser } from "~/auth/middleware";
import { SettingsSection } from "~/dashboard/settings";
import { useFetcher } from "react-router";
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "~/components/ui/select";
import type { Prisma, WidgetSize } from "@prisma/client";

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

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrape = await prisma.scrape.findUnique({
    where: {
      id: params.id,
      userId: user!.id,
    },
  });

  if (!scrape) {
    throw new Response("Not found", { status: 404 });
  }

  const formData = await request.formData();
  const size = formData.get("size");

  if (size) {
    await prisma.scrape.update({
      where: {
        id: scrape.id,
      },
      data: {
        widgetConfig: {
          size: size as WidgetSize,
        },
      },
    });
  }

  return null;
}

const sizes = createListCollection({
  items: [
    { label: "Small", value: "small" },
    { label: "Large", value: "large" },
    { label: "Full Screen", value: "full_screen" },
  ],
});

export default function ScrapeEmbed({ loaderData }: Route.ComponentProps) {
  const sizeFetcher = useFetcher();

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
          <Code
            as="pre"
            whiteSpace="pre-wrap"
            wordBreak="break-word"
            overflowX="auto"
            p={4}
          >{`<script src="https://crawlchat.app/embed.js" id="crawlchat-script" data-id="${loaderData.scrape?.id}"></script>`}</Code>
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

      <Stack>
        <SettingsSection
          title="Widget size"
          description="Set the size of the widget to be when it's embedded on your website"
          fetcher={sizeFetcher}
        >
          <SelectRoot
            collection={sizes}
            maxW="320px"
            name="size"
            defaultValue={[loaderData.scrape?.widgetConfig?.size ?? "small"]}
          >
            <SelectTrigger>
              <SelectValueText placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {sizes.items.map((size) => (
                <SelectItem item={size} key={size.value}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectRoot>
        </SettingsSection>
      </Stack>
    </Stack>
  );
}
