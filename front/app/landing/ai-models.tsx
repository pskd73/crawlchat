import cn from "@meltdownjs/cn";
import { models } from "@packages/common";
import { TbArrowRight, TbCheck, TbCoins, TbX } from "react-icons/tb";
import { Link } from "react-router";
import { makeMeta } from "~/meta";
import {
  Container,
  Heading,
  HeadingDescription,
  HeadingHighlight,
} from "./page";

export function meta() {
  return makeMeta({
    title: "AI Models - CrawlChat",
  });
}

function Check() {
  return (
    <div
      className={cn(
        "aspect-square w-6 bg-primary/20",
        "text-primary rounded-box flex items-center justify-center"
      )}
    >
      <TbCheck />
      <span className="hidden">Yes</span>
    </div>
  );
}

function X() {
  return (
    <div
      className={cn(
        "aspect-square w-6 bg-error/20 text-error",
        "rounded-box flex items-center justify-center"
      )}
    >
      <TbX />
      <span className="hidden">No</span>
    </div>
  );
}

function isNew(date: Date) {
  return date > new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
}

export default function AIModels() {
  const modelRows = Object.entries(models)
    .map(([key, model]) => ({
      ...model,
      key,
    }))
    .filter((model) => !model.deprecated);
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

        <div className="overflow-x-auto rounded-box border border-base-content/5">
          <table className="table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Provider</th>
                <th>Usage</th>
                <th>Speed</th>
                <th>Accuracy</th>
                <th>Image inputs</th>
              </tr>
            </thead>
            <tbody>
              {modelRows.map((row) => (
                <tr key={row.model}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="tooltip" data-tip={"Use it"}>
                        <Link
                          to={`/settings?model=${row.key}#ai-model`}
                          className="whitespace-nowrap link link-primary link-hover"
                        >
                          {row.displayName ?? row.model}
                        </Link>
                      </div>
                      {row.addedAt && isNew(row.addedAt) && (
                        <span className="badge badge-accent badge-soft badge-sm">
                          New
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="whitespace-nowrap">
                      {row.provider ?? "-"}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-primary badge-soft">
                      <TbCoins />
                      {row.creditsPerMessage}
                    </span>
                  </td>
                  <td>
                    <span className="whitespace-nowrap">{row.speed}</span>
                  </td>
                  <td>
                    <span className="whitespace-nowrap">{row.accuracy}</span>
                  </td>
                  <td>{row.imageInputs ? <Check /> : <X />}</td>
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
