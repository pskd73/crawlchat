import { useHistory } from "@docusaurus/router";
import type { WrapperProps } from "@docusaurus/types";
import Layout from "@theme-original/Layout";
import type LayoutType from "@theme/Layout";
import { CrawlChatScript, useCrawlChatSidePanel } from "crawlchat-client";
import type { ReactNode } from "react";

type Props = WrapperProps<typeof LayoutType>;

export default function LayoutWrapper(props: Props): ReactNode {
  useCrawlChatSidePanel({ history: useHistory() });

  return (
    <>
      <Layout {...props} />
      <CrawlChatScript id="crawlchat" sidePanel hideToc noPrimaryColor />
    </>
  );
}
