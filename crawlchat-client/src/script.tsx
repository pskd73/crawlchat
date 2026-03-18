export function CrawlChatScript({
  id,
  sidePanel,
  src,
  hideAskAI,
  sidePanelOpen,
  hideToc,
  noPrimaryColor,
  secret,
  theme,
}: {
  id: string;
  sidePanel?: boolean;
  src?: string;
  hideAskAI?: boolean;
  sidePanelOpen?: boolean;
  hideToc?: boolean;
  noPrimaryColor?: boolean;
  secret?: string;
  theme?: "light" | "dark" | "system";
}) {
  return (
    <script
      src={src ?? "https://crawlchat.app/embed.js"}
      async
      id="crawlchat-script"
      data-id={id}
      data-sidepanel={sidePanel}
      data-hide-ask-ai={hideAskAI}
      data-sidepanel-open={sidePanelOpen}
      data-hide-toc={hideToc}
      data-no-primary-color={noPrimaryColor}
      data-secret={secret}
      data-theme={theme}
    />
  );
}
