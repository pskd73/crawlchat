import cn from "@meltdownjs/cn";
import { useState } from "react";
import { TbArrowRight } from "react-icons/tb";
import { makeMeta } from "~/meta";
import {
  Container,
  Heading,
  HeadingDescription,
  HeadingHighlight,
} from "./page";

export function meta() {
  return makeMeta({
    title: "Ask GitHub Repo - Chat with GitHub repo code",
    description:
      "Ask GitHub Repo helps you chat with GitHub repo code instantly. Paste a public repository URL to chat with code and get answers in seconds.",
  });
}

function parseGithubRepoUrl(input: string) {
  const match = input
    .trim()
    .match(
      /^https:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i
    );
  if (!match) {
    return null;
  }
  return {
    org: match[1],
    repo: match[2],
  };
}

export default function AskGithubRepoPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }

    const parsed = parseGithubRepoUrl(repoUrl);
    if (!parsed) {
      alert("Enter a valid public GitHub repository URL.");
      return;
    }

    setLoading(true);
    const response = await fetch(
      `https://api.github.com/repos/${parsed.org}/${parsed.repo}`
    );

    if (!response.ok) {
      setLoading(false);
      alert("Repository not found or not public.");
      return;
    }

    const data = await response.json();

    if (data.private) {
      setLoading(false);
      alert("Repository not found or not public.");
      return;
    }

    window.location.href = `https://gitcrawl.chat/github.com/${parsed.org}/${parsed.repo}`;
  }

  return (
    <Container>
      <div className="py-12 md:py-20">
        <Heading>
          <HeadingHighlight>Ask GitHub Repo</HeadingHighlight> and chat with
          code
        </Heading>
        <HeadingDescription>
          Paste any public repository URL to ask github repo questions, chat
          with code directly. Works with any programming language and any public
          repository. Perfect for developers, support engineers, and product
          teams who need fast answers from code.
        </HeadingDescription>

        <form
          onSubmit={handleSubmit}
          className={cn(
            "max-w-4xl mx-auto mt-8 gap-4",
            "flex flex-col md:flex-row"
          )}
        >
          <input
            type="url"
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder="https://github.com/org/repo"
            className="input input-xl md:flex-1 w-full"
            required
          />
          <button
            type="submit"
            className="btn btn-primary btn-xl"
            disabled={loading}
          >
            {loading ? "Checking" : "Chat with code"}
            {!loading && <TbArrowRight />}
          </button>
        </form>

        <div className="max-w-4xl mx-auto mt-16 grid gap-6">
          <section className="border border-base-300 rounded-box p-6">
            <h2 className="text-2xl font-brand">Why use Ask GitHub Repo</h2>
            <p className="mt-3 text-base-content/80">
              Ask GitHub Repo is built for developers, support engineers, and
              product teams who need fast answers from code. Instead of scanning
              dozens of files, you can ask questions in natural language and
              chat with github repo content in seconds.
            </p>
          </section>

          <section className="border border-base-300 rounded-box p-6">
            <h2 className="text-2xl font-brand">
              Chat with code for faster work
            </h2>
            <p className="mt-3 text-base-content/80">
              When you chat with code, onboarding gets easier, debugging becomes
              faster, and handoffs are clearer. Ask architecture questions,
              trace implementation details, and understand how modules connect
              without opening every file manually.
            </p>
          </section>

          <section className="border border-base-300 rounded-box p-6">
            <h2 className="text-2xl font-brand">What you can ask</h2>
            <ul className="mt-3 list-disc list-inside text-base-content/80 space-y-2">
              <li>Where is a feature implemented and how does it work?</li>
              <li>Which files handle authentication, billing, or API calls?</li>
              <li>How does a data flow move from frontend to backend?</li>
              <li>What changed in a component and what could break next?</li>
            </ul>
          </section>

          <section className="border border-base-300 rounded-box p-6">
            <h2 className="text-2xl font-brand">
              Chat with GitHub repo in three steps
            </h2>
            <ol className="mt-3 list-decimal list-inside text-base-content/80 space-y-2">
              <li>Paste a public GitHub URL.</li>
              <li>Open the generated chat for that repository.</li>
              <li>Ask questions and get code-aware answers instantly.</li>
            </ol>
            <p className="mt-3 text-base-content/80">
              If you want to chat with github repo files quickly, this flow
              helps you skip manual searching and go straight to understanding
              implementation details.
            </p>
          </section>

          <section className="border border-base-300 rounded-box p-6">
            <h2 className="text-2xl font-brand">
              Best way to chat with GitHub repo code
            </h2>
            <p className="mt-3 text-base-content/80">
              Ask GitHub Repo gives teams a simple way to chat with github repo
              code for onboarding, incident response, feature planning, and QA.
              Ask detailed questions about files, functions, and architecture to
              move faster with less context switching.
            </p>
            <p className="mt-3 text-base-content/80">
              Whether you need to ask github repo questions for React, Node.js,
              Python, Go, Java, Rust, or mixed stacks, you can use one workflow
              to understand the codebase and make decisions with confidence.
            </p>
          </section>

          <section className="border border-base-300 rounded-box p-6">
            <h2 className="text-2xl font-brand">FAQ: Chat with GitHub repo</h2>
            <div className="mt-3 space-y-4 text-base-content/80">
              <div>
                <h3 className="font-medium">
                  Can I chat with any public GitHub repo?
                </h3>
                <p>
                  Yes. Paste any public repository URL and start chatting with
                  github repo content in seconds.
                </p>
              </div>
              <div>
                <h3 className="font-medium">
                  What types of questions can I ask?
                </h3>
                <p>
                  You can ask about implementation details, architecture,
                  dependencies, API routes, and where specific logic lives.
                </p>
              </div>
              <div>
                <h3 className="font-medium">
                  Is this useful for large repositories?
                </h3>
                <p>
                  Yes. Chat with github repo workflows are especially useful for
                  large codebases where manual navigation takes too long.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Container>
  );
}
