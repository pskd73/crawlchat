import type { Route } from "./+types/page";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/scrapes/util";
import { Page } from "~/components/page";
import { createToken } from "libs/jwt";
import { useFetcher } from "react-router";
import { useEffect, useState, useRef, useMemo } from "react";
import cn from "@meltdownjs/cn";
import toast from "react-hot-toast";
import { TbCheck } from "react-icons/tb";
import { SettingsSection } from "~/settings-section";

type FactWithScore = {
  fact: string;
  score: number;
  reason?: string;
};

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  return {
    user,
    scrapeId,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "extract-facts") {
    const text = formData.get("text") as string;

    const token = createToken(user!.id);
    const response = await fetch(
      `${process.env.VITE_SERVER_URL}/extract-facts/${scrapeId}`,
      {
        method: "POST",
        body: JSON.stringify({ text }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || "Failed to extract facts" };
    }

    const data = await response.json();
    return { facts: data.facts || [] };
  }

  return {};
}

function getScoreColor(score: number): string {
  if (score === -1) return "bg-base-300";
  if (score >= 0.8) return "bg-green-200 text-green-800";
  if (score >= 0.5) return "bg-yellow-200 text-yellow-800";
  return "bg-red-200 text-red-800";
}

function Tooltip({
  children,
  text,
}: {
  children: React.ReactNode;
  text: string;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show || !ref.current || !tooltipRef.current) return;

    const updatePosition = () => {
      if (!ref.current || !tooltipRef.current) return;
      const rect = ref.current.getBoundingClientRect();
      tooltipRef.current.style.top = `${rect.top + window.scrollY - 5}px`;
      tooltipRef.current.style.left = `${rect.left + rect.width / 2}px`;
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [show]);

  return (
    <span
      ref={ref}
      className="relative inline"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-2 py-1 text-xs bg-gray-900 text-white rounded shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            transform: "translate(-50%, -100%)",
          }}
        >
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 -mt-px" />
        </div>
      )}
    </span>
  );
}

function highlightFacts(
  text: string,
  factsWithScores: FactWithScore[]
): React.ReactNode[] {
  if (factsWithScores.length === 0) {
    return [text];
  }

  const parts: Array<{
    text: string;
    score?: number;
    reason?: string;
    start: number;
    end: number;
  }> = [];

  for (const { fact, score, reason } of factsWithScores) {
    let searchIndex = 0;
    while (true) {
      const index = text.indexOf(fact, searchIndex);
      if (index === -1) break;

      parts.push({
        text: fact,
        score,
        reason,
        start: index,
        end: index + fact.length,
      });

      searchIndex = index + 1;
    }
  }

  parts.sort((a, b) => a.start - b.start);

  const result: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const part of parts) {
    if (part.start < lastIndex) continue;

    if (part.start > lastIndex) {
      result.push(text.slice(lastIndex, part.start));
    }

    const scorePercent = ((part.score || 0) * 100).toFixed(0);
    const tooltipText = part.reason
      ? `Score: ${scorePercent}% - ${part.reason}`
      : `Score: ${scorePercent}%`;

    result.push(
      <Tooltip key={`${part.text}-${part.start}`} text={tooltipText}>
        <span
          className={cn(
            "px-1 rounded font-medium cursor-help inline",
            getScoreColor(part.score || 0)
          )}
        >
          {part.text}
        </span>
      </Tooltip>
    );

    lastIndex = part.end;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : [text];
}

function Facts({
  scores,
  text,
}: {
  text: string;
  scores: Record<string, { score: number; reason: string }>;
}) {
  return (
    <div>
      {highlightFacts(
        text,
        Object.entries(scores).map(([fact, data]) => ({
          fact,
          score: data.score,
          reason: data.reason,
        }))
      )}
    </div>
  );
}

export default function FactCheckPage() {
  const extractFetcher = useFetcher();
  const [text, setText] = useState("");
  const [scores, setScores] = useState<
    Record<string, { score: number; reason: string }>
  >({});
  const progress = useMemo(() => {
    const total = Object.keys(scores).length;
    const checked = Object.values(scores).filter(
      (score) => score.score !== -1
    ).length;
    return Math.round((checked / total) * 100);
  }, [scores]);

  useEffect(() => {
    if (extractFetcher.data?.facts) {
      const scores: Record<string, { score: number; reason: string }> = {};
      for (const fact of extractFetcher.data.facts) {
        scores[fact] = { score: -1, reason: "" };
      }
      setScores(scores);

      (async () => {
        for (const fact of Object.keys(scores)) {
          if (scores[fact].score === -1) {
            const { score, reason } = await checkFact(fact);
            setScores((prev) => ({ ...prev, [fact]: { score, reason } }));
          }
        }
      })();
    }

    if (extractFetcher.data?.error) {
      toast.error(extractFetcher.data.error);
    }
  }, [extractFetcher.data]);

  async function checkFact(fact: string) {
    const formData = new FormData();
    formData.append("intent", "check-fact");
    formData.append("fact", fact);

    const response = await fetch("/fact-check/api", {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to check fact");
    }

    return await response.json();
  }

  return (
    <Page title="Fact Check" icon={<TbCheck />}>
      {!extractFetcher.data?.facts && (
        <SettingsSection
          fetcher={extractFetcher}
          saveLabel="Submit"
          savePrimary
        >
          <input type="hidden" name="intent" value="extract-facts" />
          <textarea
            name="text"
            className="textarea w-full"
            rows={10}
            placeholder="Enter the text you want to fact-check..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </SettingsSection>
      )}

      {extractFetcher.data?.facts && (
        <SettingsSection
          actionRight={
            <progress
              className="progress progress-success w-full"
              value={progress}
              max="100"
            />
          }
        >
          <Facts scores={scores} text={text} />
        </SettingsSection>
      )}
    </Page>
  );
}
