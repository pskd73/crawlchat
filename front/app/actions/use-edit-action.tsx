import { getEventTypes, getMe } from "@packages/common/cal";
import type {
  ApiAction,
  ApiActionData,
  ApiActionDataItem,
  ApiActionMethod,
  CalActionConfig,
  LinearConfig,
} from "libs/prisma";
import { createContext, useEffect, useMemo, useState } from "react";

type CalEventType = {
  id: number;
  title: string;
};

type CalProfile = {
  id: number;
  email: string;
  username: string;
};

type LinearTeam = {
  id: string;
  name: string;
  description: string;
};

export function useEditAction(initAction?: ApiAction) {
  const [title, setTitle] = useState<string>(initAction?.title ?? "");
  const [url, setUrl] = useState<string>(initAction?.url ?? "");
  const [method, setMethod] = useState<ApiActionMethod>(
    initAction?.method ?? "get"
  );
  const [description, setDescription] = useState<string>(
    initAction?.description ?? ""
  );
  const [data, setData] = useState<ApiActionData>(
    initAction?.data ?? { items: [] }
  );
  const [headers, setHeaders] = useState<ApiActionData>(
    initAction?.headers ?? { items: [] }
  );
  const [type, setType] = useState<string>(initAction?.type ?? "custom");
  const [calConfig, setCalConfig] = useState<CalActionConfig>(
    initAction?.calConfig ?? { apiKey: null, eventTypeId: null }
  );

  const [calEventTypes, setCalEventTypes] = useState<CalEventType[]>([]);
  const [calProfile, setCalProfile] = useState<CalProfile | null>(null);
  const [requireEmailVerification, setRequireEmailVerification] =
    useState<boolean>(initAction?.requireEmailVerification ?? false);

  const [linearConfig, setLinearConfig] = useState<LinearConfig>(
    initAction?.linearConfig ?? { apiKey: null, teamId: null }
  );
  const [linearTeams, setLinearTeams] = useState<LinearTeam[]>();

  const canSubmit = useMemo(() => {
    if (!title || !description) return false;

    if (type === "custom") {
      if (!url || !method) return false;

      for (const item of data.items) {
        if (!item.key || !item.type || !item.dataType) return false;
        if (item.type === "dynamic" && !item.description) return false;
        if (item.type === "value" && !item.value) return false;
      }

      for (const item of headers.items) {
        if (!item.key || !item.type || !item.dataType) return false;
        if (item.type === "dynamic" && !item.description) return false;
        if (item.type === "value" && !item.value) return false;
      }
    }

    if (type === "cal") {
      if (!calConfig.apiKey) return false;
      if (!calProfile) return false;
      if (!calConfig.eventTypeId) return false;
    }

    if (type === "linear_create_issue") {
      if (!linearConfig.apiKey) return false;
      if (!linearConfig.teamId) return false;
    }

    return true;
  }, [
    title,
    url,
    method,
    data,
    headers,
    description,
    type,
    calConfig,
    calProfile,
    linearConfig,
  ]);

  useEffect(() => {
    if (!calConfig.apiKey) return;

    getMe(calConfig.apiKey).then(async (res) => {
      const json = await res.json();
      setCalProfile(json.data);
    });

    getEventTypes(calConfig.apiKey).then(async (res) => {
      const json = await res.json();
      setCalEventTypes(json.data.eventTypeGroups[0].eventTypes);
    });
  }, [calConfig.apiKey]);

  useEffect(() => {
    if (!linearConfig.apiKey) return;

    fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: linearConfig.apiKey ?? "",
      },
      body: JSON.stringify({
        query: `query ExampleQuery {
  teams {
    nodes {
      id
      name
      description
    }
  }
}`,
      }),
    }).then(async (res) => {
      const json = await res.json();
      setLinearTeams(json.data.teams.nodes);
    });
  }, [linearConfig.apiKey]);

  const addDataItem = (item: ApiActionDataItem) => {
    setData((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }));
  };

  const updateDataItem = (
    index: number,
    key: keyof ApiActionDataItem,
    value: string
  ) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const removeDataItem = (index: number) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const addHeaderItem = (item: ApiActionDataItem) => {
    setHeaders((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }));
  };

  const updateHeaderItem = (
    index: number,
    key: keyof ApiActionDataItem,
    value: string
  ) => {
    setHeaders((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const removeHeaderItem = (index: number) => {
    setHeaders((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  return {
    title,
    setTitle,
    url,
    setUrl,
    method,
    setMethod,
    data,
    addDataItem,
    updateDataItem,
    removeDataItem,
    headers,
    addHeaderItem,
    updateHeaderItem,
    removeHeaderItem,
    canSubmit,
    description,
    setDescription,
    type,
    setType,
    calConfig,
    setCalConfig,
    calEventTypes,
    calProfile,
    requireEmailVerification,
    setRequireEmailVerification,
    linearConfig,
    setLinearConfig,
    linearTeams,
  };
}

export type UseEditAction = ReturnType<typeof useEditAction>;
export const EditActionContext = createContext<UseEditAction>(
  {} as UseEditAction
);

export function EditActionProvider({
  initAction,
  children,
}: {
  initAction?: ApiAction;
  children: React.ReactNode;
}) {
  const value = useEditAction(initAction);
  return (
    <EditActionContext.Provider value={value}>
      {children}
    </EditActionContext.Provider>
  );
}
