import type { Route } from "./+types/settings";
import type { LlmModel, Prisma, Scrape, User } from "libs/prisma";
import { redirect, useFetcher } from "react-router";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/settings-section";
import { prisma } from "~/prisma";
import { getAuthUser } from "~/auth/middleware";
import {
  TbBolt,
  TbBrain,
  TbCrown,
  TbLock,
  TbPhotoX,
  TbSettings,
  TbStar,
  TbTrash,
  TbWorld,
} from "react-icons/tb";
import { Page } from "~/components/page";
import { useEffect, useState } from "react";
import { authoriseScrapeUser, getSessionScrapeId } from "./util";
import { createToken } from "libs/jwt";
import { RadioCard } from "~/components/radio-card";
import { DataList } from "~/components/data-list";
import toast from "react-hot-toast";
import cn from "@meltdownjs/cn";
import moment from "moment";
import { makeMeta } from "~/meta";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const scrape = await prisma.scrape.findUnique({
    where: { id: scrapeId },
    include: {
      user: true,
    },
  });

  if (!scrape) {
    throw new Response("Not found", { status: 404 });
  }

  return { scrape, user: user! };
}

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: "Settings - CrawlChat",
  });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();

  if (request.method === "DELETE") {
    authoriseScrapeUser(user!.scrapeUsers, scrapeId, ["owner"]);

    await fetch(`${process.env.VITE_SERVER_URL}/scrape`, {
      method: "DELETE",
      body: JSON.stringify({ scrapeId }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${createToken(user!.id)}`,
      },
    });
    await prisma.scrape.delete({
      where: { id: scrapeId },
    });
    throw redirect("/app");
  }

  const chatPrompt = formData.get("chatPrompt") as string | null;
  const title = formData.get("title") as string | null;

  const update: Prisma.ScrapeUpdateInput = {};
  if (chatPrompt) {
    update.chatPrompt = chatPrompt;
  }
  if (title) {
    update.title = title;
  }
  if (formData.has("llmModel")) {
    update.llmModel = formData.get("llmModel") as LlmModel;
  }
  if (formData.has("logoUrl")) {
    update.logoUrl = formData.get("logoUrl") as string;
  }
  if (formData.has("from-ticketing-enabled")) {
    update.ticketingEnabled = formData.get("ticketing") === "on";
  }
  if (formData.has("minScore")) {
    update.minScore = parseFloat(formData.get("minScore") as string);
  }
  if (formData.has("slug")) {
    const slug = formData.get("slug") as string;
    const existing = await prisma.scrape.findFirst({
      where: { slug },
    });
    if (existing && existing.id !== scrapeId) {
      return { error: "Slug already exists" };
    }
    update.slug = slug;
  }
  if (formData.has("from-show-sources")) {
    update.showSources = formData.get("showSources") === "on";
  }
  if (formData.has("from-analyse-message")) {
    update.analyseMessage = formData.get("analyseMessage") === "on";
  }
  if (formData.has("visibility-type")) {
    update.private = formData.get("visibility-type") === "private";
  }

  const scrape = await prisma.scrape.update({
    where: { id: scrapeId },
    data: update,
  });

  return { scrape };
}

function TicketingSettings({ scrape }: { scrape: Scrape }) {
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.data) {
      window.location.reload();
    }
  }, [fetcher.data]);

  return (
    <SettingsSection
      id="resolved-enquiry"
      title="Support tickets"
      description="Enable the support tickets for this collection to start receiving support tickets either when the AI has no answer for a given question or the user choses to create a ticket."
      fetcher={fetcher}
    >
      <input type="hidden" name="from-ticketing-enabled" value={"true"} />
      <label className="label">
        <input
          type="checkbox"
          className="toggle"
          name="ticketing"
          defaultChecked={scrape.ticketingEnabled ?? false}
        />
        Active
      </label>
    </SettingsSection>
  );
}

function AiModelSettings({ scrape, user }: { scrape: Scrape; user: User }) {
  const modelFetcher = useFetcher();
  const [selectedModel, setSelectedModel] = useState<LlmModel>(
    scrape.llmModel ?? "gpt_4o_mini"
  );

  function isAllowed(plans: string[]) {
    if (plans.includes("free")) {
      return true;
    }

    return plans.some((plan) => user.plan?.planId === plan);
  }

  return (
    <SettingsSection
      id="ai-model"
      title="AI Model"
      description="Select the AI model to use for the messages across channels."
      fetcher={modelFetcher}
    >
      <RadioCard
        cols={2}
        options={[
          {
            label: "OpenAI 4o-mini",
            value: "gpt_4o_mini",

            description: "Base model, not for production.",
            summary: "1 credit / message",
            disabled: !isAllowed(["free", "starter", "pro"]),
            content: (
              <div className="badge badge-accent badge-soft">
                <TbBolt /> Fast
              </div>
            ),
          },
          // {
          //   label: "Gemini 2.5 Flash",
          //   value: "gemini_2_5_flash",
          //   description: "Best for most of the use cases.",
          //   summary: "1 credit / message",
          //   disabled: !isAllowed(["free", "starter", "pro"]),
          //   content: (
          //     <>
          //       <div className="badge badge-accent badge-soft">
          //         <TbBolt /> Fast
          //       </div>
          //       <div className="badge badge-secondary badge-soft">
          //         <TbPhotoX /> Can't take images
          //       </div>
          //     </>
          //   ),
          // },
          {
            label: "OpenAI GPT 5-nano",
            value: "gpt_5_nano",

            description: "Better than 4o-mini, fast, can take more context.",
            summary: "1 credit / message",
            disabled: !isAllowed(["hobby", "starter", "pro"]),
            content: (
              <div className="flex gap-2">
                <div className="badge badge-accent badge-soft">
                  <TbBrain /> Smart + Fast
                </div>
                <div className="badge badge-soft badge-primary">
                  <TbCrown /> Hobby
                </div>
              </div>
            ),
          },
          {
            label: "OpenAI o4-mini",
            value: "o4_mini",

            description:
              "Best for complex use cases, programming docs, better searches.",
            summary: "2 credits / message",
            disabled: !isAllowed(["hobby", "starter", "pro"]),
            content: (
              <div className="flex gap-2">
                <div className="badge badge-accent badge-soft">
                  <TbBrain /> Reason
                </div>
                <div className="badge badge-soft badge-primary">
                  <TbCrown /> Hobby
                </div>
              </div>
            ),
          },
          {
            label: "OpenAI GPT 5",
            value: "gpt_5",

            description:
              "Best for complex use cases, programming docs, better searches.",
            summary: "2 credits / message",
            disabled: !isAllowed(["pro"]),
            content: (
              <div className="flex gap-2">
                <div className="badge badge-accent badge-soft">
                  <TbStar /> Takes time & Best
                </div>
                <div className="badge badge-soft badge-primary">
                  <TbCrown /> Pro
                </div>
              </div>
            ),
          },
          {
            label: "Claude Sonnet 4.5",
            value: "sonnet_4_5",

            description:
              "Best for technical use cases, programming docs. Can take more context.",
            summary: "4 credits / message",
            disabled: !isAllowed(["pro"]),
            content: (
              <div className="flex gap-2">
                <div className="badge badge-accent badge-soft">
                  <TbStar /> Fast & Best
                </div>
                <div className="badge badge-soft badge-primary">
                  <TbCrown /> Pro
                </div>
              </div>
            ),
          },
        ]}
        name="llmModel"
        value={selectedModel}
        onChange={(value) => setSelectedModel(value as LlmModel)}
      />
    </SettingsSection>
  );
}

function ShowSourcesSetting({ scrape, user }: { scrape: Scrape; user: User }) {
  const showSourcesFetcher = useFetcher();

  function isAllowed() {
    return ["starter", "pro"].includes(user.plan?.planId ?? "free");
  }

  return (
    <SettingsSection
      id="show-sources"
      title="Show sources"
      description="Show the sources that the chatbot used from the knowledge base. It will be visible on the chat widget under every answer and on Discord/Slack messages."
      fetcher={showSourcesFetcher}
    >
      <div className="flex gap-2">
        <input type="hidden" name="from-show-sources" value={"true"} />
        <label className="label">
          <input
            name="showSources"
            defaultChecked={scrape.showSources ?? false}
            disabled={!isAllowed()}
            type="checkbox"
            className="toggle"
          />
          Active
        </label>
        <div className="badge badge-soft badge-primary">
          <TbCrown /> Starter
        </div>
      </div>
    </SettingsSection>
  );
}

function AnalyseMessageSettings({
  scrape,
  user,
}: {
  scrape: Scrape;
  user: User;
}) {
  const fetcher = useFetcher();

  function isAllowed() {
    return ["starter", "pro"].includes(user.plan?.planId ?? "free");
  }

  return (
    <SettingsSection
      id="data-gap-analysis"
      title="Data gap & analysis"
      description="Enable this to analyze the answer given by the AI and find out if there is any data gap in the knowledge base. It also analyzes more details from the question such as the sentiment, category and more. It uses one message credit per question."
      fetcher={fetcher}
    >
      <div className="flex gap-2">
        <input type="hidden" name="from-analyse-message" value={"true"} />
        <label className="label">
          <input
            type="checkbox"
            className="toggle"
            name="analyseMessage"
            defaultChecked={scrape.analyseMessage ?? false}
            disabled={!isAllowed()}
          />
          Active
        </label>
        <div className="badge badge-soft badge-primary">
          <TbCrown /> Starter
        </div>
      </div>
    </SettingsSection>
  );
}

export default function ScrapeSettings({ loaderData }: Route.ComponentProps) {
  const promptFetcher = useFetcher();
  const nameFetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const minScoreFetcher = useFetcher();
  const slugFetcher = useFetcher();
  const privateFetcher = useFetcher();

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [minScore, setMinScore] = useState(loaderData.scrape.minScore ?? 0);
  const [_private, setPrivate] = useState(loaderData.scrape.private ?? false);

  useEffect(() => {
    if (deleteConfirm) {
      setTimeout(() => {
        setDeleteConfirm(false);
      }, 5000);
    }
  }, [deleteConfirm]);

  useEffect(() => {
    if (slugFetcher.data?.error) {
      toast.error(slugFetcher.data.error);
    }
  }, [slugFetcher.data?.error]);

  function handleDelete() {
    if (!deleteConfirm) {
      return setDeleteConfirm(true);
    }

    deleteFetcher.submit(null, {
      method: "delete",
    });
  }

  return (
    <Page title="Settings" icon={<TbSettings />}>
      <SettingsSectionProvider>
        <SettingsContainer>
          <DataList
            data={[
              {
                label: "Created",
                value: moment(loaderData.scrape.createdAt).fromNow(),
              },
              {
                label: "Id",
                value: loaderData.scrape.id,
              },
            ]}
          />

          <SettingsSection
            id="name"
            title="Name"
            description="Give it a name. It will be shown on chat screen."
            fetcher={nameFetcher}
          >
            <input
              type="text"
              className="input max-w-sm"
              name="title"
              defaultValue={loaderData.scrape.title ?? ""}
              placeholder="Enter a name for this scrape."
            />
          </SettingsSection>

          <SettingsSection
            id="slug"
            title="Slug"
            description="Give it a slug and you can use it in the URL to access the chatbot. Should be 4-16 characters long and can only contain lowercase letters, numbers, and hyphens."
            fetcher={slugFetcher}
          >
            <input
              type="text"
              className="input max-w-sm"
              name="slug"
              defaultValue={loaderData.scrape.slug ?? ""}
              placeholder="Ex: remotion"
              pattern="^[a-z0-9\-]{4,32}$"
              required
            />
          </SettingsSection>

          <SettingsSection
            id="visibility-type"
            title="Visibility type"
            description="Configure if the bot is public or private."
            fetcher={privateFetcher}
          >
            <input
              type="hidden"
              name="visibility-type"
              value={_private ? "private" : "public"}
            />
            <RadioCard
              options={[
                {
                  label: "Public",
                  value: "public",
                  icon: <TbWorld />,
                  description:
                    "It will be public bot and anyone can chat with it.",
                },
                {
                  label: "Private",
                  value: "private",
                  icon: <TbLock />,
                  description:
                    "It will be private bot and only work with Discrod and Slack bots and team members.",
                },
              ]}
              value={_private ? "private" : "public"}
              onChange={(value) => setPrivate(value === "private")}
            />
          </SettingsSection>

          <SettingsSection
            id="prompt"
            title="Chat Prompt"
            description="Customize the chat prompt for this scrape."
            fetcher={promptFetcher}
          >
            <textarea
              className="textarea textarea-bordered w-full"
              name="chatPrompt"
              defaultValue={loaderData.scrape.chatPrompt ?? ""}
              placeholder="Enter a custom chat prompt for this scrape."
              rows={5}
            />
          </SettingsSection>

          <TicketingSettings scrape={loaderData.scrape} />

          <SettingsSection
            id="min-score"
            title="Min score"
            description="Configure the minimum score (relevance score) required for the knowledge base to have to be considered for a question. If it is too high, it will not be able to answer questions as much. If it is too low, it will answer questions that are not relevant."
            fetcher={minScoreFetcher}
          >
            <div className="flex gap-2">
              <input
                type="range"
                min={0}
                max="1"
                defaultValue={minScore}
                className="range"
                step={0.01}
                onChange={(e) => setMinScore(parseFloat(e.target.value))}
                name="minScore"
              />
              <div className="badge badge-lg badge-soft badge-primary">
                {minScore}
              </div>
            </div>
          </SettingsSection>

          <AiModelSettings
            scrape={loaderData.scrape}
            user={loaderData.scrape.user}
          />

          <AnalyseMessageSettings
            scrape={loaderData.scrape}
            user={loaderData.scrape.user}
          />

          <ShowSourcesSetting
            scrape={loaderData.scrape}
            user={loaderData.scrape.user}
          />

          <SettingsSection
            id="delete-collection"
            title="Delete collection"
            description="This will delete the collection and all the messages, knowledge base, and the other data that is associated with it. This is not reversible."
            danger
            actionRight={
              <button
                className={cn("btn btn-error")}
                onClick={handleDelete}
                disabled={deleteFetcher.state !== "idle"}
              >
                {deleteFetcher.state === "submitting" && (
                  <span className="loading loading-spinner loading-sm" />
                )}
                {deleteConfirm ? "Sure to delete?" : "Delete"}
                <TbTrash />
              </button>
            }
          />
        </SettingsContainer>
      </SettingsSectionProvider>
    </Page>
  );
}
