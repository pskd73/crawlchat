import type { Scrape } from "libs/prisma";

export type SetupProgressInput = {
  nScrapes: number;
  nMessages: number;
  nTickets: number;
  nKnowledgeGroups: number;
  nChatbotMessages: number;
  nDiscordMessages: number;
  nMCPMessages: number;
  scrape?: Scrape;
};

export type SetupProgressAction = {
  id: string;
  priority: number;
  title: string;
  description: string;
  action?: () => void;
  url?: string;
  checker: (input: SetupProgressInput) => boolean;
  canSkip?: boolean;
};

export const allSetupProgressActions: SetupProgressAction[] = [
  {
    id: "create-collection",
    priority: 0,
    title: "Create collection",
    description: "Create a collection to make AI chatbot",
    checker: (input) => input.nScrapes === 0,
    url: "/app",
  },
  {
    id: "create-knowledge",
    priority: 1,
    title: "Create knowledge",
    description: "Create a knowledge groups for the bot",
    checker: (input) => input.nKnowledgeGroups === 0,
    url: "/knowledge/group",
  },
  {
    id: "embed-chatbot",
    priority: 2,
    title: "Embed chatbot",
    description: "Embed the chatbot in your website",
    checker: (input) => input.nChatbotMessages === 0,
    url: "/integrations#customise-widget",
  },
  {
    id: "connect-discord",
    priority: 3,
    title: "Connect Discord",
    description: "Connect your Discord server to the chatbot",
    checker: (input) => input.nDiscordMessages === 0,
    url: "/integrations/discord#discord-server-id",
    canSkip: true,
  },
  {
    id: "connect-mcp",
    priority: 4,
    title: "Connect MCP",
    description: "Connect your MCP server to the chatbot",
    checker: (input) => input.nMCPMessages === 0,
    url: "/integrations/mcp",
    canSkip: true,
  },
  {
    id: "set-logo",
    priority: 5,
    title: "Set logo",
    description: "Set the logo of the chatbot. Best for branding.",
    checker: (input) => !input.scrape?.logoUrl,
    url: "/settings#logo",
  },
  {
    id: "set-slug",
    priority: 5,
    title: "Set slug",
    description: "Set the slug of the chatbot. Custom URL.",
    checker: (input) => !input.scrape?.slug,
    url: "/settings#slug",
  },
  {
    id: "set-prompt",
    priority: 5,
    title: "Set prompt",
    description: "Set the system prompt. Customise the AI behaviour.",
    checker: (input) => !input.scrape?.chatPrompt,
    url: "/settings#prompt",
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
