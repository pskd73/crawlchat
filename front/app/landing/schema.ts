// utils/schema.ts
import type {
  BreadcrumbList,
  FAQPage,
  Organization,
  Question,
  SoftwareApplication,
  WebSite,
} from "schema-dts";

export const crawlChatOrganization: Organization = {
  "@type": "Organization",
  name: "CrawlChat",
  url: "https://crawlchat.app",
  logo: "https://crawlchat.app/logo.png",
  description:
    "CrawlChat transforms your technical documentation into an AI-powered chatbot, seamlessly integrating with your website, Discord, Slack, or as an MCP server.",
  sameAs: [
    "https://www.linkedin.com/company/crawlchat",
    "https://discord.gg/zW3YmCRJkC",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Customer Support",
    email: "support@crawlchat.app",
    availableLanguage: "English",
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: "RT Nagar",
    addressLocality: "Bengaluru",
    addressRegion: "KA",
    postalCode: "560032",
    addressCountry: "IN",
  },
  foundingDate: "2025-03",
  founder: {
    "@type": "Person",
    name: "Pramod Kumar",
  },
};

export const crawlChatWebSite: WebSite = {
  "@type": "WebSite",
  name: "CrawlChat",
  url: "https://crawlchat.app",
  description:
    "CrawlChat is an AI-powered tool that converts your documentation and knowledge sources into a responsive customer support chatbot.",
  publisher: {
    "@type": "Organization",
    name: "CrawlChat",
    logo: "https://crawlchat.app/logo.png",
  },
};

export const crawlChatSoftwareApp: SoftwareApplication = {
  "@type": "SoftwareApplication",
  name: "CrawlChat",
  url: "https://crawlchat.app",
  description:
    "AI-powered chatbot that converts technical documentation into interactive support assistants for websites, Discord, Slack, and MCP servers.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web Browser, Discord, Slack",
  offers: [
    {
      "@type": "Offer",
      name: "Free Plan",
      price: "0",
      priceCurrency: "USD",
      description: "40 pages, 20 message credits, 1 collection, 1 team member",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Hobby Plan",
      price: "21",
      priceCurrency: "USD",
      description:
        "500 page credits/month, 200 message credits/month, 1 collection, 1 team member",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Starter Plan",
      price: "45",
      priceCurrency: "USD",
      description:
        "5000 page credits/month, 2000 message credits/month, 2 collections, 2 team members",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Pro Plan",
      price: "99",
      priceCurrency: "USD",
      description:
        "14000 page credits/month, 7000 message credits/month, 3 collections, 5 team members",
      availability: "https://schema.org/InStock",
    },
  ],
  featureList: [
    "AI-powered documentation chatbot",
    "Website widget integration",
    "Discord bot integration",
    "Slack app integration",
    "MCP server support",
    "Multi-language support (32+ languages)",
    "Analytics and performance tracking",
    "Support ticket system",
    "Custom branding and styling",
    "API access",
    "GitHub issues integration",
    "Image input support",
  ],
  screenshot: "https://crawlchat.app/og-1.png",
  softwareVersion: "2.0",
  datePublished: "2024-01-01",
  author: crawlChatOrganization,
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "4",
    bestRating: "5",
    worstRating: "1",
  },
  review: [
    {
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: "5",
        bestRating: "5",
      },
      author: {
        "@type": "Person",
        name: "Jonny Burger",
        url: "https://x.com/JNYBGR",
      },
      reviewBody:
        "MCP, llms.txt and remotion.ai are now live! Thanks to @pramodk73 and CrawlChat for getting us up to speed with AI integrations.",
      publisher: {
        "@type": "Organization",
        name: "Remotion",
      },
    },
    {
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: "5",
        bestRating: "5",
      },
      author: {
        "@type": "Person",
        name: "Anton Lavrenov",
        url: "https://x.com/lavrton",
      },
      reviewBody:
        "Integrated CrawlChat into the new Konva docs – hats off to @pramodk73 for making it insanely useful. It now powers 'Ask AI' widget on site, MCP server for docs, Discord bot for community. Smarter docs. Better support.",
      publisher: {
        "@type": "Organization",
        name: "Konvajs & Polotno",
      },
    },
    {
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: "5",
        bestRating: "5",
      },
      author: {
        "@type": "Person",
        name: "Maurits Koekoek",
        url: "https://www.linkedin.com/in/maurits-koekoek",
      },
      reviewBody:
        "Can wholeheartedly recommend this. The number of support calls to 270 Degrees significantly dropped after we implemented CrawlChat.",
      publisher: {
        "@type": "Organization",
        name: "270 Degrees",
      },
    },
    {
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: "5",
        bestRating: "5",
      },
      author: {
        "@type": "Person",
        name: "Egelhaus",
        url: "https://github.com/egelhaus",
      },
      reviewBody:
        "We can definitely recommend using CrawlChat, it's easy to set up, really affordable, and has great support. Thank you @pramodk73 for making this!",
      publisher: {
        "@type": "Organization",
        name: "Postiz",
      },
    },
  ],
};

export const crawlChatFAQ: FAQPage = {
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I train with my documentation?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "There is technically no special process like training the AI chatbot. All you need to do is to add your existing help documentation about your product or service to the knowledge base. You can either pass the URL of your documentation or upload the files (multiple formats are supported) to the knowledge base. The chatbot will smartly understand the documentation and uses it to answer the questions.",
      },
    },
    {
      "@type": "Question",
      name: "I already use other chatbot, why do I switch?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "CrawlChat shines in three areas: CrawlChat uses latest LLM models and gives you the best answers for your customer queries. It comes with a support ticket system that makes sure that the queries reaches you if the documentation is not enough. It provides all the necessary analytics required to monitor the performance of the chatbot and fine tune your documentation.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to bring my own OpenAI API key?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No, CrawlChat uses the latest LLM models from OpenAI, Anthropic, Google, and Gemini. You can use the chatbot without any API key. You can choose the model that best suits your needs from the dashboard.",
      },
    },
    {
      "@type": "Question",
      name: "Does it support other languages?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. That's the advantage of using AI based chatbots. The LLMs/AI models are capable of answering your customer or client's queries in their own language out of the box. This includes all major 32 languages like English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, etc.",
      },
    },
    {
      "@type": "Question",
      name: "Can I try it out first?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can signup and try out the platform with free credits you get on signup. You can check the pricing section for more details about the credits.",
      },
    },
    {
      "@type": "Question",
      name: "How can I integrate the Ask AI widget to my website?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It is a very simple process. You can navigate to the integration section and copy the code snippet. You can then paste the code snippet in your website. It also provides config for documentation solutions like Docusaurus, etc.",
      },
    },
    {
      "@type": "Question",
      name: "How can integrate it with Slack or Discord?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! CrawlChat provides a Discord bot and a Slack app that can be integrated with your Discord or Slack server. You can find the instructions to integrate the chatbot to your Discord or Slack server in the Discord bot and Slack app pages. Once added to the channel or server, your community can tag @CrawlChat to ask questions to get the answers.",
      },
    },
    {
      "@type": "Question",
      name: "What kind of analytics does it provide?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "CrawlChat gives rating to each answer based on the relevance of the answer to the question. The more the score is, the better the answer and the documentation was for the given query. CrawlChat provides charts over time, distribution of the score and per message & conversation scores as well. They help you to monitor the performance of the chatbot and the knowledge base. It also provides analytics on geo location of the users, browser, device, etc. so that you can understand the user behavior and improve your documentation. Apart from that, you can also see what knowledge groups are being used the most to answer the questions.",
      },
    },
    {
      "@type": "Question",
      name: "How does Support Ticket System work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "CrawlChat's goal is to direct the queries to the humans if the documentation does not have answer for any query. So, when it has no answer, it prompts the user to give their email to create the support ticket. Once the support ticket is created, you can view them from the dashboard and work on the resolution. CrawlChat sends email notifications to the user whenever there is an update. You can close the ticket once the query is resolved. You can enable or disable this module as per your requirement.",
      },
    },
    {
      "@type": "Question",
      name: "How can I customise the Ask AI widget?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can configure your own brand colors, text, logo for the Ask AI button that will be visible on your website. This can be controlled from the dashboard without updating the embedded snippet.",
      },
    },
  ] as Question[],
};

export const crawlChatBreadcrumbs: BreadcrumbList = {
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://crawlchat.app",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Pricing",
      item: "https://crawlchat.app/#pricing",
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "Features",
      item: "https://crawlchat.app/#features",
    },
    {
      "@type": "ListItem",
      position: 4,
      name: "FAQ",
      item: "https://crawlchat.app/#faq",
    },
  ],
};

export const crawlChatSchema = [
  crawlChatOrganization,
  crawlChatWebSite,
  crawlChatSoftwareApp,
  crawlChatFAQ,
  crawlChatBreadcrumbs,
];
