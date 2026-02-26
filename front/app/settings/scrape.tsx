import type { Route } from "./+types/scrape";
import type {
  Prisma,
  Scrape,
  ScrapeMessageCategory,
  User,
} from "@packages/common/prisma";
import { Link, redirect, useFetcher, useSearchParams } from "react-router";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/components/settings-section";
import { prisma } from "@packages/common/prisma";
import { getAuthUser } from "~/auth/middleware";
import {
  TbCheck,
  TbCopy,
  TbCrown,
  TbFolder,
  TbListCheck,
  TbLock,
  TbPlus,
  TbSearch,
  TbSettings,
  TbTrash,
  TbWorld,
} from "react-icons/tb";
import { Page } from "~/components/page";
import { useEffect, useRef, useState } from "react";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { createToken } from "@packages/common/jwt";
import { RadioCard } from "~/components/radio-card";
import { DataList } from "~/components/data-list";
import toast from "react-hot-toast";
import cn from "@meltdownjs/cn";
import { makeMeta } from "~/meta";
import { Timestamp } from "~/components/timestamp";
import { hideModal, showModal } from "~/components/daisy-utils";
import { models, oldModels } from "@packages/common";
import { useDirtyForm } from "~/components/use-dirty-form";

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
    update.llmModel = formData.get("llmModel") as string;
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
  if (formData.has("categories")) {
    update.messageCategories = JSON.parse(formData.get("categories") as string);
  }

  const scrape = await prisma.scrape.update({
    where: { id: scrapeId },
    data: update,
  });

  return { scrape };
}

const prompts = {
  "product-expert": {
    prompt: `You are an expert assistant that answers questions about <PRODUCT_OR_SERVICE>.
Your job is to provide factual, concise, and reliable answers strictly based on the content available about <PRODUCT_OR_SERVICE> — such as its documentation, website pages, blogs, or public posts.

Your Responsibilities:
1. Understand the user’s query and identify what part of <PRODUCT_OR_SERVICE> it refers to.
2. Retrieve relevant content and summarize it clearly.
3. Do not speculate or invent features or claims.
4. If unsure, say “I couldn’t find this in the available information.”
5. Optionally include source references (URLs or section titles) if available.

Output Style:
- Use a friendly and informative tone.
- Keep the response under 150 words unless the question is broad.
- Format important details as bullet points when possible.
- End with: “Would you like me to show related sections?” (optional)

Example Output:
<PRODUCT_OR_SERVICE> lets you build an AI-powered assistant trained on your website or documentation.
It integrates with Slack and Discord, and supports embedding a chat widget on your site.`,
  },
  "action-planner": {
    prompt: `
You are a setup assistant for <PRODUCT_OR_SERVICE>.
When a user asks “how to” or “help me do X,” you create a step-by-step guide that walks them through achieving that goal.

Your Responsibilities:
1. Understand the user’s goal (what they want to achieve with <PRODUCT_OR_SERVICE>).
2. Break it into ordered steps (numbered or bulleted).
3. Include any prerequisites or tips users should know.
4. Use verified documentation for reference — or if missing, clearly note that the step is inferred.
5. End with an optional “Next Steps” section or “Related Topics” suggestion.

Output Style:
- Use numbered steps (1, 2, 3...) for instructions.
- Keep each step short (max 2 sentences).
- Bold key UI elements, buttons, or menu options.
- Add a short intro sentence explaining the goal before listing steps.
- End with a short summary or next step.

Example Output:
To connect <PRODUCT_OR_SERVICE> with Slack:
1. Go to Dashboard → Integrations → Slack.
2. Click Add to Slack and authorize access.
3. Choose the workspace where you want to install the bot.
4. Test the bot by typing /<PRODUCT_OR_SERVICE> help in any Slack channel.`,
  },
  "research-assistant": {
    prompt: `You are a research analyst specialized in <PRODUCT_OR_SERVICE>.
Your job is to deeply understand the user’s query, explore related angles, and produce a comprehensive yet clear explanation or comparison.

Your Responsibilities:
1. Identify the main question and related subtopics.
2. Explore and expand the topic using all relevant information about <PRODUCT_OR_SERVICE>.
3. Provide context, comparisons, and implications where applicable.
4. Organize your findings into clear sections (Overview, Analysis, Comparison, Takeaways).
5. Avoid assumptions that aren’t supported by available content — if you infer something, mark it as such.

Output Style:
- Use section headings (Overview, Details, etc.).
- Write in paragraph form with a concise, informative tone.
- Use bullet lists or tables for comparisons if relevant.
- End with a Summary or Key Takeaways section.

Example Output:
Overview
<PRODUCT_OR_SERVICE> is an AI-powered documentation assistant that helps teams search, query, and interact with website or doc content in natural language.

Comparison with Chatbase
- <PRODUCT_OR_SERVICE> emphasizes developer integrations (Slack, Discord, Web Embed).
- Chatbase focuses on simple no-code chat embedding.

Key Takeaways
<PRODUCT_OR_SERVICE> suits technical or API-driven teams that need deeper integration and action automation.
Chatbase is better for simple website Q&A use cases.`,
  },
};

function TicketingSettings({ scrape }: { scrape: Scrape }) {
  const fetcher = useFetcher();
  const dirtyForm = useDirtyForm({
    ticketingEnabled: scrape.ticketingEnabled ?? false,
  });

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
      dirty={dirtyForm.isDirty("ticketingEnabled")}
    >
      <input type="hidden" name="from-ticketing-enabled" value={"true"} />
      <label className="label">
        <input
          type="checkbox"
          className="toggle"
          name="ticketing"
          defaultChecked={scrape.ticketingEnabled ?? false}
          onChange={dirtyForm.handleChange("ticketingEnabled")}
        />
        Active
      </label>
    </SettingsSection>
  );
}

function oldModelToModel(oldModel: string) {
  if (!Object.keys(oldModels).includes(oldModel)) {
    return oldModel;
  }
  const model = oldModels[oldModel].model;
  for (const [key, value] of Object.entries(models)) {
    if (value.model === model) {
      return key;
    }
  }
  throw new Error(`Unknown old model: ${oldModel}`);
}

function AiModelSettings({ scrape }: { scrape: Scrape }) {
  const modelFetcher = useFetcher();
  const [searchParams] = useSearchParams();
  const dirtyForm = useDirtyForm({
    llmModel: scrape.llmModel
      ? oldModelToModel(scrape.llmModel)
      : "openrouter/openai/gpt-4o-mini",
  });

  return (
    <SettingsSection
      id="ai-model"
      title="AI Model"
      description="Select the AI model to use for the messages across channels."
      fetcher={modelFetcher}
      dirty={dirtyForm.isDirty("llmModel")}
      actionRight={
        <Link to={`/ai-models`} className="btn btn-ghost btn-primary">
          Compare
        </Link>
      }
    >
      <select
        value={dirtyForm.getValue("llmModel")}
        onChange={dirtyForm.handleChange("llmModel")}
        className="select"
        name="llmModel"
      >
        {Object.entries(models).map(([key, value]) => (
          <option key={key} value={key}>
            {value.model} [{value.creditsPerMessage}]
          </option>
        ))}
      </select>
    </SettingsSection>
  );
}

function ShowSourcesSetting({ scrape, user }: { scrape: Scrape; user: User }) {
  const showSourcesFetcher = useFetcher();
  const dirtyForm = useDirtyForm({
    showSources: scrape.showSources ?? false,
  });

  function isAllowed() {
    return ["starter", "pro", "grow", "accelerate"].includes(
      (user.plan?.planId ?? "free").replace("-yearly", "")
    );
  }

  return (
    <SettingsSection
      id="show-sources"
      title="Show sources"
      description="Show the sources that the chatbot used from the knowledge base. It will be visible on the chat widget under every answer and on Discord/Slack messages."
      fetcher={showSourcesFetcher}
      dirty={dirtyForm.isDirty("showSources")}
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
            onChange={dirtyForm.handleChange("showSources")}
          />
          Active
        </label>
        <div className="badge badge-soft badge-primary">
          <TbCrown /> Grow
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
  const dirtyForm = useDirtyForm({
    analyseMessage: scrape.analyseMessage ?? false,
  });

  function isAllowed() {
    return ["starter", "pro", "grow", "accelerate"].includes(
      (user.plan?.planId ?? "free").replace("-yearly", "")
    );
  }

  return (
    <SettingsSection
      id="post-answer-analysis"
      title="Post answer analysis"
      description="Enable this to analyze the answer given by the AI and find out if there is any data gap in the knowledge base. It also analyzes more details from the question such as the sentiment, category and more. It uses one message credit per question."
      fetcher={fetcher}
      dirty={dirtyForm.isDirty("analyseMessage")}
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
            onChange={dirtyForm.handleChange("analyseMessage")}
          />
          Active
        </label>
        <div className="badge badge-soft badge-primary">
          <TbCrown /> Grow
        </div>
      </div>
    </SettingsSection>
  );
}

function ChatPromptSettings({ scrape }: { scrape: Scrape }) {
  const promptFetcher = useFetcher();
  const [selectedPrompt, setSelectedPrompt] =
    useState<keyof typeof prompts>("product-expert");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [productName, setProductName] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);
  const dirtyForm = useDirtyForm({
    chatPrompt: scrape.chatPrompt ?? "",
  });

  function handleUsePrompt() {
    if (textareaRef.current && productName) {
      const prompt = prompts[selectedPrompt].prompt;
      textareaRef.current.value = prompt
        .replaceAll("<PRODUCT_OR_SERVICE>", productName)
        .replace(/^\n/, "")
        .replace(/\n$/, "")
        .trim();
      setProductName("");
      setSelectedPrompt("product-expert");
      hideModal("browse-prompts");
      dirtyForm.setValue("chatPrompt", textareaRef.current.value);
    }
  }

  return (
    <>
      <SettingsSection
        id="prompt"
        title="Chat Prompt"
        description="Customize the chat prompt for this scrape."
        fetcher={promptFetcher}
        formRef={formRef}
        actionRight={
          <button
            className="btn"
            type="button"
            onClick={() => showModal("browse-prompts")}
          >
            Library
            <TbFolder />
          </button>
        }
        dirty={dirtyForm.isDirty("chatPrompt")}
      >
        <textarea
          ref={textareaRef}
          className="textarea textarea-bordered w-full"
          name="chatPrompt"
          defaultValue={scrape.chatPrompt ?? ""}
          placeholder="Enter a custom chat prompt for this scrape."
          rows={5}
          onChange={dirtyForm.handleChange("chatPrompt")}
        />
      </SettingsSection>

      <dialog id="browse-prompts" className="modal">
        <div className="modal-box flex flex-col gap-4">
          <div className="text-lg font-bold">Prompts library</div>
          <RadioCard
            options={[
              {
                label: "Product expert",
                value: "product-expert",
                icon: <TbCheck />,
                description:
                  "A product expert who knows about the product and can answer questions about it.",
              },
              {
                label: "Action planner",
                value: "action-planner",
                icon: <TbListCheck />,
                description:
                  "A action planner who can plan actions to be taken to answer the question.",
              },
              {
                label: "Research assistant",
                value: "research-assistant",
                icon: <TbSearch />,
                description:
                  "A research assistant who can help with research and answer questions about it.",
              },
            ]}
            value={selectedPrompt}
            cols={1}
            onChange={(value) =>
              setSelectedPrompt(value as keyof typeof prompts)
            }
          />

          <fieldset className="fieldset">
            <legend className="fieldset-legend">
              Your product or service name
            </legend>
            <input
              type="text"
              className="input w-full"
              placeholder="Ex: My Company"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </fieldset>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="btn"
              onClick={() => hideModal("browse-prompts")}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUsePrompt}
              disabled={!productName}
            >
              Use it
              <TbCheck />
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="button">close</button>
        </form>
      </dialog>
    </>
  );
}

function CategorySettings({ scrape }: { scrape: Scrape }) {
  const fetcher = useFetcher();
  const dirtyForm = useDirtyForm({
    categories: scrape.messageCategories,
  });

  function handleAddCategory() {
    dirtyForm.setValue("categories", (prev) => [
      ...prev,
      { title: "", description: "", createdAt: new Date() },
    ]);
  }

  function handleDeleteCategory(index: number) {
    dirtyForm.setValue("categories", (prev) =>
      prev.filter((_, i) => i !== index)
    );
  }

  function handleChangeCategoryTitle(index: number, title: string) {
    dirtyForm.setValue("categories", (prev) =>
      prev.map((c, i) => (i === index ? { ...c, title } : c))
    );
  }

  function handleChangeCategoryDescription(index: number, description: string) {
    dirtyForm.setValue("categories", (prev) =>
      prev.map((c, i) => (i === index ? { ...c, description } : c))
    );
  }

  return (
    <SettingsSection
      id="categories"
      title="Categories"
      description="Add categories that will be tagged to the messages and you can view the count of each category on the dashboard. Make sure that the categories are narrowed and unambiguous."
      fetcher={fetcher}
      actionRight={
        <button className="btn" type="button" onClick={handleAddCategory}>
          Add
          <TbPlus />
        </button>
      }
      dirty={dirtyForm.isAnyDirty}
    >
      {dirtyForm.getValue("categories")?.length > 0 && (
        <div className="flex gap-2">
          <div className="flex flex-col gap-2 w-full">
            <input
              type="hidden"
              name="categories"
              value={JSON.stringify(dirtyForm.getValue("categories"))}
            />
            {dirtyForm
              .getValue("categories")
              ?.map((category: ScrapeMessageCategory, index: number) => (
                <div key={index} className="flex gap-2 w-full items-end">
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">Title</legend>
                    <input
                      type="text"
                      className="input"
                      name="category-title"
                      placeholder="Ex: Pricing"
                      value={category.title}
                      onChange={(e) =>
                        handleChangeCategoryTitle(index, e.target.value)
                      }
                    />
                  </fieldset>

                  <fieldset className="fieldset flex-2">
                    <legend className="fieldset-legend">Description</legend>
                    <input
                      type="text"
                      className="input w-full"
                      name="category-title"
                      placeholder="Ex: Everything about pricing, plans, credits, etc."
                      value={category.description}
                      onChange={(e) =>
                        handleChangeCategoryDescription(index, e.target.value)
                      }
                    />
                  </fieldset>

                  <fieldset className="fieldset">
                    <button
                      className="btn btn-error btn-soft btn-square"
                      type="button"
                      onClick={() => handleDeleteCategory(index)}
                    >
                      <TbTrash />
                    </button>
                  </fieldset>
                </div>
              ))}
          </div>
        </div>
      )}
    </SettingsSection>
  );
}

export default function ScrapeSettings({ loaderData }: Route.ComponentProps) {
  const nameFetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const minScoreFetcher = useFetcher();
  const slugFetcher = useFetcher();
  const privateFetcher = useFetcher();

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const dirtyForm = useDirtyForm({
    minScore: loaderData.scrape.minScore,
    private: loaderData.scrape.private,
    title: loaderData.scrape.title,
    slug: loaderData.scrape.slug,
  });

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

  function copyId() {
    navigator.clipboard.writeText(loaderData.scrape.id);
    toast.success("Copied to clipboard");
  }

  return (
    <Page title="Settings" icon={<TbSettings />}>
      <SettingsSectionProvider>
        <SettingsContainer>
          <DataList
            data={[
              {
                label: "Created",
                value: <Timestamp date={loaderData.scrape.createdAt} />,
              },
              {
                label: "Collection ID",
                value: (
                  <div className="flex items-center gap-2 overflow-hidden">
                    <code>{loaderData.scrape.id}</code>
                    <button className="btn btn-square btn-xs" onClick={copyId}>
                      <TbCopy />
                    </button>
                  </div>
                ),
              },
            ]}
          />

          <SettingsSection
            id="name"
            title="Name"
            description="Give it a name. It will be shown on chat screen."
            fetcher={nameFetcher}
            dirty={dirtyForm.isDirty("title")}
          >
            <input
              type="text"
              className="input max-w-sm"
              name="title"
              defaultValue={loaderData.scrape.title ?? ""}
              placeholder="Enter a name for this scrape."
              onChange={dirtyForm.handleChange("title")}
            />
          </SettingsSection>

          <SettingsSection
            id="slug"
            title="Slug"
            description="Give it a slug and you can use it in the URL to access the chatbot. Should be 4-16 characters long and can only contain lowercase letters, numbers, and hyphens."
            fetcher={slugFetcher}
            dirty={dirtyForm.isDirty("slug")}
          >
            <input
              type="text"
              className="input max-w-sm"
              name="slug"
              defaultValue={loaderData.scrape.slug ?? ""}
              placeholder="Ex: remotion"
              pattern="^[a-z0-9\-]{4,32}$"
              required
              onChange={dirtyForm.handleChange("slug")}
            />
          </SettingsSection>

          <SettingsSection
            id="visibility-type"
            title="Visibility type"
            description="Configure if the bot is public or private."
            fetcher={privateFetcher}
            dirty={dirtyForm.isDirty("private")}
          >
            <input
              type="hidden"
              name="visibility-type"
              value={dirtyForm.getValue("private") ? "private" : "public"}
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
                    "It will be private bot and only work with Discord Bots, Slack bots and team members.",
                },
              ]}
              value={dirtyForm.getValue("private") ? "private" : "public"}
              onChange={(value) =>
                dirtyForm.setValue("private", value === "private")
              }
            />
          </SettingsSection>

          <ChatPromptSettings scrape={loaderData.scrape} />

          <TicketingSettings scrape={loaderData.scrape} />

          <SettingsSection
            id="min-score"
            title="Min score"
            description="Configure the minimum score (relevance score) required for the knowledge base to have to be considered for a question. If it is too high, it will not be able to answer questions as much. If it is too low, it will answer questions that are not relevant."
            fetcher={minScoreFetcher}
            dirty={dirtyForm.isDirty("minScore")}
          >
            <div className="flex gap-2">
              <input
                type="range"
                min={0}
                max="1"
                defaultValue={(dirtyForm.getValue("minScore") as number) ?? 0}
                className="range"
                step={0.01}
                onChange={(e) =>
                  dirtyForm.setValue("minScore", parseFloat(e.target.value))
                }
                name="minScore"
              />
              <div className="badge badge-lg badge-soft badge-primary">
                {(dirtyForm.getValue("minScore") as number) ?? 0}
              </div>
            </div>
          </SettingsSection>

          <AiModelSettings scrape={loaderData.scrape} />

          <AnalyseMessageSettings
            scrape={loaderData.scrape}
            user={loaderData.scrape.user}
          />

          <ShowSourcesSetting
            scrape={loaderData.scrape}
            user={loaderData.scrape.user}
          />

          <CategorySettings scrape={loaderData.scrape} />

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
