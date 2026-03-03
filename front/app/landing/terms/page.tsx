import fs from "fs";
import { marked } from "marked";
import path from "path";
import { makeMeta } from "~/meta";
import { Container, LandingPage } from "../page";
import type { Route } from "./+types/page";

export function meta() {
  return makeMeta({
    title: "Terms of Service - CrawlChat",
  });
}

export async function loader() {
  const htmlContent = await marked.parse(
    fs.readFileSync(
      path.join(process.cwd(), "app/landing/terms/content.md"),
      "utf8"
    )
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
