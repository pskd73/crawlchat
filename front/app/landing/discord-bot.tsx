import { useMemo } from "react";
import { TbArrowRight, TbBrandDiscordFilled, TbCheck } from "react-icons/tb";

export function meta() {
  return [
    {
      title: "CrawlChat Discord Bot",
      content:
        "Make AI chatbot from your documentation that handles your support queries. Embed it in your website, Discord, or Slack.",
    },
  ];
}

export default function DiscordBotPage() {
  const details = useMemo(() => {
    return {
      handle: "@crawlchat",
      installLink:
        "https://discord.com/oauth2/authorize?client_id=1346845279692918804",
    };
  }, []);
  const features = useMemo(() => {
    return [
      "Tag and ask questions",
      "Tag and make it learn",
      "Available 24x7",
      "Works in most of the languages",
      "Support tickets",
    ];
  }, []);
  const tags = useMemo(() => {
    return ["RAG", "AI", "Knowledge base", "Support"];
  }, []);

  return (
    <div className="flex flex-col gap-2 p-6 min-h-screen justify-center items-center">
      <div className="flex flex-col md:flex-row gap-6">
        <img
          className="w-[160px] h-[160px] border border-base-300 rounded-box"
          src="/discord-logo.png"
          alt="Discord Bot"
        />

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="badge badge-primary">
              <TbBrandDiscordFilled />
              Discord Bot
            </div>
            <div className="text-base-content/40 font-bold">
              {details.handle}
            </div>
          </div>
          <h2 className="text-2xl">
            CrawlChat - AI Chatbot for your documents
          </h2>
          <p>
            Discord bot that can answer your community queries with the
            knowledge base made on CrawlChat.
          </p>
          <div className="flex flex-col md:flex-row gap-2">
            <a className="btn" href={"/login"}>
              Setup knowledge base
            </a>

            <a className="btn btn-primary" href={details.installLink}>
              Add to your server
              <TbArrowRight />
            </a>
          </div>
          <div className="flex flex-col gap-2 my-4">
            <h3 className="text-md text-base-content/50">Features</h3>
            <ul className="flex flex-col gap-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <div className="bg-primary text-primary-content rounded-full p-1">
                    <TbCheck />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 flex-wrap">
              {tags.map((tag) => (
                <div key={tag} className="badge badge-primary badge-soft text-nowrap">
                  {tag}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-md text-base-content/50">Screenshots</h3>
            <img
              className="w-[600px] border border-base-300 rounded-box"
              src="/discord-sample.png"
              alt="Discord Bot"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
