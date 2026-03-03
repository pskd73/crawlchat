import type { HelpdeskConfig, Scrape } from "@packages/common/prisma";
import { createContext, useEffect, useState } from "react";

export function useHelpdesk({
  config,
  scrape,
}: {
  config: HelpdeskConfig;
  scrape: Scrape;
}) {
  const [chatActive, setChatActive] = useState(false);

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.data === "close") {
        setChatActive(false);
      }
    });
  }, []);

  return {
    chatActive,
    setChatActive,
    config,
    scrape,
  };
}

export const HelpdeskContext = createContext<ReturnType<typeof useHelpdesk>>(
  null!
);

export function HelpdeskProvider({
  children,
  config,
  scrape,
}: {
  children: React.ReactNode;
  config: HelpdeskConfig;
  scrape: Scrape;
}) {
  const helpdesk = useHelpdesk({ config, scrape });

  return (
    <HelpdeskContext.Provider value={helpdesk}>
      {children}
    </HelpdeskContext.Provider>
  );
}
