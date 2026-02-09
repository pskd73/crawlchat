import "./lexical-editor.css";
import {
  TbArrowUp,
  TbCopy,
  TbPencil,
  TbBold,
  TbItalic,
  TbUnderline,
  TbStrikethrough,
  TbList,
  TbListNumbers,
  TbQuote,
  TbCode,
  TbArrowBack,
  TbArrowForward,
  TbRefresh,
  TbLink,
} from "react-icons/tb";
import { Page } from "./components/page";
import { getAuthUser } from "./auth/middleware";
import { authoriseScrapeUser, getSessionScrapeId } from "./auth/scrape-session";
import type { Route } from "./+types/compose";
import { createToken } from "@packages/common/jwt";
import { useFetcher } from "react-router";
import { useEffect, useRef, useState } from "react";
import cn from "@meltdownjs/cn";
import toast from "react-hot-toast";
import { prisma, type Message, type Thread } from "@packages/common/prisma";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import {
  $getRoot,
  type EditorState,
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
} from "lexical";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from "@lexical/markdown";
import {
  HeadingNode,
  QuoteNode,
  $createQuoteNode,
  $isHeadingNode,
  $createHeadingNode,
} from "@lexical/rich-text";
import {
  ListItemNode,
  ListNode,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  $isListNode,
} from "@lexical/list";
import { CodeNode, CodeHighlightNode, $createCodeNode } from "@lexical/code";
import {
  LinkNode,
  $createLinkNode,
  $isLinkNode,
  TOGGLE_LINK_COMMAND,
} from "@lexical/link";
import { $setBlocksType } from "@lexical/selection";
import { $getSelection, $isRangeSelection } from "lexical";
import { $findMatchingParent } from "@lexical/utils";
import { $createParagraphNode } from "lexical";

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

  if (intent === "compose") {
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

type ComposeFormat = "markdown" | "email" | "tweet" | "linkedin-post";

export function useComposer({
  scrapeId,
  stateLess,
  init,
  prompt: inputPrompt,
  intent,
  action,
  storageKeyPrefix,
}: {
  scrapeId: string;
  stateLess?: boolean;
  prompt?: string;
  intent: string;
  action: string;
  storageKeyPrefix: string;
  init?: {
    format?: ComposeFormat;
    formatText?: string;
    state?: { slate: string; messages: any[]; title?: string };
  };
}) {
  const fetcher = useFetcher();
  const [state, setState] = useState<{
    slate: string;
    messages: any[];
    title?: string;
  }>(init?.state ?? { slate: "", messages: [], title: undefined });
  const [format, setFormat] = useState<ComposeFormat>(
    init?.format ?? "markdown"
  );
  const [formatText, setFormatText] = useState<string>(init?.formatText ?? "");
  const [formatTextActive, setFormatTextActive] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>(inputPrompt ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (fetcher.data && inputRef.current) {
      inputRef.current.value = "";

      setState((s) => ({
        slate: fetcher.data.slate,
        messages: fetcher.data.messages,
        title: fetcher.data.title,
      }));

      if (!stateLess) {
        localStorage.setItem(
          `${storageKeyPrefix}-${scrapeId}`,
          JSON.stringify({
            slate: fetcher.data.slate,
            messages: fetcher.data.messages,
            title: fetcher.data.title,
          })
        );
      }
    }
  }, [fetcher.data, scrapeId, stateLess, storageKeyPrefix]);

  useEffect(() => {
    if (stateLess) return;

    if (scrapeId && localStorage.getItem(`${storageKeyPrefix}-${scrapeId}`)) {
      setState(
        JSON.parse(localStorage.getItem(`${storageKeyPrefix}-${scrapeId}`)!)
      );
    }
  }, [scrapeId, stateLess, storageKeyPrefix]);

  function setSlate(text: string) {
    setState((old) => {
      const newState = old ?? { slate: "", messages: [] };
      newState.slate = text;
      newState.messages.push({
        role: "assistant",
        content: text,
      });
      return newState;
    });
  }

  function askEdit(content: string) {
    fetcher.submit(
      {
        intent,
        content,
        prompt,
        messages: JSON.stringify(state?.messages ?? []),
        formatText,
        format,
        slate: state.slate,
        title: state.title ?? "",
      },
      {
        method: "post",
        action,
      }
    );
  }

  return {
    format,
    setFormat,
    formatText,
    setFormatText,
    formatTextActive,
    setFormatTextActive,
    state,
    fetcher,
    inputRef,
    submitRef,
    setState,
    setSlate,
    askEdit,
    prompt,
    setPrompt,
  };
}

export type ComposerState = ReturnType<typeof useComposer>;

function MarkdownSyncPlugin({
  markdown,
  onMarkdownChange,
}: {
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const isUpdatingFromExternal = useRef(false);
  const lastMarkdownRef = useRef(markdown);

  useEffect(() => {
    if (lastMarkdownRef.current === markdown) return;

    isUpdatingFromExternal.current = true;
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      if (markdown) {
        $convertFromMarkdownString(markdown, TRANSFORMERS);
      }
    });
    lastMarkdownRef.current = markdown;
    isUpdatingFromExternal.current = false;
  }, [markdown, editor]);

  const handleChange = (editorState: EditorState) => {
    if (isUpdatingFromExternal.current) return;

    editorState.read(() => {
      const markdownString = $convertToMarkdownString(TRANSFORMERS);
      lastMarkdownRef.current = markdownString;
      onMarkdownChange(markdownString);
    });
  };

  return <OnChangePlugin onChange={handleChange} />;
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [blockType, setBlockType] = useState<string>("paragraph");
  const [isLink, setIsLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string>("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          setIsBold(selection.hasFormat("bold"));
          setIsItalic(selection.hasFormat("italic"));
          setIsUnderline(selection.hasFormat("underline"));
          setIsStrikethrough(selection.hasFormat("strikethrough"));

          const node = $findMatchingParent(selection.anchor.getNode(), (node) =>
            $isLinkNode(node)
          );
          if (node && $isLinkNode(node)) {
            setIsLink(true);
            setLinkUrl(node.getURL());
          } else {
            setIsLink(false);
            setLinkUrl("");
          }

          const anchorNode = selection.anchor.getNode();
          let element = anchorNode.getTopLevelElementOrThrow();

          const listItem = $findMatchingParent(anchorNode, (node) => {
            const parent = node.getParent();
            return parent !== null && $isListNode(parent);
          });

          if (listItem !== null) {
            const list = listItem.getParent();
            if ($isListNode(list)) {
              const listType = list.getListType();
              setBlockType(listType === "number" ? "ol" : "ul");
            }
          } else {
            const elementKey = element.getKey();
            const elementDOM = editor.getElementByKey(elementKey);

            if (elementDOM !== null) {
              if ($isHeadingNode(element)) {
                const tag = elementDOM.tagName.toLowerCase();
                setBlockType(tag);
              } else {
                const type = element.getType();
                if (type === "quote") {
                  setBlockType("quote");
                } else if (type === "code") {
                  setBlockType("code");
                } else {
                  setBlockType("paragraph");
                }
              }
            }
          }
        }
      });
    });
  }, [editor]);

  const formatText = (
    format: "bold" | "italic" | "underline" | "strikethrough"
  ) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (headingSize: "h1" | "h2" | "h3") => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () =>
          $createHeadingNode(
            headingSize as "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
          )
        );
      }
    });
  };

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  };

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });
  };

  const formatCode = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createCodeNode("plaintext"));
      }
    });
  };

  const formatBulletList = () => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  };

  const formatNumberedList = () => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  };

  const undo = () => {
    editor.dispatchCommand(UNDO_COMMAND, undefined);
  };

  const redo = () => {
    editor.dispatchCommand(REDO_COMMAND, undefined);
  };

  const formatLink = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const node = $findMatchingParent(selection.anchor.getNode(), (node) =>
          $isLinkNode(node)
        );
        if (node && $isLinkNode(node)) {
          setLinkUrl(node.getURL());
        } else {
          setLinkUrl("");
        }
      }
    });
    setTimeout(() => {
      linkInputRef.current?.focus();
    }, 0);
  };

  const handleLinkSubmit = () => {
    if (linkUrl.trim()) {
      let url = linkUrl.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
      setLinkUrl("");
      if (linkInputRef.current) {
        linkInputRef.current.blur();
      }
    }
  };

  const handleRemoveLink = () => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    setLinkUrl("");
    if (linkInputRef.current) {
      linkInputRef.current.blur();
    }
  };

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-base-300 bg-base-100 rounded-t-box">
      <div className="flex gap-1">
        <button
          type="button"
          className={cn(
            "btn btn-sm btn-ghost btn-square",
            isBold && "btn-active"
          )}
          onClick={() => formatText("bold")}
          aria-label="Bold"
        >
          <TbBold />
        </button>
        <button
          type="button"
          className={cn(
            "btn btn-sm btn-ghost btn-square",
            isItalic && "btn-active"
          )}
          onClick={() => formatText("italic")}
          aria-label="Italic"
        >
          <TbItalic />
        </button>
        <button
          type="button"
          className={cn(
            "btn btn-sm btn-ghost btn-square",
            isUnderline && "btn-active"
          )}
          onClick={() => formatText("underline")}
          aria-label="Underline"
        >
          <TbUnderline />
        </button>
        <button
          type="button"
          className={cn(
            "btn btn-sm btn-ghost btn-square",
            isStrikethrough && "btn-active"
          )}
          onClick={() => formatText("strikethrough")}
          aria-label="Strikethrough"
        >
          <TbStrikethrough />
        </button>
      </div>
      <div className="divider divider-horizontal mx-0" />
      <div className="flex gap-1">
        <button
          type="button"
          className={cn(
            "btn btn-sm btn-ghost btn-square",
            blockType === "h1" && "btn-active"
          )}
          onClick={() => formatHeading("h1")}
          aria-label="Heading 1"
          title="Heading 1"
        >
          <span className="text-xs font-bold">H1</span>
        </button>
        <button
          type="button"
          className={cn(
            "btn btn-sm btn-ghost btn-square",
            blockType === "h2" && "btn-active"
          )}
          onClick={() => formatHeading("h2")}
          aria-label="Heading 2"
          title="Heading 2"
        >
          <span className="text-xs font-bold">H2</span>
        </button>
        <button
          type="button"
          className={cn(
            "btn btn-sm btn-ghost btn-square",
            blockType === "h3" && "btn-active"
          )}
          onClick={() => formatHeading("h3")}
          aria-label="Heading 3"
          title="Heading 3"
        >
          <span className="text-xs font-bold">H3</span>
        </button>
      </div>
      <div className="divider divider-horizontal mx-0" />
      <div className="flex gap-1">
        <button
          type="button"
          className={cn(
            "btn btn-sm btn-ghost btn-square",
            blockType === "ul" && "btn-active"
          )}
          onClick={formatBulletList}
          aria-label="Bullet List"
        >
          <TbList />
        </button>
        <button
          type="button"
          className={cn(
            "btn btn-sm btn-ghost btn-square",
            blockType === "ol" && "btn-active"
          )}
          onClick={formatNumberedList}
          aria-label="Numbered List"
        >
          <TbListNumbers />
        </button>
        <button
          type="button"
          className={cn(
            "btn btn-sm btn-ghost btn-square",
            blockType === "quote" && "btn-active"
          )}
          onClick={formatQuote}
          aria-label="Quote"
        >
          <TbQuote />
        </button>
        <button
          type="button"
          className={cn(
            "btn btn-sm btn-ghost btn-square",
            blockType === "code" && "btn-active"
          )}
          onClick={formatCode}
          aria-label="Code"
        >
          <TbCode />
        </button>
        <div className="dropdown dropdown-center">
          <div
            tabIndex={0}
            role="button"
            className={cn(
              "btn btn-sm btn-ghost btn-square",
              isLink && "btn-active"
            )}
            onClick={formatLink}
            aria-label="Link"
          >
            <TbLink />
          </div>
          <div
            tabIndex={-1}
            className={cn(
              "dropdown-content menu bg-base-100 rounded-box z-[1]",
              "w-80 p-4 shadow-lg border border-base-300"
            )}
          >
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">
                {isLink ? "Edit Link" : "Add Link"}
              </label>
              <input
                ref={linkInputRef}
                type="text"
                className="input input-sm w-full"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLinkSubmit();
                  } else if (e.key === "Escape") {
                    if (linkInputRef.current) {
                      linkInputRef.current.blur();
                    }
                  }
                }}
              />
              <div className="flex gap-2 justify-end">
                {isLink && (
                  <button
                    type="button"
                    className="btn btn-sm btn-error"
                    onClick={handleRemoveLink}
                  >
                    Remove
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleLinkSubmit}
                >
                  {isLink ? "Update" : "Add Link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="divider divider-horizontal mx-0" />
      <div className="flex gap-1">
        <button
          type="button"
          className="btn btn-sm btn-ghost btn-square"
          onClick={undo}
          aria-label="Undo"
        >
          <TbArrowBack />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost btn-square"
          onClick={redo}
          aria-label="Redo"
        >
          <TbArrowForward />
        </button>
      </div>
    </div>
  );
}

function LexicalErrorBoundary({
  children,
  onError,
}: {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}) {
  return <>{children}</>;
}

function LexicalEditor({
  composer,
  markdown,
  onMarkdownChange,
  editable = true,
}: {
  composer: ComposerState;
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
  editable?: boolean;
}) {
  const initialConfig = {
    namespace: "compose-editor",
    theme: {
      heading: {
        h1: "text-3xl font-bold my-4",
        h2: "text-2xl font-bold my-3",
        h3: "text-xl font-bold my-2",
        h4: "text-lg font-bold my-2",
        h5: "text-base font-bold my-1",
        h6: "text-sm font-bold my-1",
      },
      text: {
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
        strikethrough: "line-through",
      },
      quote: "border-l-4 border-base-300 pl-4 my-4 italic text-base-content/70",
      code: "block bg-base-200 p-4 rounded my-4 text-sm font-mono whitespace-pre overflow-x-auto w-fit",
      codeHighlight: {
        javascript: "bg-base-200",
        typescript: "bg-base-200",
        html: "bg-base-200",
        css: "bg-base-200",
      },
      list: {
        nested: {
          listitem: "ml-6",
        },
        ol: "list-decimal ml-6 my-2",
        ul: "list-disc ml-6 my-2",
        listitem: "my-1",
      },
      link: "text-primary underline",
      paragraph: "my-2",
    },
    editable,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      LinkNode,
    ],
    editorState: () => {
      if (markdown) {
        $convertFromMarkdownString(markdown, TRANSFORMERS);
      }
    },
    onError: (error: Error) => {
      console.error(error);
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div>
        <div className="sticky top-[61px] z-10 bg-base-100">
          <TitleBar composer={composer} />
          <ToolbarPlugin />
        </div>

        <div className="relative lexical-editor-content">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="w-full min-h-[200px] p-4 focus:outline-none prose prose-sm max-w-none" />
            }
            placeholder={
              <div className="absolute top-4 left-4 text-base-content/50 pointer-events-none">
                {markdown ? "" : "Type or ask what to write below"}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <TabIndentationPlugin />
          <LinkPlugin />
          <MarkdownSyncPlugin
            markdown={markdown}
            onMarkdownChange={onMarkdownChange}
          />
        </div>
      </div>
    </LexicalComposer>
  );
}

function TitleBar({ composer }: { composer: ComposerState }) {
  function refreshTitle() {
    composer.askEdit("Update the title of the page");
  }

  return (
    <div className={cn("px-4 py-3 flex items-center border-b border-base-300")}>
      <input
        type="text"
        placeholder={"Title of the page"}
        className={cn("w-full outline-0")}
        name="title"
        value={composer.state.title ?? ""}
        onChange={(e) => {
          composer.setState((old) => ({
            ...old,
            title: e.target.value,
          }));
        }}
      />

      <button
        className="btn btn-ghost btn-square btn-xs"
        onClick={refreshTitle}
        disabled={composer.fetcher.state !== "idle"}
      >
        <TbRefresh />
      </button>
    </div>
  );
}

export function ComposerSection({
  composer,
  right,
}: {
  composer: ComposerState;
  right?: React.ReactNode;
}) {
  return (
    <div className="bg-base-100 border border-base-300 rounded-box">
      <LexicalEditor
        composer={composer}
        markdown={composer.state.slate}
        onMarkdownChange={(markdown) => {
          composer.setState((old) => ({
            ...old,
            slate: markdown,
          }));
        }}
        editable={true}
      />

      <div
        className={cn(
          "sticky bottom-0 z-10 border-t border-base-300",
          "bg-base-200"
        )}
      >
        <div className="flex gap-2 items-center p-2">
          <input
            className="input flex-1"
            type="text"
            name="prompt"
            placeholder="What to update?"
            ref={composer.inputRef}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                composer.askEdit(composer.inputRef.current?.value ?? "");
              }
            }}
            disabled={composer.fetcher.state !== "idle"}
          />

          <button
            type="submit"
            disabled={composer.fetcher.state !== "idle"}
            className={cn("btn btn-square")}
            ref={composer.submitRef}
            onClick={() =>
              composer.askEdit(composer.inputRef.current?.value ?? "")
            }
          >
            {composer.fetcher.state !== "idle" ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <TbArrowUp />
            )}
          </button>

          {right}
        </div>
      </div>
    </div>
  );
}

export default function Compose({ loaderData }: Route.ComponentProps) {
  const composer = useComposer({
    scrapeId: loaderData.scrapeId,
    intent: "compose",
    action: "/tool/compose",
    storageKeyPrefix: "compose-state",
    init: {
      format: loaderData.format as ComposeFormat,
    },
  });

  useEffect(() => {
    if (loaderData.submit && composer.submitRef.current) {
      composer.submitRef.current.click();
    }
  }, [loaderData.submit]);

  function handleCopy() {
    navigator.clipboard.writeText(composer.state.slate);
    toast.success("Copied to clipboard");
  }

  function handleClear() {
    localStorage.removeItem(`compose-state-${loaderData.scrapeId}`);
    composer.setState({ slate: "", messages: [] });
  }

  return (
    <Page
      title="Compose"
      description="Write along with AI from your knowledge base"
      icon={<TbPencil />}
      right={
        <>
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
