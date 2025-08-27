import type { User } from "libs/prisma";
import { createContext, useState } from "react";
import type { SetupProgressAction } from "./setup-progress";

export const useApp = ({
  user,
  scrapeId,
}: {
  user: User;
  scrapeId?: string;
}) => {
  const [containerWidth, setContainerWidth] = useState<number>();
  const [progressActions, setProgressActions] = useState<SetupProgressAction[]>(
    []
  );

  return {
    user,
    containerWidth,
    setContainerWidth,
    scrapeId,
    progressActions,
    setProgressActions,
  };
};

export const AppContext = createContext({} as ReturnType<typeof useApp>);
