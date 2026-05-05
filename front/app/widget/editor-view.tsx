import cn from "@meltdownjs/cn";
import hljs from "highlight.js";
import JSZip from "jszip";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  TbChevronDown,
  TbChevronRight,
  TbCopy,
  TbDownload,
  TbFile,
  TbZip,
} from "react-icons/tb";
import { extensionLanguageMap } from "./highlight-language";
import type { SnapshotFiles } from "./use-chat";
import { useChatBoxContext } from "./use-chat-box";

type FsNode =
  | { kind: "dir"; path: string; name: string; children: FsNode[] }
  | { kind: "file"; path: string; name: string };

function compareFsNodes(a: FsNode, b: FsNode): number {
  const aDir = a.kind === "dir";
  const bDir = b.kind === "dir";
  if (aDir !== bDir) {
    return aDir ? -1 : 1;
  }
  return a.name.localeCompare(b.name);
}

function ensureDir(
  children: FsNode[],
  segment: string,
  dirPath: string
): Extract<FsNode, { kind: "dir" }> {
  let dir = children.find(
    (c): c is Extract<FsNode, { kind: "dir" }> =>
      c.kind === "dir" && c.name === segment
  );
  if (!dir) {
    dir = { kind: "dir", path: dirPath, name: segment, children: [] };
    children.push(dir);
    children.sort(compareFsNodes);
  }
  return dir;
}

function buildFileTree(paths: string[]): FsNode[] {
  const root: FsNode[] = [];
  for (const fullPath of paths) {
    const segments = fullPath.split("/").filter(Boolean);
    if (!segments.length) {
      continue;
    }
    let current = root;
    let prefix = "";
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      prefix = prefix ? `${prefix}/${seg}` : seg;
      const dir = ensureDir(current, seg, prefix);
      current = dir.children;
    }
    const fileName = segments[segments.length - 1];
    current.push({ kind: "file", path: fullPath, name: fileName });
    current.sort(compareFsNodes);
  }
  return root;
}

function highlight(filePath: string): string {
  const base = filePath.split("/").pop() ?? filePath;
  const dot = base.lastIndexOf(".");
  const ext = dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
  return extensionLanguageMap[ext] ?? ext;
}

function EditorFileTree({
  files,
  activeFile,
  onSelectFile,
}: {
  files: SnapshotFiles;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}) {
  const paths = useMemo(
    () => Object.keys(files).sort((a, b) => a.localeCompare(b)),
    [files]
  );
  const nodes = useMemo(() => buildFileTree(paths), [paths]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  function toggleDir(dirPath: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
      }
      return next;
    });
  }

  function renderNodes(list: FsNode[], depth: number) {
    return list.map((node) => {
      if (node.kind === "file") {
        const selected = node.path === activeFile;
        return (
          <div
            key={node.path}
            className={cn(
              "flex w-full min-w-0 items-center gap-1",
              "rounded-box px-1 py-0.5 text-sm",
              "cursor-pointer",
              selected ? "bg-base-300" : "hover:bg-base-300"
            )}
            style={{ paddingLeft: depth * 8 + 8 }}
            onClick={() => onSelectFile(node.path)}
          >
            <TbFile className="shrink-0 opacity-60" />
            <span className="truncate">{node.name}</span>
          </div>
        );
      }

      const isCollapsed = collapsed.has(node.path);
      return (
        <div key={node.path || node.name} className="flex flex-col gap-0.5">
          <div
            className={cn(
              "flex w-full min-w-0 items-center gap-1",
              "px-1 py-0.5 text-sm rounded-box",
              "cursor-pointer",
              "hover:bg-base-300"
            )}
            style={{ paddingLeft: depth * 8 + 8 }}
            onClick={() => toggleDir(node.path)}
          >
            {isCollapsed ? (
              <TbChevronRight className="shrink-0 opacity-60" />
            ) : (
              <TbChevronDown className="shrink-0 opacity-60" />
            )}
            <span className="truncate">{node.name}</span>
          </div>
          {!isCollapsed && renderNodes(node.children, depth + 1)}
        </div>
      );
    });
  }

  return <div>{renderNodes(nodes, 0)}</div>;
}

export function EditorView() {
  const { chat } = useChatBoxContext();
  const [activeFile, setActiveFile] = useState<string>(
    Object.keys(chat.editor?.files ?? {})[0] ?? null
  );

  useEffect(() => {
    const keys = Object.keys(chat.editor?.files ?? {});
    if (!keys.length) {
      return;
    }
    if (!activeFile || !chat.editor?.files[activeFile]) {
      setActiveFile(keys[0]);
    }
  }, [chat.editor?.files, activeFile]);

  const highlighted = useMemo(() => {
    if (!chat.editor || !activeFile || !chat.editor.files[activeFile]) {
      return "";
    }

    const code = chat.editor.files[activeFile].content ?? "";
    let language = highlight(activeFile);
    if (!hljs.listLanguages().includes(language)) {
      language = "bash";
    }
    return hljs.highlight(code, { language }).value;
  }, [activeFile, chat.editor]);

  function handleCopy() {
    if (!activeFile || !chat.editor) {
      return;
    }

    navigator.clipboard.writeText(chat.editor.files[activeFile].content);
    toast.success("Copied to clipboard");
  }

  function handleDownload() {
    if (!activeFile || !chat.editor) {
      return;
    }

    const file = chat.editor.files[activeFile];
    const blob = new Blob([file.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  }

  async function handleZip() {
    if (!chat.editor) {
      return;
    }

    const files = Object.keys(chat.editor.files);
    if (!files.length) {
      return;
    }

    const zip = new JSZip();
    for (const filePath of files) {
      zip.file(filePath, chat.editor.files[filePath].content);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "files.zip";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded zip");
  }

  if (!chat.editor) {
    return null;
  }

  return (
    <div className="p-4 flex flex-col">
      <div className="flex min-w-0 flex-col gap-2 md:flex-row">
        <div className="shrink-0 md:w-52">
          <div className="join mb-2 w-full">
            <button
              className="btn join-item btn-xs flex-1"
              onClick={handleCopy}
            >
              <TbCopy />
            </button>
            <button
              className="btn join-item btn-xs flex-1"
              onClick={handleDownload}
            >
              <TbDownload />
            </button>
            <button className="btn join-item btn-xs flex-1" onClick={handleZip}>
              <TbZip />
            </button>
          </div>

          <EditorFileTree
            files={chat.editor.files}
            activeFile={activeFile}
            onSelectFile={setActiveFile}
          />
        </div>

        <pre className="min-w-0 flex-1 overflow-auto">
          <code
            className={cn(
              "hljs block overflow-auto rounded-box",
              "text-sm h-[400px] w-full"
            )}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
}
