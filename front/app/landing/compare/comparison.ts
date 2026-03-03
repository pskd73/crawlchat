export type FeatureValue = {
  value: boolean | number | string;
  lable?: string;
  bestOrder?: "low" | "high";
};

export type FeatureName =
  | "ai_models"
  | "api"
  | "mcp_server"
  | "custom_actions"
  | "categories"
  | "sentiment_analysis"
  | "support_tickets"
  | "chrome_extension"
  | "rag"
  | "discord_bot"
  | "slack_app"
  | "github_issues"
  | "github_discussions"
  | "notion"
  | "confluence"
  | "linear"
  | "youtube_videos"
  | "teams"
  | "follow_up_questions"
  | "private_bots"
  | "data_retention"
  | "users_view"
  | "tags"
  | "auto_sync"
  | "language_detection"
  | "auto_translate"
  | "compose"
  | "data_gaps"
  | "for_tech_docs"
  | "entry_price";

export const featureNames: Record<FeatureName, string> = {
  ai_models: "AI models",
  api: "API",
  mcp_server: "MCP server",
  custom_actions: "Custom actions",
  categories: "Categories",
  sentiment_analysis: "Sentiment analysis",
  support_tickets: "Support tickets",
  chrome_extension: "Chrome extension",
  rag: "RAG",
  discord_bot: "Discord bot",
  slack_app: "Slack app",
  github_issues: "GitHub issues",
  github_discussions: "GitHub discussions",
  notion: "Notion",
  confluence: "Confluence",
  linear: "Linear",
  teams: "Teams",
  follow_up_questions: "Follow up questions",
  private_bots: "Private bots",
  data_retention: "Data retention",
  users_view: "Users view",
  tags: "Tags",
  auto_sync: "Auto sync",
  language_detection: "Language detection",
  auto_translate: "Auto translate",
  compose: "Compose",
  data_gaps: "Data gaps",
  youtube_videos: "Youtube videos",
  for_tech_docs: "For tech docs",
  entry_price: "Entry price",
};

type Features = Record<FeatureName, FeatureValue>;
export type ProductFeatures = {
  name: string;
  url: string;
  features: Features;
};

export const crawlchat: ProductFeatures = {
  name: "CrawlChat",
  url: "https://crawlchat.app",
  features: {
    ai_models: {
      value: 10,
      lable: "10+ models available",
    },
    api: {
      value: true,
    },
    mcp_server: {
      value: true,
    },
    custom_actions: {
      value: true,
      lable: "Call custom APIs",
    },
    categories: {
      value: true,
    },
    sentiment_analysis: {
      value: true,
    },
    support_tickets: {
      value: true,
      lable: "In-app support tickets",
    },
    chrome_extension: {
      value: true,
      lable: "Answer anywhere",
    },
    rag: {
      value: "Hybrid",
      lable: "Semantic + Text search",
    },
    discord_bot: {
      value: true,
      lable: "Tag to ask",
    },
    slack_app: {
      value: true,
      lable: "Tag to ask",
    },
    github_issues: {
      value: true,
    },
    github_discussions: {
      value: true,
    },
    notion: {
      value: true,
    },
    confluence: {
      value: true,
    },
    linear: {
      value: true,
    },
    teams: {
      value: true,
    },
    follow_up_questions: {
      value: true,
    },
    private_bots: {
      value: true,
      lable: "Private bots for internal use",
    },
    data_retention: {
      value: true,
      lable: "Upto 1 year",
    },
    users_view: {
      value: true,
      lable: "View unique users",
    },
    tags: {
      value: true,
      lable: "Auto assign tags to the questions",
    },
    auto_sync: {
      value: true,
      lable: "Hourly, daily, weekly, monthly sync",
    },
    language_detection: {
      value: true,
    },
    auto_translate: {
      value: true,
      lable: "Quick question translation",
    },
    compose: {
      value: true,
    },
    data_gaps: {
      value: true,
      lable: "Auto find missing data",
    },
    youtube_videos: {
      value: true,
    },
    for_tech_docs: {
      value: false,
    },
    entry_price: {
      value: "$29/mo",
      lable: "Hobby",
    },
  },
};

export const kapaai: ProductFeatures = {
  name: "Kapa.ai",
  url: "https://kapa.ai",
  features: {
    ai_models: {
      value: 4,
    },
    api: {
      value: true,
    },
    mcp_server: {
      value: true,
    },
    custom_actions: {
      value: false,
    },
    categories: {
      value: false,
    },
    sentiment_analysis: {
      value: true,
    },
    support_tickets: {
      value: true,
    },
    chrome_extension: {
      value: false,
    },
    rag: {
      value: true,
    },
    discord_bot: {
      value: true,
    },
    slack_app: {
      value: true,
    },
    github_issues: {
      value: true,
    },
    github_discussions: {
      value: true,
    },
    notion: {
      value: true,
    },
    confluence: {
      value: true,
    },
    linear: {
      value: true,
    },
    teams: {
      value: true,
    },
    follow_up_questions: {
      value: true,
    },
    private_bots: {
      value: false,
    },
    data_retention: {
      value: true,
    },
    users_view: {
      value: true,
    },
    tags: {
      value: true,
    },
    auto_sync: {
      value: true,
    },
    language_detection: {
      value: true,
    },
    auto_translate: {
      value: false,
    },
    compose: {
      value: false,
    },
    data_gaps: {
      value: true,
      lable: "Basic",
    },
    youtube_videos: {
      value: true,
    },
    for_tech_docs: {
      value: true,
    },
    entry_price: {
      value: "Not listed",
    },
  },
};

export const docsbot: ProductFeatures = {
  name: "DocsBot AI",
  url: "https://docsbot.ai",
  features: {
    ai_models: {
      value: 4,
    },
    api: {
      value: true,
    },
    mcp_server: {
      value: false,
    },
    custom_actions: {
      value: false,
    },
    categories: {
      value: false,
    },
    sentiment_analysis: {
      value: true,
    },
    support_tickets: {
      value: true,
    },
    chrome_extension: {
      value: false,
    },
    rag: {
      value: true,
    },
    discord_bot: {
      value: true,
    },
    slack_app: {
      value: true,
    },
    github_issues: {
      value: true,
    },
    github_discussions: {
      value: true,
    },
    notion: {
      value: true,
    },
    confluence: {
      value: true,
    },
    linear: {
      value: false,
    },
    teams: {
      value: true,
    },
    follow_up_questions: {
      value: false,
    },
    private_bots: {
      value: false,
    },
    data_retention: {
      value: true,
    },
    users_view: {
      value: true,
    },
    tags: {
      value: false,
    },
    auto_sync: {
      value: true,
    },
    language_detection: {
      value: true,
    },
    auto_translate: {
      value: false,
    },
    compose: {
      value: false,
    },
    data_gaps: {
      value: true,
    },
    youtube_videos: {
      value: true,
    },
    for_tech_docs: {
      value: true,
    },
    entry_price: {
      value: "$49/mo",
    },
  },
};

export const sitegpt: ProductFeatures = {
  name: "SiteGPT",
  url: "https://sitegpt.ai",
  features: {
    ai_models: {
      value: 3,
    },
    api: {
      value: true,
    },
    mcp_server: {
      value: false,
    },
    custom_actions: {
      value: true,
      lable: "Functions",
    },
    categories: {
      value: false,
    },
    sentiment_analysis: {
      value: false,
    },
    support_tickets: {
      value: true,
    },
    chrome_extension: {
      value: false,
    },
    rag: {
      value: true,
    },
    discord_bot: {
      value: false,
    },
    slack_app: {
      value: false,
    },
    github_issues: {
      value: false,
    },
    github_discussions: {
      value: false,
    },
    notion: {
      value: true,
    },
    confluence: {
      value: true,
    },
    linear: {
      value: false,
    },
    teams: {
      value: true,
    },
    follow_up_questions: {
      value: false,
    },
    private_bots: {
      value: false,
    },
    data_retention: {
      value: true,
    },
    users_view: {
      value: false,
    },
    tags: {
      value: false,
    },
    auto_sync: {
      value: true,
    },
    language_detection: {
      value: true,
    },
    auto_translate: {
      value: false,
    },
    compose: {
      value: false,
    },
    data_gaps: {
      value: false,
    },
    youtube_videos: {
      value: true,
    },
    for_tech_docs: {
      value: true,
    },
    entry_price: {
      value: "$39/mo",
    },
  },
};

export const chatbase: ProductFeatures = {
  name: "Chatbase",
  url: "https://chatbase.co",
  features: {
    ai_models: {
      value: 4,
    },
    api: {
      value: true,
    },
    mcp_server: {
      value: false,
    },
    custom_actions: {
      value: true,
    },
    categories: {
      value: false,
    },
    sentiment_analysis: {
      value: false,
    },
    support_tickets: {
      value: true,
    },
    chrome_extension: {
      value: false,
    },
    rag: {
      value: true,
    },
    discord_bot: {
      value: false,
    },
    slack_app: {
      value: true,
    },
    github_issues: {
      value: false,
    },
    github_discussions: {
      value: false,
    },
    notion: {
      value: true,
    },
    confluence: {
      value: true,
    },
    linear: {
      value: false,
    },
    teams: {
      value: true,
    },
    follow_up_questions: {
      value: false,
    },
    private_bots: {
      value: false,
    },
    data_retention: {
      value: true,
    },
    users_view: {
      value: true,
    },
    tags: {
      value: false,
    },
    auto_sync: {
      value: true,
    },
    language_detection: {
      value: true,
    },
    auto_translate: {
      value: true,
    },
    compose: {
      value: false,
    },
    data_gaps: {
      value: false,
    },
    youtube_videos: {
      value: true,
    },
    for_tech_docs: {
      value: false,
    },
    entry_price: {
      value: "$32/mo",
    },
  },
};

export const mava: ProductFeatures = {
  name: "Mava",
  url: "https://mava.ai",
  features: {
    ai_models: {
      value: 3,
    },
    api: {
      value: true,
    },
    mcp_server: {
      value: false,
    },
    custom_actions: {
      value: false,
    },
    categories: {
      value: false,
    },
    sentiment_analysis: {
      value: false,
    },
    support_tickets: {
      value: true,
    },
    chrome_extension: {
      value: false,
    },
    rag: {
      value: true,
    },
    discord_bot: {
      value: true,
    },
    slack_app: {
      value: true,
    },
    github_issues: {
      value: false,
    },
    github_discussions: {
      value: false,
    },
    notion: {
      value: false,
    },
    confluence: {
      value: false,
    },
    linear: {
      value: false,
    },
    teams: {
      value: false,
    },
    follow_up_questions: {
      value: false,
    },
    private_bots: {
      value: false,
    },
    data_retention: {
      value: true,
    },
    users_view: {
      value: true,
    },
    tags: {
      value: true,
    },
    auto_sync: {
      value: true,
    },
    language_detection: {
      value: true,
    },
    auto_translate: {
      value: false,
    },
    compose: {
      value: false,
    },
    data_gaps: {
      value: false,
    },
    youtube_videos: {
      value: false,
    },
    for_tech_docs: {
      value: false,
    },
    entry_price: {
      value: "Free tier",
    },
  },
};
