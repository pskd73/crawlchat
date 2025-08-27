import type { FetcherWithComponents } from "react-router";
import { useEffect } from "react";
import toast from "react-hot-toast";

export function useFetcherToast(
  fetcher: FetcherWithComponents<any>,
  options?: {
    title?: string;
    description?: string;
  }
) {
  useEffect(() => {
    if (!fetcher.data) return;

    if (fetcher.data) {
      toast.success(options?.description ?? "Operation completed successfully");
    }

    if (fetcher.data.error) {
      toast.error(fetcher.data.error);
    }
  }, [fetcher.data]);
}
