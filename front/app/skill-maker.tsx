import { TbCopy, TbCode, TbDownload } from "react-icons/tb";
import { Page } from "./components/page";
import { getAuthUser } from "./auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "./auth/scrape-session";
import type { Route } from "./+types/skill-maker";
import { createToken } from "@packages/common/jwt";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { prisma, type Message, type Thread } from "@packages/common/prisma";
import { ComposerSection, useComposer } from "./compose";

const DEFAULT_FORMAT_TEXT = `Create a SINGLE skill.md file following Skill authoring best practices:

**Important: Create only ONE skill per file. Do not create multiple skill sections or multiple SKILL_*.md entries in the content.**

**Structure Requirements:**
- Include YAML frontmatter with 'name' (max 64 chars, lowercase/hyphens only) and 'description' (max 1024 chars, third person, includes what it does and when to use it)
- Keep SKILL.md body under 500 lines
- Use clean markdown with headings, lists, and code blocks
- Structure content for LLM understanding
- The title must always be in the format SKILL_{name}.md where {name} is the skill name in lowercase with hyphens (e.g., SKILL_processing-pdfs.md, SKILL_analyzing-spreadsheets.md)
- The content should describe ONE skill only - do not include multiple skill definitions or multiple SKILL_*.md sections

**Core Principles:**
- Be concise - assume Claude already knows common concepts
- Set appropriate degrees of freedom (high/medium/low based on task fragility)
- Use progressive disclosure - reference separate files for detailed content when needed
- Include examples with input/output pairs when helpful
- Use consistent terminology throughout
- Avoid time-sensitive information (use "old patterns" section if needed)

**Content Guidelines:**
- Use gerund form for skill names (e.g., "processing-pdfs", "analyzing-spreadsheets")
- Description must be in third person and include both what the Skill does and when to use it
- Include key terms in description for discoverability
- Use templates for strict output formats, flexible guidance for adaptable content
- Reference files should be one level deep from SKILL.md

**Format:**
- Use forward slashes in file paths (not Windows-style backslashes)
- Structure longer reference files with table of contents
- Provide utility scripts when operations are deterministic
- Make execution intent clear (execute vs read as reference)

Create clean, well-structured markdown that follows these best practices.

Here is an example
------
---
name: light-leaks
description: Light leak overlay effects for Remotion using @remotion/light-leaks.
metadata:
  tags: light-leaks, overlays, effects, transitions
---

## Light Leaks

This only works from Remotion 4.0.415 and up. Use \`npx remotion versions\` to check your Remotion version and \`npx remotion upgrade\` to upgrade your Remotion version.

\`<LightLeak>\` from \`@remotion/light-leaks\` renders a WebGL-based light leak effect. It reveals during the first half of its duration and retracts during the second half.

Typically used inside a \`<TransitionSeries.Overlay>\` to play over the cut point between two scenes. See the **transitions** rule for \`<TransitionSeries>\` and overlay usage.

## Prerequisites

\`\`\`bash
npx remotion add @remotion/light-leaks
\`\`\`

## Basic usage with TransitionSeries

\`\`\`tsx
import { TransitionSeries } from "@remotion/transitions";
import { LightLeak } from "@remotion/light-leaks";

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneA />
  </TransitionSeries.Sequence>
  <TransitionSeries.Overlay durationInFrames={30}>
    <LightLeak />
  </TransitionSeries.Overlay>
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneB />
  </TransitionSeries.Sequence>
</TransitionSeries>;
\`\`\`

## Props

- \`durationInFrames?\` — defaults to the parent sequence/composition duration. The effect reveals during the first half and retracts during the second half.
- \`seed?\` — determines the shape of the light leak pattern. Different seeds produce different patterns. Default: \`0\`.
- \`hueShift?\` — rotates the hue in degrees (\`0\`–\`360\`). Default: \`0\` (yellow-to-orange). \`120\` = green, \`240\` = blue.

## Customizing the look

\`\`\`tsx
import { LightLeak } from "@remotion/light-leaks";

// Blue-tinted light leak with a different pattern
<LightLeak seed={5} hueShift={240} />;

// Green-tinted light leak
<LightLeak seed={2} hueShift={120} />;
\`\`\`

## Standalone usage

\`<LightLeak>\` can also be used outside of \`<TransitionSeries>\`, for example as a decorative overlay in any composition:

\`\`\`tsx
import { AbsoluteFill } from "remotion";
import { LightLeak } from "@remotion/light-leaks";

const MyComp: React.FC = () => (
  <AbsoluteFill>
    <MyContent />
    <LightLeak durationInFrames={60} seed={3} />
  </AbsoluteFill>
);
\`\`\`
---`;

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const url = new URL(request.url);
  const threadId = url.searchParams.get("threadId");
  const text = url.searchParams.get("text");
  const submit = url.searchParams.get("submit");
  const format = url.searchParams.get("format");
  let thread: (Thread & { messages: Message[] }) | null = null;

  if (threadId) {
    thread = await prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        messages: true,
      },
    });
  }

  return {
    user,
    scrapeId,
    thread,
    text,
    submit,
    format,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "skill-maker") {
    const prompt = formData.get("prompt");
    const messages = formData.get("messages");
    const formatText = formData.get("formatText");
    const slate = formData.get("slate");
    const content = formData.get("content");
    const title = formData.get("title");

    const token = createToken(user!.id);
    const response = await fetch(
      `${process.env.VITE_SERVER_URL}/compose/${scrapeId}`,
      {
        method: "POST",
        body: JSON.stringify({
          prompt,
          messages,
          formatText,
          slate,
          content,
          title,
        }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    return {
      slate: data.slate,
      messages: data.messages,
      title: data.title,
    };
  }
}

export default function SkillMaker({ loaderData }: Route.ComponentProps) {
  const composer = useComposer({
    scrapeId: loaderData.scrapeId,
    intent: "skill-maker",
    action: "/tool/skill-maker",
    storageKeyPrefix: "skill-maker-state",
    init: {
      format: "markdown",
      formatText: DEFAULT_FORMAT_TEXT,
    },
  });

  useEffect(() => {
    if (loaderData.submit && composer.submitRef.current) {
      composer.submitRef.current.click();
    }
  }, [loaderData.submit]);

  function handleSave() {
    const filename =
      composer.state.title?.trim() &&
      composer.state.title.match(/^SKILL_.+\.md$/)
        ? composer.state.title
        : "SKILL.md";
    const blob = new Blob([composer.state.slate], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  }

  function handleCopy() {
    navigator.clipboard.writeText(composer.state.slate);
    toast.success("Copied to clipboard");
  }

  function handleClear() {
    localStorage.removeItem(`skill-maker-state-${loaderData.scrapeId}`);
    composer.setState({ slate: "", messages: [] });
  }

  return (
    <Page
      title="Skill maker"
      description="Create skill.md files optimized for LLM understanding"
      icon={<TbCode />}
      right={
        <>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!composer.state.slate?.trim()}
          >
            Download
            <TbDownload />
          </button>
          <button className="btn btn-soft btn-error" onClick={handleClear}>
            Clear
          </button>
          <button className="btn btn-soft btn-primary" onClick={handleCopy}>
            Copy <TbCopy />
          </button>
        </>
      }
    >
      <ComposerSection composer={composer} />
    </Page>
  );
}
