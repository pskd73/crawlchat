import type { Route } from "./+types/terms";
import { marked } from "marked";
import { LandingPage } from "./page";
import { Container } from "./page";
import fs from "fs";
import path from "path";

export function meta() {
  return [
    {
      title: "Terms of Service - CrawlChat",
    },
  ];
}

export async function loader() {
  const htmlContent = await marked.parse(
    fs.readFileSync(path.join(process.cwd(), "app/landing/terms.md"), "utf8")
  );

  return { htmlContent };
}

export default function Terms({ loaderData }: Route.ComponentProps) {
  return (
    <LandingPage>
      <div className="flex flex-col py-12">
        <Container>
          <div
            className="prose"
            dangerouslySetInnerHTML={{ __html: loaderData.htmlContent }}
          />
        </Container>
      </div>
    </LandingPage>
  );
}
