import type { FetcherWithComponents } from "react-router";
import { useEffect } from "react";
import toast from "react-hot-toast";

export function useFetcherToast(
  fetcher?: FetcherWithComponents<any>,
  options?: {
    title?: string;
    description?: string;
  }
) {
  useEffect(() => {
    if (!fetcher?.data) return;

    if (fetcher?.data.error) {
      toast.error(fetcher?.data.error);
      return;
    }

    if (fetcher?.data) {
      toast.success(options?.title ?? options?.description ?? "Done");
    }
  }, [fetcher?.data]);
}
