import {
  Input,
  Stack,
  Group,
  RadioCard,
  HStack,
  Icon,
  Checkbox,
  Text,
  FileUpload as ChakraFileUpload,
  IconButton,
  Box,
} from "@chakra-ui/react";
import {
  TbBook2,
  TbBrandGithub,
  TbCheck,
  TbTrash,
  TbUpload,
  TbWorld,
} from "react-icons/tb";
import { SiDocusaurus } from "react-icons/si";
import { redirect, useFetcher } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { Page } from "~/components/page";
import { Button } from "~/components/ui/button";
import { Field } from "~/components/ui/field";
import { createToken } from "~/jwt";
import type { Route } from "./+types/new-group";
import { useEffect, useMemo, useState } from "react";
import { prisma } from "~/prisma";
import { getSessionScrapeId } from "~/scrapes/util";
import type { KnowledgeGroupStatus, KnowledgeGroupType } from "libs/prisma";
import { type FileUpload, parseFormData } from "@mjackson/form-data-parser";
import { toaster } from "~/components/ui/toaster";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);

  const scrapes = await prisma.scrape.findMany({
    where: {
      userId: user!.id,
    },
  });

  return {
    token: createToken(user!.id),
    scrapes,
  };
}

export async function action({ request }: { request: Request }) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);

  const fileMarkdowns: { markdown: string; title: string }[] = [];

  const uploadHandler = async (fileUpload: FileUpload) => {
    const arrayBuffer = await fileUpload.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    const response = await fetch(`${process.env.MARKER_HOST}/mark`, {
      method: "POST",
      body: JSON.stringify({
        base64,
      }),
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env.MARKER_API_KEY as string,
      },
    });

    const data = await response.json();
    fileMarkdowns.push({ markdown: data.markdown, title: fileUpload.name });
  };

  const formData = await parseFormData(request, uploadHandler);

  const scrape = await prisma.scrape.findUniqueOrThrow({
    where: { id: scrapeId as string, userId: user!.id },
  });

  if (request.method === "POST") {
    let url = formData.get("url") as string;
    let maxLinks = formData.get("maxLinks");
    let allowOnlyRegex = formData.get("allowOnlyRegex");
    let removeHtmlTags = formData.get("removeHtmlTags");
    let skipPageRegex = formData.get("skipPageRegex") as string;
    let subType = formData.get("subType") as string;

    let type = formData.get("type") as string;
    let githubRepoUrl = formData.get("githubRepoUrl");
    let githubBranch = formData.get("githubBranch");
    let prefix = formData.get("prefix");
    let title = formData.get("title") as string;

    if (type === "scrape_github") {
      if (!githubRepoUrl) {
        return { error: "GitHub Repo URL is required" };
      }

      if (!githubBranch) {
        return { error: "Branch name is required" };
      }

      url = `${githubRepoUrl}/tree/${githubBranch}`;
      allowOnlyRegex = "https://github.com/[^/]+/[^/]+/(tree|blob)/main.*";
      const removeSelectors = [".react-line-number", "#repos-file-tree"];
      removeHtmlTags = removeSelectors.join(",");
      maxLinks = "100";
    }

    if (type === "github_issues") {
      url = githubRepoUrl as string;
    }

    if (!url) {
      return { error: "URL is required" };
    }

    if (prefix === "on") {
      allowOnlyRegex = `^${url.replace(/\/$/, "")}.*`;
    }

    if (type === "docusaurus") {
      type = "scrape_web";
    }

    if (formData.has("versionsToSkip")) {
      const value = formData.get("versionsToSkip") as string;
      skipPageRegex += `,${value
        .split(",")
        .map((v) => v.trim())
        .map((v) => "/docs/" + v)
        .join(",")}`;
    }

    let status: KnowledgeGroupStatus = "pending";

    if (type === "upload") {
      status = "done";
    }

    const group = await prisma.knowledgeGroup.create({
      data: {
        scrapeId: scrape.id,
        userId: user!.id,
        type: type as KnowledgeGroupType,
        status,

        title,

        url,
        matchPrefix: prefix === "on",
        removeHtmlTags: removeHtmlTags as string,
        maxPages: 5000,
        staticContentThresholdLength: 100,

        skipPageRegex,
        subType,

        githubBranch: githubBranch as string,
        githubUrl: githubRepoUrl as string,
      },
    });

    if (type === "upload") {
      for (const file of fileMarkdowns) {
        await fetch(`${process.env.VITE_SERVER_URL}/resource/${scrape.id}`, {
          method: "POST",
          body: JSON.stringify({
            markdown: file.markdown,
            title: file.title,
            knowledgeGroupType: "upload",
            defaultGroupTitle: "Upload",
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${createToken(user!.id)}`,
          },
        });
      }
    }

    throw redirect(`/knowledge/group/${group.id}`);
  }
}

export default function NewScrape({ loaderData }: Route.ComponentProps) {
  const scrapeFetcher = useFetcher();

  const types = useMemo(
    function () {
      return [
        {
          title: "Web",
          value: "scrape_web",
          description: "Scrape a website",
          icon: <TbWorld />,
          longDescription:
            "Scrapes the provided URL and children links it finds and turns them into the knowledge. It can also fetch dynamic content (Javascript based).",
        },
        {
          title: "Docusaurus based",
          value: "docusaurus",
          description: "Fetch Docusaurus based docs",
          icon: <SiDocusaurus />,
          longDescription:
            "Scrapes the Docusaurus based docs from the provided URL and turns them into the knowledge. It sets all required settings tailored for Docusaurus.",
        },
        {
          title: "GitHub Repo",
          value: "scrape_github",
          description: "Scrape a GitHub repository",
          icon: <TbBrandGithub />,
          longDescription:
            "Scrapes the provided GitHub repository, reads the code from all the files and turns them into the knowledge.",
        },
        {
          title: "GitHub Issues",
          value: "github_issues",
          description: "Fetch GitHub issues",
          icon: <TbBrandGithub />,
          longDescription:
            "Fetch GitHub issues from the provided repository and turns them into the knowledge. The repository must be public (for now).",
        },
        {
          title: "Upload",
          value: "upload",
          description: "Upload a file. Supports pdf, docx, pptx",
          icon: <TbUpload />,
          longDescription: "Upload a file as the knowledge base",
        },
      ];
    },
    [loaderData.scrapes]
  );
  const [type, setType] = useState<string>("scrape_web");

  useEffect(() => {
    if (scrapeFetcher.data?.error) {
      toaster.error({
        title: "Error",
        description:
          scrapeFetcher.data.error ??
          scrapeFetcher.data.message ??
          "Unknown error",
      });
    }
  }, [scrapeFetcher.data]);

  function getDescription(type: string) {
    return types.find((t) => t.value === type)?.longDescription;
  }

  return (
    <Page title="New knowledge group" icon={<TbBook2 />}>
      <Stack maxW={"1200px"} w={"full"}>
        <scrapeFetcher.Form method="post" encType="multipart/form-data">
          <Stack gap={4}>
            <RadioCard.Root
              name="type"
              value={type}
              onValueChange={(value) =>
                setType(value.value as KnowledgeGroupType)
              }
            >
              <HStack align="stretch">
                {types.map((item) => (
                  <RadioCard.Item key={item.value} value={item.value}>
                    <RadioCard.ItemHiddenInput />
                    <RadioCard.ItemControl>
                      <RadioCard.ItemContent>
                        <Icon fontSize="2xl" color="fg.muted" mb="2">
                          {item.icon}
                        </Icon>
                        <RadioCard.ItemText>{item.title}</RadioCard.ItemText>
                        <RadioCard.ItemDescription>
                          {item.description}
                        </RadioCard.ItemDescription>
                      </RadioCard.ItemContent>
                      <RadioCard.ItemIndicator />
                    </RadioCard.ItemControl>
                  </RadioCard.Item>
                ))}
              </HStack>
            </RadioCard.Root>

            <Text opacity={0.5}>{getDescription(type)}</Text>

            <Field label="Name" required>
              <Input
                required
                placeholder="Ex: Documentation"
                name="title"
                disabled={scrapeFetcher.state !== "idle"}
              />
            </Field>

            {type === "scrape_web" && (
              <>
                <Field label="URL" required>
                  <Input
                    required
                    pattern="^https?://.+"
                    placeholder="https://example.com"
                    name="url"
                    disabled={scrapeFetcher.state !== "idle"}
                  />
                </Field>

                <Checkbox.Root name="prefix" defaultChecked>
                  <Checkbox.HiddenInput />
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Label>Match exact prefix</Checkbox.Label>
                </Checkbox.Root>
              </>
            )}

            {type === "upload" && (
              <>
                <input type="hidden" name="url" value="file" />
                <ChakraFileUpload.Root
                  maxFiles={5}
                  maxFileSize={1024 * 1024 * 10}
                  w="full"
                  disabled={scrapeFetcher.state !== "idle"}
                  accept={[
                    "application/pdf",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "application/vnd.ms-powerpoint",
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                  ]}
                >
                  <ChakraFileUpload.HiddenInput name="file" required />
                  <ChakraFileUpload.Dropzone w="full">
                    <Icon size="md" color="fg.muted">
                      <TbUpload />
                    </Icon>
                    <ChakraFileUpload.DropzoneContent>
                      <Box>Drag and drop files here</Box>
                      <Box color="fg.muted">.pdf, .docx, .pptx up to 5MB</Box>
                    </ChakraFileUpload.DropzoneContent>
                  </ChakraFileUpload.Dropzone>
                  <ChakraFileUpload.ItemGroup>
                    <ChakraFileUpload.Context>
                      {({ acceptedFiles }) =>
                        acceptedFiles.map((file, i) => (
                          <ChakraFileUpload.Item
                            key={i}
                            file={file}
                            justifyContent={"space-between"}
                          >
                            <Group>
                              <ChakraFileUpload.ItemName />
                              <ChakraFileUpload.ItemSizeText />
                            </Group>
                            <Group>
                              <ChakraFileUpload.ItemDeleteTrigger asChild>
                                <IconButton variant="outline" size="sm">
                                  <TbTrash />
                                </IconButton>
                              </ChakraFileUpload.ItemDeleteTrigger>
                            </Group>
                          </ChakraFileUpload.Item>
                        ))
                      }
                    </ChakraFileUpload.Context>
                  </ChakraFileUpload.ItemGroup>
                </ChakraFileUpload.Root>
              </>
            )}

            {type === "docusaurus" && (
              <>
                <Field label="Docs URL" required>
                  <Input
                    required
                    pattern="^https?://.+"
                    placeholder="https://example.com/docs"
                    name="url"
                    disabled={scrapeFetcher.state !== "idle"}
                  />
                </Field>
                <Field label="Versions to skip">
                  <Input
                    placeholder="Ex: 1.0.0, 1.1.0, 2.x"
                    name="versionsToSkip"
                    disabled={scrapeFetcher.state !== "idle"}
                  />
                </Field>
                <input
                  type="hidden"
                  name="removeHtmlTags"
                  value="nav,aside,footer,header,.theme-announcement-bar"
                />
                <input type="hidden" name="prefix" value="on" />
                <input
                  type="hidden"
                  name="skipPageRegex"
                  value="/docs/[0-9x]+\.[0-9x]+\.[0-9x]+,/docs/next"
                />
                <input type="hidden" name="subType" value="docusaurus" />
              </>
            )}

            {type === "scrape_github" && (
              <>
                <Group gap={4}>
                  <Field label="GitHub Repo URL" required>
                    <Input
                      name="githubRepoUrl"
                      placeholder="https://github.com/user/repo"
                      pattern="^https://github.com/.+$"
                      required
                    />
                  </Field>

                  <Field label="Branch name" required defaultValue={"main"}>
                    <Input name="githubBranch" placeholder="main" />
                  </Field>
                </Group>
              </>
            )}

            {type === "github_issues" && (
              <>
                <Field label="GitHub Repo URL" required>
                  <Input
                    name="githubRepoUrl"
                    placeholder="https://github.com/user/repo"
                    pattern="^https://github.com/.+$"
                    required
                  />
                </Field>
              </>
            )}

            <Group justifyContent={"flex-end"}>
              <Button
                type="submit"
                loading={scrapeFetcher.state !== "idle"}
                colorPalette={"brand"}
              >
                Create
                <TbCheck />
              </Button>
            </Group>
          </Stack>
        </scrapeFetcher.Form>
      </Stack>
    </Page>
  );
}
