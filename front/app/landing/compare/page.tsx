import cn from "@meltdownjs/cn";
import { BsClaude, BsPerplexity } from "react-icons/bs";
import { RiGeminiLine } from "react-icons/ri";
import { TbBrandOpenai, TbCheck, TbX } from "react-icons/tb";
import { makeMeta } from "~/meta";
import { Container } from "../page";
import type { Route } from "./+types/page";
import {
  chatbase,
  crawlchat,
  docsbot,
  featureNames,
  kapaai,
  mava,
  sitegpt,
  type FeatureName,
  type FeatureValue,
  type ProductFeatures,
} from "./comparison";

type Comparison = ProductFeatures[];

export async function loader({ params }: Route.LoaderArgs) {
  const slug = params.slug;
  const [, , product] = slug?.split("-") ?? [];

  if (!product) {
    throw new Error("Product not found");
  }

  const comparison: Comparison = [crawlchat];
  if (product === "kapaai") {
    comparison.push(kapaai);
  } else if (product === "docsbot") {
    comparison.push(docsbot);
  } else if (product === "sitegpt") {
    comparison.push(sitegpt);
  } else if (product === "chatbase") {
    comparison.push(chatbase);
  } else if (product === "mava") {
    comparison.push(mava);
  }

  return {
    slug: params.slug,
    comparison,
  };
}

export function meta({ loaderData }: Route.ComponentProps) {
  return makeMeta({
    title: `CrawlChat vs ${loaderData.comparison[1].name}`,
  });
}

function FeatureValueComponent({ value }: { value: FeatureValue }) {
  function main() {
    if (typeof value.value === "boolean") {
      return value.value ? (
        <div className="text-primary">
          <TbCheck />
          <span className="hidden">Yes</span>
        </div>
      ) : (
        <div className="text-base-content/20">
          <TbX className="text-base-content/20" />
          <span className="hidden">No</span>
        </div>
      );
    }
    return value.value;
  }

  function label() {
    return value.lable;
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <span>{main()}</span>
      <span className="text-xs text-base-content/50">{label()}</span>
    </div>
  );
}

export default function ComparePage({ loaderData }: Route.ComponentProps) {
  const crawlchat = loaderData.comparison[0];
  const competitor = loaderData.comparison[1];
  const aiQuestion = encodeURIComponent(
    `Compare ${crawlchat.name} (${crawlchat.url}) and ${competitor.name} (${competitor.url}) in detail for technical documentation`
  );

  return (
    <div className="flex flex-col gap-16 mt-16">
      <Container>
        <h1 className="text-4xl font-brand text-center">
          CrawlChat vs {competitor.name}
        </h1>

        <p className="text-center text-base-content/50 mt-8">
          Compare the features of CrawlChat and {competitor.name} to see which
          one is the best for your needs.
        </p>
      </Container>

      <Container>
        <div className="overflow-x-auto border border-base-300 rounded-box">
          <table className="table table-xl">
            <thead>
              <tr>
                <th className="w-1/3"></th>
                <td className="w-1/3 text-center text-2xl">CrawlChat</td>
                <td className="w-1/3 text-center text-2xl">
                  {competitor.name}
                </td>
              </tr>
            </thead>
            <tbody>
              {Object.keys(featureNames).map((key) => (
                <tr key={key}>
                  <td className="text-base-content/80">
                    {featureNames[key as FeatureName]}
                  </td>
                  <td className="text-center">
                    <FeatureValueComponent
                      value={
                        loaderData.comparison[0].features[key as FeatureName]
                      }
                    />
                  </td>
                  <td className="text-center">
                    <FeatureValueComponent
                      value={
                        loaderData.comparison[1].features[key as FeatureName]
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>

      <Container>
        <div
          className={cn(
            "flex flex-col md:flex-row items-center",
            "justify-center gap-4"
          )}
        >
          <span>Still not sure? Ask</span>
          <div className="flex items-center justify-center gap-4">
            <a
              target="_blank"
              href={`https://chatgpt.com/?q=${aiQuestion}`}
              className="tooltip"
              data-tip="Ask ChatGPT"
            >
              <TbBrandOpenai size={32} />
            </a>
            <a
              target="_blank"
              href={`https://claude.ai/?q=${aiQuestion}`}
              className="tooltip"
              data-tip="Ask Claude"
            >
              <BsClaude size={32} />
            </a>
            <a
              target="_blank"
              href={`https://www.google.com/search?udm=50&q=${aiQuestion}`}
              className="tooltip"
              data-tip="Ask Gemini"
            >
              <RiGeminiLine size={32} />
            </a>
            <a
              target="_blank"
              href={`https://www.perplexity.ai/?q=${aiQuestion}`}
              className="tooltip"
              data-tip="Ask Perplexity"
            >
              <BsPerplexity size={32} />
            </a>
          </div>
        </div>
      </Container>
    </div>
  );
}
