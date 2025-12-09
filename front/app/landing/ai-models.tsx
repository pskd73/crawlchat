import { makeMeta } from "~/meta";
import {
  Container,
  Heading,
  HeadingDescription,
  HeadingHighlight,
} from "./page";
import { TbArrowRight, TbCheck, TbX } from "react-icons/tb";

export function meta() {
  return makeMeta({
    title: "AI Models - CrawlChat",
  });
}

function Check() {
  return (
    <div className="aspect-square w-6 bg-primary text-primary-content rounded-box flex items-center justify-center">
      <TbCheck />
      <span className="hidden">Yes</span>
    </div>
  );
}

function X() {
  return (
    <div className="aspect-square w-6 bg-error text-error-content rounded-box flex items-center justify-center">
      <TbX />
      <span className="hidden">No</span>
    </div>
  );
}

export default function AIModels() {
  const features = [
    {
      feature: "Provider",
      gpt_4o_mini: "OpenAI",
      haiku_4_5: "Anthropic",
      gpt_5: "OpenAI",
      sonnet_4_5: "Anthropic",
    },
    {
      feature: "Credits per message",
      gpt_4o_mini: "1",
      haiku_4_5: "2",
      gpt_5: "4",
      sonnet_4_5: "6",
    },
    {
      feature: "Speed",
      gpt_4o_mini: "Super fast",
      haiku_4_5: "Fast",
      gpt_5: "Slow",
      sonnet_4_5: "Fast",
    },
    {
      feature: "Accuracy",
      gpt_4o_mini: "Basic",
      haiku_4_5: "Good",
      gpt_5: "Best",
      sonnet_4_5: "Best",
    },
    {
      feature: "Hobby plan",
      gpt_4o_mini: <Check />,
      haiku_4_5: <Check />,
      gpt_5: <X />,
      sonnet_4_5: <X />,
    },
    {
      feature: "Starter plan",
      gpt_4o_mini: <Check />,
      haiku_4_5: <Check />,
      gpt_5: <X />,
      sonnet_4_5: <X />,
    },
    {
      feature: "Pro plan",
      gpt_4o_mini: <Check />,
      haiku_4_5: <Check />,
      gpt_5: <Check />,
      sonnet_4_5: <Check />,
    },
    {
      feature: "Image inputs",
      gpt_4o_mini: <X />,
      haiku_4_5: <Check />,
      gpt_5: <Check />,
      sonnet_4_5: <Check />,
    },
  ];
  return (
    <>
      <Container>
        <div className="mt-10">
          <Heading>
            Best <HeadingHighlight>AI Models</HeadingHighlight>
          </Heading>
          <HeadingDescription>
            CrawlChat supports multiple AI models to choose from. Each model
            comes with its own advantages. You can choose them from settings
            section of your collection.
          </HeadingDescription>
        </div>

        <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-200">
          <table className="table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>4o-mini</th>
                <th>Haiku 4.5</th>
                <th>GPT 5</th>
                <th>Sonnet 4.5</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => (
                <tr key={feature.feature}>
                  <td>{feature.feature}</td>
                  <td>{feature.gpt_4o_mini}</td>
                  <td>{feature.haiku_4_5}</td>
                  <td>{feature.gpt_5}</td>
                  <td>{feature.sonnet_4_5}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-center mt-4">
          <a href="/settings#ai-model" className="btn btn-primary btn-soft">
            Configure your AI model <TbArrowRight />
          </a>
        </div>
      </Container>
    </>
  );
}
