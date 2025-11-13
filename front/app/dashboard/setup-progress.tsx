import type { Scrape, User } from "libs/prisma";
import { TbCrown } from "react-icons/tb";

export type SetupProgressInput = {
  nScrapes: number;
  nScrapeItems: number;
  nMessages: number;
  nTickets: number;
  nKnowledgeGroups: number;
  nChatbotMessages: number;
  nDiscordMessages: number;
  nMCPMessages: number;
  scrape?: Scrape & { user: User };
};

export type SetupProgressAction = {
  id: string;
  title: string;
  description: string;
  action?: () => void;
  url: (input: SetupProgressInput) => string;
  checker: (input: SetupProgressInput) => boolean;
  canSkip?: boolean;
  icon?: React.ReactNode;
  external?: boolean;
};

export const allSetupProgressActions: SetupProgressAction[] = [
  {
    id: "create-collection",
    title: "Create collection",
    description: "Create a collection to make AI chatbot",
    checker: (input) => input.nScrapes === 0,
    url: () => "/app",
  },
  {
    id: "create-knowledge",
    title: "Create knowledge",
    description: "Create a knowledge groups for the bot",
    checker: (input) => input.nKnowledgeGroups === 0,
    url: () => "/knowledge/group",
  },
  {
    id: "fetch-knowledge",
    title: "Fetch knowledge",
    description: "Fetch knowledge from the knowledge group",
    checker: (input) => input.nScrapeItems === 0,
    url: () => "/knowledge",
  },
  {
    id: "try-chatbot",
    title: "Try chatbot",
    description: "Try the chatbot",
    checker: (input) => input.nMessages === 0,
    url: (input) => `/w/${input.scrape?.slug || input.scrape?.id}`,
    external: true,
  },
  {
    id: "set-prompt",
    title: "Set prompt",
    description: "Set the system prompt. Customise the AI behaviour.",
    checker: (input) => !input.scrape?.chatPrompt,
    url: () => "/settings#prompt",
  },
  {
    id: "upgrade",
    title: "Upgrade now",
    description: "Upgrade to a paid plan",
    checker: (input) => input.scrape?.user.plan?.planId === "free",
    url: () => "/profile#billing",
    icon: <TbCrown />,
  },
];

export function getPendingActions(
  input: SetupProgressInput,
  skippedActions: string[]
): SetupProgressAction[] {
  return allSetupProgressActions.filter(
    (action) => action.checker(input) && !skippedActions.includes(action.id)
  );
}

export function getSkippedActions(scrapeId: string): string[] {
  return localStorage.getItem(`skippedActions-${scrapeId}`)?.split(",") || [];
}

export function setSkippedActions(scrapeId: string, ids: string[]) {
  localStorage.setItem(`skippedActions-${scrapeId}`, ids.join(","));
}

export function resetSkippedActions(scrapeId: string) {
  localStorage.removeItem(`skippedActions-${scrapeId}`);
}
