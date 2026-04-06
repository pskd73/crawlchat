import type {
  ApiAction,
  ApiActionData,
  ApiActionDataItem,
  ApiActionMethod,
} from "@packages/common/prisma";
import { createContext, useMemo, useState } from "react";

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

  const [requireEmailVerification, setRequireEmailVerification] =
    useState<boolean>(initAction?.requireEmailVerification ?? false);

  const canSubmit = useMemo(() => {
    if (!title || !description) return false;

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

    return true;
  }, [title, url, method, data, headers, description]);

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
    requireEmailVerification,
    setRequireEmailVerification,
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
