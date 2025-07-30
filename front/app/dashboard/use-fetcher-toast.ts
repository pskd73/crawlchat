import type { FetcherWithComponents } from "react-router";
import { toaster } from "~/components/ui/toaster";
import { useEffect } from "react";

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
      toaster.success({
        title: options?.title ?? "Success",
        description: options?.description ?? "Operation completed successfully",
      });
    }

    if (fetcher.data.error) {
      toaster.error({
        title: "Error",
        description: fetcher.data.error,
      });
    }
  }, [fetcher.data]);
}
