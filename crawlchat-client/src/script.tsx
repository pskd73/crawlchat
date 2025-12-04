export function CrawlChatScript({
  id,
  sidePanel,
  src,
  hideAskAI,
  sidePanelOpen,
  hideToc,
  selectionButtons,
  noPrimaryColor,
  secret,
}: {
  id: string;
  sidePanel?: boolean;
  src?: string;
  hideAskAI?: boolean;
  sidePanelOpen?: boolean;
  hideToc?: boolean;
  selectionButtons?: Record<string, { name: string; queryPrefix: string }>;
  noPrimaryColor?: boolean;
  secret?: string;
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
      data-selection-buttons={
        selectionButtons ? JSON.stringify(selectionButtons) : undefined
      }
      data-no-primary-color={noPrimaryColor}
      data-secret={secret}
    />
  );
}
