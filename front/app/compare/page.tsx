import cn from "@meltdownjs/cn";
import { models } from "@packages/common";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TbArrowFork, TbArrowRight, TbTrash } from "react-icons/tb";
import { useLoaderData, useSearchParams } from "react-router";
import { getAuthUser } from "~/auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "~/auth/scrape-session";
import { EmptyState } from "~/components/empty-state";
import { Page } from "~/components/page";
import type { Route } from "./+types/page";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getAuthUser(request);
  const scrapeId = await getSessionScrapeId(request);
  authoriseScrapeUser(user!.scrapeUsers, scrapeId);

  const host = process.env.VITE_APP_URL;

  return {
    user,
    scrapeId,
    host,
  };
}

function useCompare() {
  const [loading, setLoading] = useState(0);
  const iframes = useRef<HTMLIFrameElement[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedModels = useMemo(() => {
    const rawModels = searchParams.get("models");
    if (rawModels) {
      return rawModels.split("-vs-");
    }
    return [];
  }, [searchParams]);

  function register(iframe: HTMLIFrameElement) {
    iframes.current.push(iframe);
  }

  function unregister(iframe: HTMLIFrameElement) {
    iframes.current = iframes.current.filter((i) => i !== iframe);
  }

  function ask(question: string) {
    iframes.current.forEach((iframe) => {
      iframe.contentWindow?.postMessage(
        JSON.stringify({ type: "query", query: question }),
        "*"
      );
    });
  }

  function removeModel(model: string) {
    const newModels = selectedModels.filter((m) => m !== model);
    setSearchParams({ models: newModels.join("-vs-") });
  }

  function addModel(model: string) {
    const newModels = [...selectedModels, model];
    setSearchParams({ models: newModels.join("-vs-") });
  }

  return {
    loading,
    register,
    ask,
    selectedModels,
    addModel,
    setLoading,
    unregister,
    removeModel,
  };
}

const CompareContext = createContext<ReturnType<typeof useCompare> | null>(
  null
);

function CompareProvider({ children }: { children: React.ReactNode }) {
  const state = useCompare();

  return (
    <CompareContext.Provider value={state}>{children}</CompareContext.Provider>
  );
}

function Widget({ model }: { model: string }) {
  const { host, scrapeId } = useLoaderData<typeof loader>();
  const { register, removeModel, setLoading, unregister } =
    useContext(CompareContext)!;
  const iframe = useRef<HTMLIFrameElement>(null);
  const name = useMemo(() => models[model].displayName, [model]);
  const mounted = useRef(false);
  const askedAt = useRef<number | null>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const [timeTaken, setTimeTaken] = useState(0);

  useEffect(() => {
    if (iframe.current && !mounted.current) {
      mounted.current = true;
      register(iframe.current);

      function handleMessage(event: MessageEvent) {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "answer") {
            setLoading((l) => l - 1);
            askedAt.current = null;
            if (timer.current) {
              clearInterval(timer.current);
              timer.current = null;
            }
          }
          if (data.type === "query") {
            askedAt.current = Date.now();
            setLoading((l) => l + 1);
            timer.current = setInterval(() => {
              setTimeTaken((t) => {
                if (!askedAt.current) return t;
                return Date.now() - askedAt.current;
              });
            }, 100);
          }
        } catch {}
      }

      iframe.current.contentWindow?.addEventListener("message", handleMessage);
      return () => {
        iframe.current?.contentWindow?.removeEventListener(
          "message",
          handleMessage
        );
        if (iframe.current) {
          unregister(iframe.current);
        }
      };
    }
  }, []);

  return (
    <div
      className={cn(
        "h-full border border-base-300",
        "rounded-box overflow-hidden",
        "flex flex-col flex-1 min-w-[300px] max-w-[600px]"
      )}
    >
      <div
        className={cn(
          "p-2 px-4 bg-base-100",
          "border-b border-base-300",
          "flex items-center gap-2 justify-between"
        )}
      >
        <div className="flex items-center gap-2">
          <div>{name}</div>
          {timeTaken > 0 && (
            <div className="badge badge-soft badge-primary badge-sm">
              {(timeTaken / 1000).toFixed(1)}s
            </div>
          )}
        </div>
        <button
          type="button"
          className={cn(
            "opacity-50 hover:opacity-100",
            "cursor-pointer transition-all"
          )}
          onClick={() => removeModel(model)}
        >
          <TbTrash />
        </button>
      </div>
      <iframe
        ref={iframe}
        src={`${host}/w/${scrapeId}?embed=true&small=true&incognito=true&aiModel=${model}&noToolbar=true&noInput=true`}
        className="flex-1"
      />
    </div>
  );
}

function Ask() {
  const { ask, loading, selectedModels } = useContext(CompareContext)!;
  const [question, setQuestion] = useState("");

  function handleAsk() {
    ask(question);
    setQuestion("");
  }

  return (
    <div
      className={cn(
        "mt-2 flex items-center gap-2",
        "p-2 bg-base-100 border border-base-300 rounded-box"
      )}
    >
      <input
        type="text"
        className="input flex-1"
        placeholder="Ask a question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        disabled={loading > 0 || selectedModels.length === 0}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleAsk();
          }
        }}
      />
      <button
        type="button"
        className="btn"
        onClick={handleAsk}
        disabled={!question.length || loading > 0}
      >
        Ask
        <TbArrowRight />
      </button>
    </div>
  );
}

function ModelSelector() {
  const { selectedModels, addModel } = useContext(CompareContext)!;

  function handleAddModel(model: string) {
    if (!model) return;
    addModel(model);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="select w-48"
        onChange={(e) => handleAddModel(e.target.value)}
        value={""}
      >
        <option value="" disabled selected>
          Add a model
        </option>
        {Object.entries(models)
          .filter(
            ([key, value]) => !value.deprecated && !selectedModels.includes(key)
          )
          .map(([key, value]) => (
            <option key={key} value={key}>
              {value.displayName}
            </option>
          ))}
      </select>
    </div>
  );
}

function Widgets() {
  const { selectedModels } = useContext(CompareContext)!;

  if (selectedModels.length === 0) return null;

  return (
    <div
      className={cn("w-full h-full flex gap-4 overflow-x-auto", "no-scrollbar")}
    >
      {selectedModels.map((model) => (
        <Widget key={model} model={model} />
      ))}
    </div>
  );
}

function Empty() {
  const { selectedModels } = useContext(CompareContext)!;

  if (selectedModels.length > 0) return null;

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <EmptyState
        icon={<TbArrowFork />}
        title="No models selected"
        description="Select some models to compare them."
      />
    </div>
  );
}

export default function ComparePage() {
  return (
    <CompareProvider>
      <Page
        title="Compare"
        description="Compare the performance of different models"
        icon={<TbArrowFork />}
        right={<ModelSelector />}
      >
        <Widgets />
        <Empty />
        <Ask />
      </Page>
    </CompareProvider>
  );
}
