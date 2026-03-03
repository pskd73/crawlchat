import { prisma } from "@packages/common/prisma";
import { TbCode } from "react-icons/tb";
import { Link } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { Page } from "~/components/page";
import {
  SettingsContainer,
  SettingsSection,
  SettingsSectionProvider,
} from "~/components/settings-section";
import { makeMeta } from "~/meta";
import { MarkdownProse } from "~/widget/markdown-prose";
import type { Route } from "./+types/embed";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const scrape = await prisma.scrape.findUnique({
    where: {
      id: scrapeId,
    },
  });

  return { scrape };
}

export function meta({ data }: Route.MetaArgs) {
  return makeMeta({
    title: "API - CrawlChat",
  });
}

type CodeSnippet = {
  name: string;
  language: string;
  code: string;
};

function SampleAPICode({ codeSnippets }: { codeSnippets: CodeSnippet[] }) {
  return (
    <div className="tabs tabs-lift">
      {codeSnippets.map((snippet, index) => (
        <>
          <input
            type="radio"
            name="embed-code"
            className="tab"
            aria-label={snippet.name}
            key={snippet.language}
            defaultChecked={index === 0}
          />
          <div className="tab-content bg-base-100 border-base-300 p-4">
            <MarkdownProse>
              {`\`\`\`${snippet.language}\n${snippet.code}\n\`\`\``}
            </MarkdownProse>
          </div>
        </>
      ))}
    </div>
  );
}

export default function APIIntegrate({ loaderData }: Route.ComponentProps) {
  return (
    <Page title={"API"} icon={<TbCode />}>
      <SettingsSectionProvider>
        <SettingsContainer>
          <SettingsSection
            id="answer"
            title="Answer API"
            description="Use this API to get an answer from your knowledge base for any query."
          >
            <div className="flex flex-col gap-2 flex-1">
              <SampleAPICode
                codeSnippets={[
                  {
                    name: "Curl",
                    language: "bash",
                    code: `curl --location 
--request POST 'https://wings.crawlchat.app/answer/{{YOUR_COLLECTION_ID}}'
--header 'x-api-key: {{YOUR_API_KEY}}'
--header 'Content-Type: application/json'
--data-raw '{
    "query": "How to setup the Discord bot?",
    "prompt": "Keep it as short as possible",
    "clientUserId": "user-123"
}'`,
                  },
                  {
                    name: "JavaScript",
                    language: "javascript",
                    code: `const response = await fetch('https://wings.crawlchat.app/answer/{{YOUR_COLLECTION_ID}}', {
  method: 'POST',
  headers: {
    'x-api-key': '{{YOUR_API_KEY}}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'How to setup the Discord bot?',
    prompt: 'Keep it as short as possible',
    clientUserId: 'user-123'
  })
});

const data = await response.json();
console.log(data);
`,
                  },
                  {
                    name: "Python",
                    language: "python",
                    code: `import requests
import json

url = 'https://wings.crawlchat.app/answer/{{YOUR_COLLECTION_ID}}'

headers = {
    'x-api-key': '{{YOUR_API_KEY}}',
    'Content-Type': 'application/json'
}

data = {
    'query': 'How to setup the Discord bot?',
    'prompt': 'Keep it as short as possible',
    'clientUserId': 'user-123'
}

response = requests.post(url, headers=headers, json=data)
result = response.json()

print(result)`,
                  },
                ]}
              />
            </div>

            <p className="text-sm text-base-content/60">
              Replace <code>{`{{YOUR_COLLECTION_ID}}`}</code> and{" "}
              <code>{`{{YOUR_API_KEY}}`}</code> with your own{" "}
              <Link to="/api-key" className="link link-primary link-hover">
                API Key
              </Link>
              . Check{" "}
              <a
                href="https://docs.crawlchat.app/api/answer"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary link-hover"
              >
                documentation
              </a>{" "}
              for more details.
            </p>
          </SettingsSection>
        </SettingsContainer>
      </SettingsSectionProvider>
    </Page>
  );
}
