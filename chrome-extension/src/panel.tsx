import { useEffect, useMemo, useRef, useState } from "react";
import { TbAlertCircle, TbCheck, TbCopy, TbPencil, TbX } from "react-icons/tb";
import { Config } from "./config";
import cn from "@meltdownjs/cn";

const Panel = ({
  config,
  currentValue,
  onClose,
  onUse,
  onCopy,
  onFocus,
  submit,
  autoUse,
}: {
  config: Config;
  currentValue: string;
  onClose: () => void;
  onUse?: (content: string) => void;
  onCopy: (content: string) => void;
  onFocus: () => void;
  submit?: boolean;
  autoUse?: boolean;
}) => {
  const input = useMemo(() => {
    if (currentValue.startsWith("@")) {
      return {
        content: "",
        messages: [],
        prompt: currentValue.replace(/^@/, "").trim(),
      };
    }
    return {
      content: currentValue,
      messages: [
        {
          role: "assistant",
          content: currentValue,
        },
      ],
      prompt: "",
    };
  }, [currentValue]);
  const [compose, setCompose] = useState<{ content: string; messages: any }>({
    content: input.content,
    messages: input.messages,
  });
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeError, setComposeError] = useState<string>();
  const [currentPrompt, setCurrentPrompt] = useState<string>(input.prompt);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const useBtnRef = useRef<HTMLButtonElement>(null);
  const prompt = useMemo(() => {
    if (!compose) {
      return [currentValue, currentPrompt]
        .map((c) => c.trim())
        .filter(Boolean)
        .join("\n");
    }
    return currentPrompt;
  }, [compose, currentValue, currentPrompt]);

  useEffect(() => {
    if (
      submit &&
      prompt &&
      config?.apiKey &&
      config.scrapeId &&
      !compose.content
    ) {
      handleUpdate();
    }
  }, [config, submit, prompt, compose]);

  useEffect(() => {
    if (autoUse && compose && compose.content && onUse) {
      onUse(compose.content);
    }
  }, [autoUse, compose, onUse]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  async function updateCompose(
    prompt: string,
    messages: any,
    formatText: string
  ) {
    setComposeLoading(true);
    setComposeError(undefined);

    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "API_COMPOSE",
          config,
          prompt,
          messages,
          formatText,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });

    const result = response as { success: boolean; data?: any; error?: string };

    if (!result.success) {
      setComposeError(result.error || "Unknown error occurred");
      setComposeLoading(false);
      return;
    }

    setCompose({
      content: result.data.content,
      messages: result.data.messages,
    });
    setComposeLoading(false);
    setCurrentPrompt("");

    setTimeout(() => {
      if (useBtnRef.current) {
        useBtnRef.current.focus();
      }
    }, 100);
  }

  function handleUpdate() {
    if (!prompt) return;

    console.log(compose);

    updateCompose(
      prompt,
      JSON.stringify(compose?.messages ?? []),
      config.chatPrompt ?? ""
    );
  }

  function handleUse() {
    if (!compose) return;
    onUse?.(compose.content);
  }

  function handleCopy() {
    if (!compose) return;
    onCopy(compose.content);
  }

  return (
    <div
      data-theme="brand"
      className={cn(
        "crawlchat-panel w-full h-full bg-white",
        "border-l border-t border-r border-base-300",
        "shadow-2xl flex flex-col font-sans",
        "rounded-t-box overflow-hidden"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <img
            src="https://crawlchat.app/logo.png"
            alt="CrawlChat"
            className="w-6 h-6"
          />
          <span className="font-semibold text-gray-800">CrawlChat</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="tooltip tooltip-left" data-tip="Copy to clipboard">
            <button
              className="btn btn-square btn-xs"
              disabled={!compose.content}
              onClick={handleCopy}
            >
              <TbCopy />
            </button>
          </div>
          <button
            onClick={onClose}
            className="btn btn-square btn-xs"
            title="Close panel"
          >
            <TbX />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
        {compose.content.trim() && (
          <div
            className={cn(
              "border border-base-300 rounded-box",
              "p-3 overflow-y-auto bg-base-100",
              "flex-1 overflow-auto text-sm max-h-[400px]"
            )}
            dangerouslySetInnerHTML={{
              __html: compose.content
                ? compose.content.replace(/\n/g, "<br>")
                : `<div class="w-full h-full flex items-center justify-center">
              Start making the content
            </div>`,
            }}
          />
        )}

        {composeError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
            <TbAlertCircle className="w-4 h-4" />
            <span className="text-sm">{composeError}</span>
          </div>
        )}

        <textarea
          className="textarea w-full disabled:bg-base-100 resize-none"
          ref={textareaRef}
          value={currentPrompt}
          rows={1}
          placeholder={compose ? "What to update?" : "What to write about?"}
          onChange={(e) => setCurrentPrompt(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          onKeyPress={(e) => e.stopPropagation()}
          disabled={composeLoading}
        />

        <div className="flex gap-2">
          <button
            className="btn btn-neutral flex-1"
            onClick={handleUpdate}
            disabled={composeLoading || !prompt}
            type="button"
          >
            {composeLoading && (
              <div className="loading loading-spinner loading-xs" />
            )}
            <TbPencil />
            {compose ? "Update" : "Write up"}
          </button>
          {compose && onUse && (
            <button
              ref={useBtnRef}
              className="btn btn-primary flex-1"
              disabled={composeLoading || !compose.content}
              onClick={handleUse}
              tabIndex={0}
              type="button"
              onMouseEnter={onFocus}
            >
              Use it
              <TbCheck />
            </button>
          )}
          {compose && !onUse && (
            <button
              ref={useBtnRef}
              className="btn btn-primary flex-1"
              disabled={composeLoading || !compose.content}
              onClick={handleCopy}
              tabIndex={0}
              type="button"
            >
              Copy <TbCopy />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Panel;
