import React from "react";
import Layout from "@theme-original/Layout";
import type LayoutType from "@theme/Layout";
import type { ReactNode } from "react";
import type { WrapperProps } from "@docusaurus/types";
import { useHistory } from "@docusaurus/router";
import { useCrawlChatSidePanel, CrawlChatScript } from "crawlchat-client";

type Props = WrapperProps<typeof LayoutType>;

export default function LayoutWrapper(props: Props): ReactNode {
  useCrawlChatSidePanel({ history: useHistory() });

  return (
    <>
      <Layout {...props} />
      <CrawlChatScript
        id="67dbfc7258ed87c571a04b83"
        selectionButtons={{
          explore: {
            name: "Explore",
            queryPrefix: "Explain what is:"
          },
          ticket: {
            name: "Ask human",
            queryPrefix: "Create a support ticket for:"
          },
        }}
        sidePanel
        sidePanelOpen
        hideToc
        noPrimaryColor
      />
    </>
  );
}
