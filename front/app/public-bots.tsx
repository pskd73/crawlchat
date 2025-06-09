import {
  LandingPage,
  Container,
  Nav,
  Footer,
  CTA,
  ctaClassNames,
} from "~/landing-v2/page";
import type { Route } from "./+types/public-bots";
import { TbArrowRight } from "react-icons/tb";
import cn from "@meltdownjs/cn";

export function meta() {
  return [
    {
      title: "Public AI Chatbots - CrawlChat",
      description: "Public AI Chatbots for popular libraries and frameworks",
    },
  ];
}

export function loader() {
  const bots = [
    {
      url: "https://crawlchat.app/w/684022717d51a04cd9712db8",
      title: "Tailwind v4",
      description:
        "Tailwind CSS is a utility-first CSS framework that lets you build custom designs quickly by applying pre-defined classes directly in your HTML.",
      logo: "https://codekitapp.com/images/help/free-tailwind-icon@2x.png",
    },
    {
      url: "https://crawlchat.app/w/6831452d6f8339e082e17d26",
      title: "TanStack Start",
      description:
        "TanStack Start is a full-stack React framework with type-safe routing and isomorphic data loading.",
      logo: "https://tanstack.com/assets/splash-light-CHqMsyq8.png",
    },
    {
      url: "https://crawlchat.app/w/67c52dd30eea2e08d8b04671",
      title: "daisyUI",
      description:
        "daisyUI is a Tailwind CSS plugin that provides pre-styled, themeable UI components.",
      logo: "https://img.daisyui.com/images/daisyui/mark-static.svg",
    },
  ];

  return { bots };
}

export default function PublicBots({ loaderData }: Route.ComponentProps) {
  return (
    <LandingPage>
      <Container>
        <Nav />
      </Container>

      <Container>
        <div className="opacity-60">
          CrawlChat lets you create AI chatbots that are powered by your own
          knowledge base and embed them on your website, Discord, Slack, or as
          an MCP server. Here are the AI chatbots for few popular open-source
          libraries or frameworks. You can get quick help by chatting with them.
        </div>
      </Container>

      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loaderData.bots.map((bot) => (
            <div
              key={bot.url}
              className="flex flex-col gap-2 border border-outline rounded-2xl p-8 bg-canvas shadow-sm"
            >
              <div>
                <img src={bot.logo} alt={bot.title} className="max-h-10" />
              </div>
              <h2 className="text-2xl font-medium">{bot.title}</h2>
              <p className="text-sm opacity-50">{bot.description}</p>
              <div className="mt-4">
                <a
                  href={bot.url}
                  target="_blank"
                  className={cn(
                    ctaClassNames(false),
                    "text-md px-2 py-1 w-fit"
                  )}
                >
                  Chat now
                  <TbArrowRight />
                </a>
              </div>
            </div>
          ))}
        </div>
      </Container>

      <Container>
        <CTA />
      </Container>

      <Footer />
    </LandingPage>
  );
}
