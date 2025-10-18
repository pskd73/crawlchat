import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js";
import { useState, type PropsWithChildren } from "react";
import {
  TbArrowRight,
  TbCheck,
  TbCircleCheckFilled,
  TbCopy,
} from "react-icons/tb";
import { jsonrepair } from "jsonrepair";
import cn from "@meltdownjs/cn";
import type { FetcherWithComponents } from "react-router";
import type { Scrape, Thread } from "libs/prisma";
import "./markdown-prose.css";
import "highlight.js/styles/xt256.min.css";
const linkifyRegex = require("remark-linkify-regex");

const RichCreateTicket = ({
  title: initialTitle,
  message: initialMessage,
  onTicketCreate,
  loading,
  disabled,
  customerEmail,
}: {
  title: string;
  message: string;
  onTicketCreate: (email: string, title: string, message: string) => void;
  loading?: boolean;
  disabled?: boolean;
  customerEmail?: string;
}) => {
  const [email, setEmail] = useState(customerEmail ?? "");
  const [title, setTitle] = useState(initialTitle);
  const [message, setMessage] = useState(initialMessage);

  function handleSubmit() {
    if (!email || !title || !message) {
      alert("Please fill in all fields");
      return;
    }

    onTicketCreate(email, title, message);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-4 border-base-300",
        "p-4 rounded-2xl max-w-[400px] w-full my-8"
      )}
    >
      {!loading && (
        <>
          <div className="text-lg font-bold">Create a support ticket</div>
          <input
            className="input w-full"
            placeholder="Title"
            defaultValue={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled}
          />
          <textarea
            className="textarea textarea-bordered w-full"
            placeholder="Message"
            defaultValue={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            disabled={disabled}
          />
          <input
            className="input w-full"
            placeholder="Email"
            defaultValue={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={disabled || !!customerEmail}
          />
          <div className="flex justify-end">
            <button className="btn" onClick={handleSubmit} disabled={disabled}>
              {loading && (
                <span className="loading loading-spinner loading-xs" />
              )}
              Create <TbArrowRight />
            </button>
          </div>
        </>
      )}
      {loading && (
        <div className="flex items-center justify-center">
          <span className="loading loading-spinner" />
        </div>
      )}
    </div>
  );
};

const RichVerifyEmail = ({
  thread,
  disabled,
  requestEmailVerificationFetcher,
  verifyEmailFetcher,
}: {
  scrape: Scrape;
  thread: Thread;
  email: string;
  disabled?: boolean;
  requestEmailVerificationFetcher: FetcherWithComponents<any>;
  verifyEmailFetcher: FetcherWithComponents<any>;
}) => {
  return (
    <div
      className={cn(
        "border-4 border-base-300",
        "p-4 rounded-2xl max-w-[400px] w-full my-8"
      )}
    >
      {!thread.emailVerifiedAt && !thread.emailOtp && (
        <requestEmailVerificationFetcher.Form
          method="post"
          className="flex flex-col md:flex-row gap-2"
        >
          <input
            type="hidden"
            name="intent"
            value="request-email-verification"
          />

          <input
            className="input w-full"
            placeholder="Email"
            name="email"
            disabled={
              disabled || requestEmailVerificationFetcher.state !== "idle"
            }
          />

          <button
            className="btn"
            disabled={
              disabled || requestEmailVerificationFetcher.state !== "idle"
            }
            type="submit"
          >
            {requestEmailVerificationFetcher.state !== "idle" && (
              <span className="loading loading-spinner loading-xs" />
            )}
            Verify <TbArrowRight />
          </button>
        </requestEmailVerificationFetcher.Form>
      )}
      {!thread.emailVerifiedAt && thread.emailOtp && (
        <verifyEmailFetcher.Form
          method="post"
          className="flex flex-col md:flex-row gap-2"
        >
          <input type="hidden" name="intent" value="verify-email" />

          <input
            className="input w-full"
            placeholder="OTP"
            name="otp"
            disabled={disabled}
          />

          <button
            className="btn"
            type="submit"
            disabled={disabled || verifyEmailFetcher.state !== "idle"}
          >
            {verifyEmailFetcher.state !== "idle" && (
              <span className="loading loading-spinner loading-xs" />
            )}
            Submit <TbCheck />
          </button>
        </verifyEmailFetcher.Form>
      )}

      {thread.emailVerifiedAt && (
        <div className="flex items-center gap-2 justify-between text-success">
          <div>Email verified</div>
          <div>
            <TbCircleCheckFilled size={24} />
          </div>
        </div>
      )}
    </div>
  );
};

function CodeCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <div
      className={cn(
        "absolute top-1 right-1 opacity-0 group-hover:opacity-100",
        "transition-opacity duration-100",
        copied && "opacity-100"
      )}
    >
      <button
        className={cn("btn btn-xs btn-square")}
        onClick={() => copyCode(code)}
      >
        {copied ? <TbCheck /> : <TbCopy />}
      </button>
    </div>
  );
}

export function MarkdownProse({
  thread,
  children,
  noMarginCode,
  sources,
  options,
}: PropsWithChildren<{
  thread?: Thread | null;
  noMarginCode?: boolean;
  sources?: Array<{ title: string; url?: string }>;
  options?: {
    onTicketCreate?: (
      title: string,
      description: string,
      email: string
    ) => void;
    ticketCreateLoading?: boolean;
    disabled?: boolean;
    customerEmail?: string;
    onSourceMouseEnter?: (index: number) => void;
    onSourceMouseLeave?: () => void;
    requestEmailVerificationFetcher?: FetcherWithComponents<any>;
    verifyEmailFetcher?: FetcherWithComponents<any>;
  };
}>) {
  return (
    <div className="prose markdown-prose">
      <Markdown
        remarkPlugins={[remarkGfm, linkifyRegex(/\!\![0-9a-zA-Z]+!!/)]}
        components={{
          code: ({ node, ...props }) => {
            const { children, className, ...rest } = props;

            if (!className) {
              return <code {...rest}>{children}</code>;
            }

            let language = className?.replace("language-", "");

            if (language.startsWith("json|")) {
              try {
                const json = JSON.parse(jsonrepair(children as string));
                if (
                  language === "json|create-ticket" &&
                  options?.onTicketCreate
                ) {
                  return (
                    <RichCreateTicket
                      {...json}
                      onTicketCreate={options.onTicketCreate}
                      loading={options.ticketCreateLoading}
                      disabled={options.disabled}
                      customerEmail={options.customerEmail}
                    />
                  );
                }
                if (
                  language === "json|verify-email" &&
                  thread &&
                  options?.requestEmailVerificationFetcher &&
                  options?.verifyEmailFetcher
                ) {
                  return (
                    <RichVerifyEmail
                      {...json}
                      disabled={options?.disabled}
                      thread={thread}
                      requestEmailVerificationFetcher={
                        options.requestEmailVerificationFetcher
                      }
                      verifyEmailFetcher={options.verifyEmailFetcher}
                    />
                  );
                }
              } catch (e) {
                console.log(e);
                return null;
              }
            }

            if (!hljs.listLanguages().includes(language)) {
              language = "bash";
            }
            const code = children as string;

            const highlighted = hljs.highlight(code ?? "", {
              language: language ?? "javascript",
            }).value;

            return (
              <div className="group">
                <div dangerouslySetInnerHTML={{ __html: highlighted }} />
                <CodeCopyButton code={code} />
              </div>
            );
          },
          pre: ({ node, ...props }) => {
            const { children, ...rest } = props;

            if (
              (children as any).props.className?.startsWith("language-json|")
            ) {
              return <div className="my-2">{children}</div>;
            }

            return (
              <pre
                {...rest}
                className="no-scrollbar"
                style={{
                  margin: noMarginCode ? 0 : undefined,
                  position: "relative",
                }}
              >
                {children}
              </pre>
            );
          },
          a: ({ node, ...props }) => {
            const { children, ...rest } = props;

            const defaultNode = <a {...rest}>{children}</a>;
            if (!sources || typeof children !== "string") {
              return children;
            }

            const match = children.match(/\!\!([0-9]*)!!/);
            if (children.startsWith("!!") && !match) {
              return null;
            } else if (!match) {
              return defaultNode;
            }

            const index = parseInt(match[1]);
            const source = sources[index];

            return (
              <span
                className={cn(
                  "badge badge-soft px-1 translate-y-[-6px]",
                  "text-[10px] leading-4 h-fit"
                )}
                onMouseEnter={() => options?.onSourceMouseEnter?.(index)}
                onMouseLeave={() => options?.onSourceMouseLeave?.()}
              >
                {source?.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    className="no-underline"
                    title={source?.title}
                  >
                    {index + 1}
                  </a>
                ) : (
                  <span>{index + 1}</span>
                )}
              </span>
            );
          },
        }}
      >
        {children as string}
      </Markdown>
    </div>
  );
}
