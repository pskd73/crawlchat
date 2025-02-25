import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { useScrape } from "~/dashboard/use-scrape";

export function useOpenScrape() {
  const { connect, scraping, stage } = useScrape();
  const scrapeFetcher = useFetcher();
  const llmTxtFetcher = useFetcher();
  const [roomId, setRoomId] = useState<string>("");
  const [mpcCmd, setMpcCmd] = useState<string>("");

  useEffect(() => {
    const getRandomRoomId = () => {
      return Math.random().toString(36).substring(2, 15);
    };
    if (!localStorage.getItem("roomId")) {
      localStorage.setItem("roomId", getRandomRoomId());
    }
    setRoomId(localStorage.getItem("roomId")!);
  }, []);

  useEffect(() => {
    if (scrapeFetcher.data?.token) {
      connect(scrapeFetcher.data.token);
    }
  }, [scrapeFetcher.data?.token]);

  useEffect(() => {
    if (llmTxtFetcher.data?.llmTxt) {
      downloadTxt(llmTxtFetcher.data.llmTxt, "llm.txt");
    }
  }, [llmTxtFetcher.data?.llmTxt]);

  useEffect(() => {
    if (scrapeFetcher.data?.llmTxt) {
      downloadTxt(scrapeFetcher.data.llmTxt, "llm.txt");
    }
  }, [scrapeFetcher.data?.llmTxt]);

  function downloadTxt(text: string, filename: string) {
    const blob = new Blob([text], {
      type: "text/markdown",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  function openChat() {
    window.open(`/w/${scrapeFetcher.data?.scrapeId}`, "_blank");
  }

  function downloadLlmTxt() {
    if (scraping?.markdown) {
      llmTxtFetcher.submit(
        { intent: "llm.txt", scrapeId: scrapeFetcher.data?.scrapeId },
        { method: "post" }
      );
    }
  }

  function copyMcpCmd() {
    if (scraping?.url) {
      const scrapedUrl = new URL(scraping.url);

      const cmd = `npx crawl-chat-mcp --id=${
        scrapeFetcher.data?.scrapeId
      } --name=search_${scrapedUrl.hostname.replaceAll(/[\/\.]/g, "_")}`;
      setMpcCmd(cmd);
      navigator.clipboard.writeText(cmd);
    }
  }

  const disable =
    scrapeFetcher.state !== "idle" ||
    (scrapeFetcher.data && !scrapeFetcher.data.error);

  return {
    scrapeFetcher,
    llmTxtFetcher,
    roomId,
    mpcCmd,
    disable,
    openChat,
    downloadLlmTxt,
    copyMcpCmd,
    stage,
    scraping,
  };
}
