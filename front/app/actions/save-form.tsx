import { useContext } from "react";
import { EditActionContext } from "./use-edit-action";
import { type FetcherWithComponents } from "react-router";
import { TbCheck, TbTrash } from "react-icons/tb";

export function SaveForm({
  fetcher,
  deleteFetcher,
}: {
  fetcher: FetcherWithComponents<any>;
  deleteFetcher?: FetcherWithComponents<any>;
}) {
  const {
    title,
    url,
    method,
    data,
    headers,
    canSubmit,
    description,
    type,
    calConfig,
    requireEmailVerification,
  } = useContext(EditActionContext);

  return (
    <>
      {deleteFetcher && (
        <deleteFetcher.Form method="post">
          <input type="hidden" name="intent" value="delete" />
          <button
            className="btn btn-soft btn-square btn-error"
            type="submit"
            disabled={deleteFetcher.state !== "idle"}
          >
            <TbTrash />
          </button>
        </deleteFetcher.Form>
      )}
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="update" />
        <input
          type="hidden"
          name="data"
          value={JSON.stringify({
            title,
            url,
            method,
            data,
            headers,
            description,
            type,
            calConfig,
            requireEmailVerification,
          })}
        />
        <button
          className="btn btn-primary"
          disabled={fetcher.state !== "idle" || !canSubmit}
          type="submit"
        >
          {fetcher.state !== "idle" && (
            <span className="loading loading-spinner loading-xs"></span>
          )}
          Save
          <TbCheck />
        </button>
      </fetcher.Form>
    </>
  );
}
