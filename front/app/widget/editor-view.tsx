import hljs from "highlight.js";
import JSZip from "jszip";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { TbCopy, TbDownload, TbZip } from "react-icons/tb";
import { extensionLanguageMap } from "./highlight-language";
import { useChatBoxContext } from "./use-chat-box";

function highlight(filePath: string): string {
  const base = filePath.split("/").pop() ?? filePath;
  const dot = base.lastIndexOf(".");
  const ext = dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
  return extensionLanguageMap[ext] ?? ext;
}

export function EditorView() {
  const { chat } = useChatBoxContext();
  const [activeFile, setActiveFile] = useState<string>(
    Object.keys(chat.editor.files)[0]
  );
  const highlighted = useMemo(() => {
    const code = chat.editor.files[activeFile].content ?? "";
    let language = highlight(activeFile);
    if (!hljs.listLanguages().includes(language)) {
      language = "bash";
    }
    return hljs.highlight(code, { language }).value;
  }, [activeFile]);

  function handleCopy() {
    if (!activeFile) {
      return;
    }

    navigator.clipboard.writeText(chat.editor.files[activeFile].content);
    toast.success("Copied to clipboard");
  }

  function handleDownload() {
    if (!activeFile) {
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
    <div className="p-4 flex flex-col gap-4">
      <div className="flex gap-2">
        <select
          className="select select-sm"
          value={activeFile}
          onChange={(e) => setActiveFile(e.target.value)}
        >
          {Object.keys(chat.editor.files).map((file) => (
            <option key={file} value={file}>
              {file}
            </option>
          ))}
        </select>
        <div className="join">
          <button className="btn join-item btn-sm" onClick={handleCopy}>
            <TbCopy />
          </button>
          <button className="btn join-item btn-sm" onClick={handleDownload}>
            <TbDownload />
          </button>
          <button className="btn join-item btn-sm" onClick={handleZip}>
            <TbZip />
          </button>
        </div>
      </div>

      <pre className="no-scrollbar text-sm overflow-auto max-h-[400px] rounded-box">
        <code
          className="hljs"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
}
